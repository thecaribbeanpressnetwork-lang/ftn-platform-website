// FTN Platform — the execution PLAN/RECEIPT lifecycle store, abstracted behind one interface.
//
// A prior version of this lifecycle used a module-level in-memory Map, then a simple
// staleness-only resumption rule. Neither is production-safe: Supabase Edge Functions may
// cold-start, run multiple isolates, and a legitimate provider call can legitimately run longer
// than any fixed staleness window, so "stale enough to resume" alone cannot prevent two workers
// from both believing they own the same fallback attempt. This module now implements a real
// LEASED CLAIM WITH FENCING:
//   - claimFallback() atomically claims a plan for fallback work and returns a unique
//     (leaseOwner, leaseVersion) pair -- the fencing token.
//   - finalizeFallback() can only succeed if the caller presents the CURRENT leaseOwner AND
//     leaseVersion -- a worker whose lease was superseded by a later reclaim can never finalize,
//     even if it finishes its (now-abandoned) work after the reclaim happened.
//   - reclaimExpiredLease() atomically reclaims a lease only once leaseExpiresAt has passed, and
//     increments leaseVersion -- this is what makes the fencing token a fencing token: any write
//     from the old (pre-reclaim) owner is rejected by finalizeFallback because leaseVersion no
//     longer matches.
// Delivery guarantee, stated precisely: the DATABASE row's terminal STATE transition is
// exactly-once (Postgres's row-level locking on a single conditional UPDATE guarantees this,
// deterministically, not probabilistically). The EXTERNAL PROVIDER CALL is only AT-LEAST-ONCE --
// if a worker crashes after calling the provider but before its finalize is received, a later
// reclaim will call the provider again once its lease has genuinely expired. This is a real,
// disclosed limitation, not a claimed exactly-once guarantee for the provider call itself.
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
  updatedAt: string;
  // The fencing mechanism. leaseOwner is a random per-claim token; leaseVersion increments on
  // every claim/reclaim of this plan's fallback work. A caller may only finalize using the exact
  // (leaseOwner, leaseVersion) pair it received from its own claim/reclaim call -- never a stale one.
  leaseOwner: string | null;
  leaseVersion: number;
  leaseExpiresAt: string | null;
  attemptCount: number;
};

export type ClaimResult =
  | { ok: true; plan: PlanRecord; leaseOwner: string; leaseVersion: number }
  | { ok: false; reason: "UNKNOWN_PLAN" | "EXPIRED_PLAN" | "NOT_CLAIMABLE" | "STORE_ERROR" };

export type FinalizeResult =
  | { ok: true; plan: PlanRecord }
  | { ok: false; reason: "UNKNOWN_PLAN" | "LEASE_SUPERSEDED" | "NOT_FALLBACK_REQUESTED" | "STORE_ERROR" };

export type TransitionResult =
  | { ok: true; plan: PlanRecord }
  | { ok: false; reason: "UNKNOWN_PLAN" | "EXPIRED_PLAN" | "NOT_PENDING" | "STORE_ERROR" };

export type LifecycleStore = {
  readonly kind: "DATABASE" | "IN_MEMORY_TEST_MODE";
  createPlan(input: { planId: string; authorizedTarget: PlanRecord["authorizedTarget"]; intent: string; freshnessRequired: boolean; textSha256: string; ttlMs: number }): Promise<void>;
  getPlan(planId: string): Promise<PlanRecord | null>;
  // Atomic PENDING -> SUCCEEDED (the plain "browser succeeded, just acknowledge" path -- no lease
  // needed, since no provider call happens on this path).
  transitionPlan(planId: string, toState: Extract<PlanState, "SUCCEEDED">, fromState?: "PENDING"): Promise<TransitionResult>;
  // Claims fallback work. First attempts the normal PENDING -> FALLBACK_REQUESTED claim (a fresh
  // plan). If the plan is already FALLBACK_REQUESTED, attempts an atomic RECLAIM: only succeeds if
  // the existing lease has expired (leaseExpiresAt < now), and if it succeeds, increments
  // leaseVersion and issues a brand new leaseOwner -- fencing off whatever worker held the old lease.
  claimFallback(planId: string, leaseDurationMs: number): Promise<ClaimResult>;
  // Finalizes a fallback attempt. Requires the exact (leaseOwner, leaseVersion) this caller
  // received from its own claimFallback() call -- a superseded lease can never finalize.
  finalizeFallback(planId: string, leaseOwner: string, leaseVersion: number, toState: Extract<PlanState, "SUCCEEDED">): Promise<FinalizeResult>;
};

async function sha256Hex(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
export { sha256Hex };

function newLeaseOwner(): string {
  return crypto.randomUUID();
}

// ---------------------------------------------------------------------------------------------
// IN-MEMORY (test/local only). Module-level Map -- process-local, not durable. The CAS below is
// real and race-safe WITHIN one running process (JS's single-threaded execution means the
// read-check-write inside each method never interleaves with another call to it), which is
// enough to test the atomic-transition CONTRACT, but it proves nothing about cross-instance
// safety -- that is what createSupabaseLifecycleStore exists to provide in production.
// ---------------------------------------------------------------------------------------------
export function createInMemoryLifecycleStore(): LifecycleStore {
  const plans = new Map<string, PlanRecord>();

  function expireIfNeeded(plan: PlanRecord) {
    if (plan.state === "PENDING" && Date.now() > new Date(plan.expiresAt).getTime()) plan.state = "EXPIRED";
  }

  return {
    kind: "IN_MEMORY_TEST_MODE",
    async createPlan(input) {
      const now = Date.now();
      plans.set(input.planId, {
        planId: input.planId, authorizedTarget: input.authorizedTarget, intent: input.intent,
        freshnessRequired: input.freshnessRequired, textSha256: input.textSha256, state: "PENDING",
        createdAt: new Date(now).toISOString(), expiresAt: new Date(now + input.ttlMs).toISOString(),
        updatedAt: new Date(now).toISOString(),
        leaseOwner: null, leaseVersion: 0, leaseExpiresAt: null, attemptCount: 0,
      });
    },
    async getPlan(planId) {
      const plan = plans.get(planId);
      if (!plan) return null;
      expireIfNeeded(plan);
      return plan;
    },
    async transitionPlan(planId, toState, fromState = "PENDING") {
      const plan = plans.get(planId);
      if (!plan) return { ok: false, reason: "UNKNOWN_PLAN" };
      expireIfNeeded(plan);
      if (plan.state === "EXPIRED") return { ok: false, reason: "EXPIRED_PLAN" };
      if (plan.state !== fromState) return { ok: false, reason: "NOT_PENDING" };
      plan.state = toState;
      plan.updatedAt = new Date().toISOString();
      return { ok: true, plan };
    },
    async claimFallback(planId, leaseDurationMs) {
      const plan = plans.get(planId);
      if (!plan) return { ok: false, reason: "UNKNOWN_PLAN" };
      expireIfNeeded(plan);
      if (plan.state === "EXPIRED") return { ok: false, reason: "EXPIRED_PLAN" };
      const now = Date.now();
      const owner = newLeaseOwner();
      if (plan.state === "PENDING") {
        // Fresh claim.
        plan.state = "FALLBACK_REQUESTED";
        plan.leaseOwner = owner;
        plan.leaseVersion = 1;
        plan.leaseExpiresAt = new Date(now + leaseDurationMs).toISOString();
        plan.attemptCount += 1;
        plan.updatedAt = new Date(now).toISOString();
        return { ok: true, plan, leaseOwner: owner, leaseVersion: plan.leaseVersion };
      }
      if (plan.state === "FALLBACK_REQUESTED") {
        const leaseExpired = !plan.leaseExpiresAt || now > new Date(plan.leaseExpiresAt).getTime();
        if (!leaseExpired) return { ok: false, reason: "NOT_CLAIMABLE" }; // active lease -- genuinely in progress, do not race it
        // Reclaim: fence off the old owner by incrementing leaseVersion.
        plan.leaseOwner = owner;
        plan.leaseVersion += 1;
        plan.leaseExpiresAt = new Date(now + leaseDurationMs).toISOString();
        plan.attemptCount += 1;
        plan.updatedAt = new Date(now).toISOString();
        return { ok: true, plan, leaseOwner: owner, leaseVersion: plan.leaseVersion };
      }
      return { ok: false, reason: "NOT_CLAIMABLE" };
    },
    async finalizeFallback(planId, leaseOwner, leaseVersion, toState) {
      const plan = plans.get(planId);
      if (!plan) return { ok: false, reason: "UNKNOWN_PLAN" };
      if (plan.state !== "FALLBACK_REQUESTED") return { ok: false, reason: "NOT_FALLBACK_REQUESTED" };
      if (plan.leaseOwner !== leaseOwner || plan.leaseVersion !== leaseVersion) return { ok: false, reason: "LEASE_SUPERSEDED" };
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
// the schema this targets (NOT YET APPLIED) -- which must carry lease_owner/lease_version/
// lease_expires_at/attempt_count columns for this store to function; see that file's own header.
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
      leaseOwner: row.lease_owner ?? null, leaseVersion: row.lease_version ?? 0,
      leaseExpiresAt: row.lease_expires_at ?? null, attemptCount: row.attempt_count ?? 0,
    };
  }

  async function getPlanInternal(planId: string): Promise<PlanRecord | null> {
    const response = await doFetch(`${baseUrl}/rest/v1/ibis_execution_plans?plan_id=eq.${encodeURIComponent(planId)}&select=*`, { headers });
    if (!response.ok) return null;
    const rows = await response.json().catch(() => []);
    if (!Array.isArray(rows) || !rows.length) return null;
    const plan = rowToPlan(rows[0]);
    if (plan.state === "PENDING" && Date.now() > new Date(plan.expiresAt).getTime()) plan.state = "EXPIRED";
    return plan;
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
          state: "PENDING", expires_at: expiresAt, lease_version: 0, attempt_count: 0,
        }),
      });
      if (!response.ok) throw new Error(`Lifecycle store createPlan failed: HTTP ${response.status}`);
    },
    async getPlan(planId) {
      return getPlanInternal(planId);
    },
    async transitionPlan(planId, toState, fromState = "PENDING") {
      // Single atomic conditional UPDATE -- Postgres's row-level locking is the real guarantee.
      const response = await doFetch(
        `${baseUrl}/rest/v1/ibis_execution_plans?plan_id=eq.${encodeURIComponent(planId)}&state=eq.${encodeURIComponent(fromState)}&expires_at=gt.${encodeURIComponent(new Date().toISOString())}`,
        { method: "PATCH", headers: { ...headers, Prefer: "return=representation" }, body: JSON.stringify({ state: toState, updated_at: new Date().toISOString() }) }
      );
      if (!response.ok) return { ok: false, reason: "STORE_ERROR" };
      const rows = await response.json().catch(() => []);
      if (Array.isArray(rows) && rows.length === 1) return { ok: true, plan: rowToPlan(rows[0]) };
      const existing = await getPlanInternal(planId);
      if (!existing) return { ok: false, reason: "UNKNOWN_PLAN" };
      if (existing.state === "EXPIRED") return { ok: false, reason: "EXPIRED_PLAN" };
      return { ok: false, reason: "NOT_PENDING" };
    },
    async claimFallback(planId, leaseDurationMs) {
      const now = new Date();
      const owner = newLeaseOwner();
      const leaseExpiresAt = new Date(now.getTime() + leaseDurationMs).toISOString();

      // Attempt 1: fresh claim (PENDING -> FALLBACK_REQUESTED), lease_version 0 -> 1.
      const freshClaim = await doFetch(
        `${baseUrl}/rest/v1/ibis_execution_plans?plan_id=eq.${encodeURIComponent(planId)}&state=eq.PENDING&expires_at=gt.${encodeURIComponent(now.toISOString())}`,
        { method: "PATCH", headers: { ...headers, Prefer: "return=representation" }, body: JSON.stringify({ state: "FALLBACK_REQUESTED", lease_owner: owner, lease_version: 1, lease_expires_at: leaseExpiresAt, attempt_count: 1, updated_at: now.toISOString() }) }
      );
      if (!freshClaim.ok) return { ok: false, reason: "STORE_ERROR" };
      const freshRows = await freshClaim.json().catch(() => []);
      if (Array.isArray(freshRows) && freshRows.length === 1) {
        const plan = rowToPlan(freshRows[0]);
        return { ok: true, plan, leaseOwner: owner, leaseVersion: plan.leaseVersion };
      }

      // Attempt 2: reclaim an EXPIRED lease on an existing FALLBACK_REQUESTED row. The WHERE
      // clause (state=FALLBACK_REQUESTED AND lease_expires_at < now) IS the atomic fencing step --
      // only one concurrent reclaimer can ever match a given expired lease_version, since the
      // first one to succeed changes lease_version, invalidating the WHERE clause for anyone else
      // still matching the OLD lease_expires_at/version. To express "increment the existing
      // version" atomically in one PostgREST call, this reads the current version first, then
      // conditions the UPDATE on that exact version -- a second read-then-write TOCTOU window
      // exists here in theory; closing it fully requires a Postgres function (RPC) rather than a
      // raw PostgREST PATCH, which is documented as a follow-up, not implemented in this pass.
      const existing = await getPlanInternal(planId);
      if (!existing) return { ok: false, reason: "UNKNOWN_PLAN" };
      if (existing.state === "EXPIRED") return { ok: false, reason: "EXPIRED_PLAN" };
      if (existing.state !== "FALLBACK_REQUESTED") return { ok: false, reason: "NOT_CLAIMABLE" };
      const leaseExpired = !existing.leaseExpiresAt || Date.now() > new Date(existing.leaseExpiresAt).getTime();
      if (!leaseExpired) return { ok: false, reason: "NOT_CLAIMABLE" };

      const reclaim = await doFetch(
        `${baseUrl}/rest/v1/ibis_execution_plans?plan_id=eq.${encodeURIComponent(planId)}&state=eq.FALLBACK_REQUESTED&lease_version=eq.${existing.leaseVersion}&lease_expires_at=lt.${encodeURIComponent(now.toISOString())}`,
        { method: "PATCH", headers: { ...headers, Prefer: "return=representation" }, body: JSON.stringify({ lease_owner: owner, lease_version: existing.leaseVersion + 1, lease_expires_at: leaseExpiresAt, attempt_count: existing.attemptCount + 1, updated_at: now.toISOString() }) }
      );
      if (!reclaim.ok) return { ok: false, reason: "STORE_ERROR" };
      const reclaimRows = await reclaim.json().catch(() => []);
      if (Array.isArray(reclaimRows) && reclaimRows.length === 1) {
        const plan = rowToPlan(reclaimRows[0]);
        return { ok: true, plan, leaseOwner: owner, leaseVersion: plan.leaseVersion };
      }
      // Lost the reclaim race (someone else reclaimed first, or it's no longer reclaimable).
      return { ok: false, reason: "NOT_CLAIMABLE" };
    },
    async finalizeFallback(planId, leaseOwner, leaseVersion, toState) {
      // The fencing check: only succeeds if lease_owner AND lease_version still match exactly
      // what this caller was issued -- a superseded lease's finalize matches zero rows.
      const response = await doFetch(
        `${baseUrl}/rest/v1/ibis_execution_plans?plan_id=eq.${encodeURIComponent(planId)}&state=eq.FALLBACK_REQUESTED&lease_owner=eq.${encodeURIComponent(leaseOwner)}&lease_version=eq.${leaseVersion}`,
        { method: "PATCH", headers: { ...headers, Prefer: "return=representation" }, body: JSON.stringify({ state: toState, updated_at: new Date().toISOString() }) }
      );
      if (!response.ok) return { ok: false, reason: "STORE_ERROR" };
      const rows = await response.json().catch(() => []);
      if (Array.isArray(rows) && rows.length === 1) return { ok: true, plan: rowToPlan(rows[0]) };
      const existing = await getPlanInternal(planId);
      if (!existing) return { ok: false, reason: "UNKNOWN_PLAN" };
      if (existing.state !== "FALLBACK_REQUESTED") return { ok: false, reason: "NOT_FALLBACK_REQUESTED" };
      return { ok: false, reason: "LEASE_SUPERSEDED" };
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
