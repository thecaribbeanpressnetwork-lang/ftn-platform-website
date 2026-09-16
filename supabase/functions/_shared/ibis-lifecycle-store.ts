// FTN Platform — the execution PLAN/RECEIPT lifecycle store, abstracted behind one interface.
//
// A prior version of this lifecycle used a module-level in-memory Map. That is correct only as a
// test implementation: Supabase Edge Functions may cold-start, run multiple isolates, and route a
// PLAN request and its later RECEIPT request to different instances that share no memory. In-memory
// state is NOT production-safe here. This module provides:
//   - LifecycleStore: the interface everything else in the canonical brain depends on.
//   - createInMemoryLifecycleStore(): the Map-based implementation -- ONLY for local/test use.
//   - createSupabaseLifecycleStore(): a real Postgres-backed implementation using PostgREST's
//     conditional UPDATE (.eq('state','PENDING')) as the atomic PENDING -> terminal transition --
//     a single UPDATE statement with a WHERE clause is atomic at the database row level; if the
//     response contains zero updated rows, some other concurrent request already won the
//     transition, and this caller must treat that as rejected, not retry-and-overwrite.
//   - resolveLifecycleStore(): the ONLY function real request-handling code should call. It picks
//     the Postgres-backed store when SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are configured;
//     otherwise it returns the in-memory store ONLY when IBIS_ALLOW_INMEMORY_LIFECYCLE==='true'
//     (an explicit local/test opt-in); otherwise it returns null, meaning "no durable lifecycle
//     store is available" -- callers MUST fail closed on that (never authorize browser-local
//     execution without durable backing; see ibis-canonical-brain.ts), never silently fall back
//     to in-memory state in what could be a real production environment.

export type PlanState = "PENDING" | "SUCCEEDED" | "FALLBACK_REQUESTED" | "EXPIRED" | "REJECTED";

export type PlanRecord = {
  planId: string;
  authorizedTarget: "browser_local" | "server_provider";
  intent: string;
  freshnessRequired: boolean;
  textSha256: string;
  state: PlanState;
  createdAt: string;
  expiresAt: string;
  // Last time this row's state actually changed. This is the crash-recovery LEASE clock: a plan
  // stuck in FALLBACK_REQUESTED is only safe to resume once updatedAt is old enough that a still
  // in-flight (non-crashed) call could not plausibly still be running -- see
  // ibis-canonical-brain.ts's RESUMPTION_STALE_MS for why this matters (without it, two truly
  // concurrent failure receipts for the same plan could each treat the other's fresh, in-progress
  // claim as "crashed" and both call the provider).
  updatedAt: string;
};

export type TransitionResult =
  | { ok: true; plan: PlanRecord }
  | { ok: false; reason: "UNKNOWN_PLAN" | "EXPIRED_PLAN" | "NOT_PENDING" | "STORE_ERROR" };

export type LifecycleStore = {
  readonly kind: "DATABASE" | "IN_MEMORY_TEST_MODE";
  createPlan(input: { planId: string; authorizedTarget: PlanRecord["authorizedTarget"]; intent: string; freshnessRequired: boolean; textSha256: string; ttlMs: number }): Promise<void>;
  getPlan(planId: string): Promise<PlanRecord | null>;
  // Atomic `fromState` -> `toState` transition (fromState defaults to "PENDING", the normal
  // claim). Returns ok:false with NOT_PENDING if the plan was not in `fromState` when this call
  // ran -- either someone else already won this exact transition (a real duplicate/concurrent
  // receipt) or the plan is in some other state entirely. Callers must not distinguish those two
  // cases any further than the store already does.
  //
  // Crash-recovery note: passing fromState:"FALLBACK_REQUESTED" with toState:"SUCCEEDED" is the
  // RESUMPTION transition -- used when a plan is found already claimed (FALLBACK_REQUESTED) but
  // never reached a terminal state, meaning a prior process crashed after claiming the fallback
  // but before completing it. This store's guarantee for that path is honestly AT-LEAST-ONCE, not
  // exactly-once: two callers racing to resume the exact same stuck plan at the exact same instant
  // could both pass this same atomic check in the in-memory implementation only if they are not
  // serialized by JS's single-threaded execution (they are, so it cannot happen there) -- but the
  // DATABASE implementation's resumption path relies on the SAME conditional-UPDATE mechanism as
  // the initial claim, so it inherits the identical real atomicity guarantee, not a weaker one.
  transitionPlan(planId: string, toState: Exclude<PlanState, "PENDING">, fromState?: PlanState): Promise<TransitionResult>;
};

async function sha256Hex(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
export { sha256Hex };

// ---------------------------------------------------------------------------------------------
// IN-MEMORY (test/local only). Module-level Map -- process-local, not durable. The CAS below is
// real and race-safe WITHIN one running process (JS's single-threaded execution means the
// read-check-write inside transitionPlan below never interleaves with another call to it), which
// is enough to test the atomic-transition CONTRACT, but it proves nothing about cross-instance
// safety -- that is what createSupabaseLifecycleStore exists to provide in production.
// ---------------------------------------------------------------------------------------------
export function createInMemoryLifecycleStore(): LifecycleStore {
  const plans = new Map<string, PlanRecord>();
  return {
    kind: "IN_MEMORY_TEST_MODE",
    async createPlan(input) {
      const now = Date.now();
      plans.set(input.planId, {
        planId: input.planId, authorizedTarget: input.authorizedTarget, intent: input.intent,
        freshnessRequired: input.freshnessRequired, textSha256: input.textSha256, state: "PENDING",
        createdAt: new Date(now).toISOString(), expiresAt: new Date(now + input.ttlMs).toISOString(),
        updatedAt: new Date(now).toISOString(),
      });
    },
    async getPlan(planId) {
      const plan = plans.get(planId);
      if (!plan) return null;
      if (plan.state === "PENDING" && Date.now() > new Date(plan.expiresAt).getTime()) {
        plan.state = "EXPIRED";
      }
      return plan;
    },
    async transitionPlan(planId, toState, fromState = "PENDING") {
      const plan = plans.get(planId);
      if (!plan) return { ok: false, reason: "UNKNOWN_PLAN" };
      if (Date.now() > new Date(plan.expiresAt).getTime() && plan.state === "PENDING") plan.state = "EXPIRED";
      if (plan.state === "EXPIRED") return { ok: false, reason: "EXPIRED_PLAN" };
      if (plan.state !== fromState) return { ok: false, reason: "NOT_PENDING" };
      // Everything above this line is synchronous (no `await`), so no concurrent call to this
      // same function can interleave between the state check and this write -- the actual CAS.
      plan.state = toState;
      plan.updatedAt = new Date().toISOString();
      return { ok: true, plan };
    },
  };
}

// ---------------------------------------------------------------------------------------------
// DATABASE (production). PostgREST-backed. Never executed against a live project in this pass --
// no Supabase credentials/connection were available in the environment this was written in. Its
// request construction and response handling are proven against PostgREST's documented contract
// via a fake HTTP server in tests, not against a real database round-trip; that gap is real and
// is reported, not hidden. See supabase/migrations/20260916120000_ibis_execution_receipts.sql for
// the schema this targets (NOT YET APPLIED).
// ---------------------------------------------------------------------------------------------
export function createSupabaseLifecycleStore(options: { baseUrl: string; serviceRoleKey: string; fetchImpl?: typeof fetch }): LifecycleStore {
  const baseUrl = options.baseUrl.replace(/\/$/, "");
  const doFetch = options.fetchImpl ?? fetch;
  const headers = {
    "content-type": "application/json",
    apikey: options.serviceRoleKey,
    authorization: `Bearer ${options.serviceRoleKey}`,
  };

  function rowToPlan(row: any): PlanRecord {
    return {
      planId: row.plan_id, authorizedTarget: row.authorized_target, intent: row.intent,
      freshnessRequired: row.freshness_required, textSha256: row.text_sha256, state: row.state,
      createdAt: row.created_at, expiresAt: row.expires_at, updatedAt: row.updated_at || row.created_at,
    };
  }

  return {
    kind: "DATABASE",
    async createPlan(input) {
      const expiresAt = new Date(Date.now() + input.ttlMs).toISOString();
      const response = await doFetch(`${baseUrl}/rest/v1/ibis_execution_plans`, {
        method: "POST",
        headers: { ...headers, Prefer: "return=minimal" },
        body: JSON.stringify({
          plan_id: input.planId, authorized_target: input.authorizedTarget, intent: input.intent,
          freshness_required: input.freshnessRequired, text_sha256: input.textSha256,
          state: "PENDING", expires_at: expiresAt,
        }),
      });
      if (!response.ok) throw new Error(`Lifecycle store createPlan failed: HTTP ${response.status}`);
    },
    async getPlan(planId) {
      const response = await doFetch(`${baseUrl}/rest/v1/ibis_execution_plans?plan_id=eq.${encodeURIComponent(planId)}&select=*`, { headers });
      if (!response.ok) return null;
      const rows = await response.json().catch(() => []);
      if (!Array.isArray(rows) || !rows.length) return null;
      const plan = rowToPlan(rows[0]);
      if (plan.state === "PENDING" && Date.now() > new Date(plan.expiresAt).getTime()) plan.state = "EXPIRED";
      return plan;
    },
    async transitionPlan(planId, toState, fromState = "PENDING") {
      // The atomic step: PostgREST translates this into ONE SQL statement --
      //   UPDATE ibis_execution_plans SET state = $1, updated_at = now()
      //   WHERE plan_id = $2 AND state = $3 AND expires_at > now()
      //   RETURNING *;
      // Postgres's own row-level locking makes this atomic across any number of concurrent
      // callers/instances -- at most one request can ever see itself as the row that got updated.
      // fromState defaults to "PENDING" (the normal claim); passing "FALLBACK_REQUESTED" is the
      // crash-recovery resumption transition (see the LifecycleStore interface doc above) -- the
      // exact same atomic mechanism, not a weaker one.
      const response = await doFetch(
        `${baseUrl}/rest/v1/ibis_execution_plans?plan_id=eq.${encodeURIComponent(planId)}&state=eq.${encodeURIComponent(fromState)}&expires_at=gt.${encodeURIComponent(new Date().toISOString())}`,
        { method: "PATCH", headers: { ...headers, Prefer: "return=representation" }, body: JSON.stringify({ state: toState, updated_at: new Date().toISOString() }) }
      );
      if (!response.ok) return { ok: false, reason: "STORE_ERROR" };
      const rows = await response.json().catch(() => []);
      if (Array.isArray(rows) && rows.length === 1) return { ok: true, plan: rowToPlan(rows[0]) };
      // Zero rows updated: either the plan never existed, is already terminal (a duplicate
      // receipt), or expired -- one more read distinguishes which, for an honest rejection reason.
      const existing = await this.getPlan(planId);
      if (!existing) return { ok: false, reason: "UNKNOWN_PLAN" };
      if (existing.state === "EXPIRED") return { ok: false, reason: "EXPIRED_PLAN" };
      return { ok: false, reason: "NOT_PENDING" };
    },
  };
}

export function resolveLifecycleStore(env: { get(key: string): string | undefined } = Deno.env): LifecycleStore | null {
  const supabaseUrl = env.get("SUPABASE_URL");
  const serviceRoleKey = env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (supabaseUrl && serviceRoleKey) return createSupabaseLifecycleStore({ baseUrl: supabaseUrl, serviceRoleKey });
  if (env.get("IBIS_ALLOW_INMEMORY_LIFECYCLE") === "true") return createInMemoryLifecycleStore();
  return null;
}
