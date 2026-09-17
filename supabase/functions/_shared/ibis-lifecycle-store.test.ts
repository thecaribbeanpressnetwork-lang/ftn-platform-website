// FTN Platform — proves createSupabaseLifecycleStore()'s REQUEST CONSTRUCTION against PostgREST's
// documented contract, using a fake HTTP server. This does NOT prove real database row-level
// atomicity (no live Supabase project/Postgres instance was available in this environment) -- it
// proves that a conditional UPDATE (`state=eq.PENDING`) is what gets sent, and that this module
// correctly interprets zero-rows-returned as "someone else won" vs one-row-returned as "we won".
// That gap (real DB round-trip never exercised) is real and is reported, not hidden.
import { assert, assertEquals, assertMatch } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { createSupabaseLifecycleStore, resolveLifecycleStore, createInMemoryLifecycleStore, sha256Hex } from "./ibis-lifecycle-store.ts";

Deno.test("createPlan POSTs the expected row shape to PostgREST", async () => {
  let capturedUrl = "", capturedBody: any = null, capturedMethod = "";
  const fakeFetch: typeof fetch = async (url, opts) => {
    capturedUrl = String(url); capturedMethod = (opts?.method as string) || "";
    capturedBody = JSON.parse(String(opts?.body || "{}"));
    return new Response("", { status: 201 });
  };
  const store = createSupabaseLifecycleStore({ baseUrl: "https://fake.supabase.co", serviceRoleKey: "fake-role-key", fetchImpl: fakeFetch });
  await store.createPlan({ planId: "plan-1", authorizedTarget: "browser_local", intent: "SIMPLE_TEXT", freshnessRequired: false, textSha256: "abc123", ttlMs: 300000 });
  assertEquals(capturedMethod, "POST");
  assertMatch(capturedUrl, /\/rest\/v1\/ibis_execution_plans$/);
  assertEquals(capturedBody.plan_id, "plan-1");
  assertEquals(capturedBody.authorized_target, "browser_local");
  assertEquals(capturedBody.state, "PENDING");
  assert(!("text" in capturedBody), "no prompt text field may ever be sent to the durable store");
  assert(!("answer" in capturedBody), "no answer text field may ever be sent to the durable store");
});

Deno.test("transitionPlan sends a conditional UPDATE filtered on state=eq.PENDING (the atomicity mechanism)", async () => {
  let capturedUrl = "", capturedMethod = "";
  const fakeFetch: typeof fetch = async (url, opts) => {
    capturedUrl = String(url); capturedMethod = (opts?.method as string) || "";
    return new Response(JSON.stringify([{ plan_id: "plan-1", authorized_target: "browser_local", intent: "SIMPLE_TEXT", freshness_required: false, text_sha256: "abc123", state: "SUCCEEDED", created_at: new Date().toISOString(), expires_at: new Date(Date.now() + 300000).toISOString() }]), { status: 200 });
  };
  const store = createSupabaseLifecycleStore({ baseUrl: "https://fake.supabase.co", serviceRoleKey: "fake-role-key", fetchImpl: fakeFetch });
  const result = await store.transitionPlan("plan-1", "SUCCEEDED");
  assertEquals(capturedMethod, "PATCH");
  assertMatch(capturedUrl, /state=eq\.PENDING/, "the transition MUST be conditioned on the current state being PENDING -- this is what makes it atomic at the database level, not client-side logic");
  assertMatch(capturedUrl, /plan_id=eq\.plan-1/);
  assertEquals(result.ok, true);
});

Deno.test("transitionPlan reports NOT_PENDING when the conditional UPDATE affects zero rows (lost the race)", async () => {
  const sequencedFetch: typeof fetch = async (url, opts) => {
    if ((opts?.method as string) === "PATCH") return new Response(JSON.stringify([]), { status: 200 });
    return new Response(JSON.stringify([{ plan_id: "plan-1", authorized_target: "browser_local", intent: "SIMPLE_TEXT", freshness_required: false, text_sha256: "abc123", state: "SUCCEEDED", created_at: new Date().toISOString(), expires_at: new Date(Date.now() + 300000).toISOString() }]), { status: 200 });
  };
  const store = createSupabaseLifecycleStore({ baseUrl: "https://fake.supabase.co", serviceRoleKey: "fake-role-key", fetchImpl: sequencedFetch });
  const result = await store.transitionPlan("plan-1", "SUCCEEDED");
  assertEquals(result.ok, false);
  if (!result.ok) assertEquals(result.reason, "NOT_PENDING");
});

Deno.test("claimFallback sends the fresh-claim conditional UPDATE (state=eq.PENDING) with a new lease", async () => {
  let capturedUrl = "", capturedBody: any = null;
  const fakeFetch: typeof fetch = async (url, opts) => {
    capturedUrl = String(url);
    capturedBody = JSON.parse(String(opts?.body || "{}"));
    return new Response(JSON.stringify([{ plan_id: "plan-1", authorized_target: "browser_local", intent: "SIMPLE_TEXT", freshness_required: false, text_sha256: "abc123", state: "FALLBACK_REQUESTED", created_at: new Date().toISOString(), expires_at: new Date(Date.now() + 300000).toISOString(), lease_owner: capturedBody?.lease_owner, lease_version: 1, lease_expires_at: new Date(Date.now() + 45000).toISOString(), attempt_count: 1 }]), { status: 200 });
  };
  const store = createSupabaseLifecycleStore({ baseUrl: "https://fake.supabase.co", serviceRoleKey: "fake-role-key", fetchImpl: fakeFetch });
  const result = await store.claimFallback("plan-1", 45000);
  assertMatch(capturedUrl, /state=eq\.PENDING/, "a fresh claim must be conditioned on the current state being PENDING");
  assertEquals(capturedBody.state, "FALLBACK_REQUESTED");
  assertEquals(capturedBody.lease_version, 1);
  assert(typeof capturedBody.lease_owner === "string" && capturedBody.lease_owner.length > 0, "a fresh claim must issue a real lease owner token");
  assertEquals(result.ok, true);
});

Deno.test("finalizeFallback's conditional UPDATE is fenced on BOTH lease_owner and lease_version", async () => {
  let capturedUrl = "";
  const fakeFetch: typeof fetch = async (url) => {
    capturedUrl = String(url);
    return new Response(JSON.stringify([{ plan_id: "plan-1", authorized_target: "browser_local", intent: "SIMPLE_TEXT", freshness_required: false, text_sha256: "abc123", state: "SUCCEEDED", created_at: new Date().toISOString(), expires_at: new Date(Date.now() + 300000).toISOString(), lease_owner: "owner-abc", lease_version: 1, attempt_count: 1 }]), { status: 200 });
  };
  const store = createSupabaseLifecycleStore({ baseUrl: "https://fake.supabase.co", serviceRoleKey: "fake-role-key", fetchImpl: fakeFetch });
  const result = await store.finalizeFallback("plan-1", "owner-abc", 1, "SUCCEEDED");
  assertMatch(capturedUrl, /lease_owner=eq\.owner-abc/, "finalize must be fenced on the exact lease owner it was issued");
  assertMatch(capturedUrl, /lease_version=eq\.1/, "finalize must be fenced on the exact lease version it was issued -- this is what makes a superseded lease's finalize fail");
  assertEquals(result.ok, true);
});

Deno.test("finalizeFallback reports LEASE_SUPERSEDED when the fencing condition matches zero rows", async () => {
  const sequencedFetch: typeof fetch = async (url, opts) => {
    if ((opts?.method as string) === "PATCH") return new Response(JSON.stringify([]), { status: 200 });
    return new Response(JSON.stringify([{ plan_id: "plan-1", authorized_target: "browser_local", intent: "SIMPLE_TEXT", freshness_required: false, text_sha256: "abc123", state: "FALLBACK_REQUESTED", created_at: new Date().toISOString(), expires_at: new Date(Date.now() + 300000).toISOString(), lease_owner: "owner-new", lease_version: 2, attempt_count: 2 }]), { status: 200 });
  };
  const store = createSupabaseLifecycleStore({ baseUrl: "https://fake.supabase.co", serviceRoleKey: "fake-role-key", fetchImpl: sequencedFetch });
  const result = await store.finalizeFallback("plan-1", "owner-old", 1, "SUCCEEDED");
  assertEquals(result.ok, false);
  if (!result.ok) assertEquals(result.reason, "LEASE_SUPERSEDED");
});

Deno.test("getPlan marks a PENDING-but-past-expiry row as EXPIRED", async () => {
  const pastExpiry = new Date(Date.now() - 1000).toISOString();
  const fakeFetch: typeof fetch = async () => new Response(JSON.stringify([{ plan_id: "plan-1", authorized_target: "browser_local", intent: "SIMPLE_TEXT", freshness_required: false, text_sha256: "abc123", state: "PENDING", created_at: new Date().toISOString(), expires_at: pastExpiry }]), { status: 200 });
  const store = createSupabaseLifecycleStore({ baseUrl: "https://fake.supabase.co", serviceRoleKey: "fake-role-key", fetchImpl: fakeFetch });
  const plan = await store.getPlan("plan-1");
  assertEquals(plan?.state, "EXPIRED");
});

// --- resolveLifecycleStore(): the ONLY function real request handling should call -- proves the
// fail-closed contract from real (fake) environment configuration. ---
Deno.test("resolveLifecycleStore returns a DATABASE store when SUPABASE_URL+SERVICE_ROLE_KEY are set", () => {
  const env = new Map([["SUPABASE_URL", "https://fake.supabase.co"], ["SUPABASE_SERVICE_ROLE_KEY", "fake-key"]]);
  const store = resolveLifecycleStore({ get: (k) => env.get(k) });
  assertEquals(store?.kind, "DATABASE");
});

Deno.test("resolveLifecycleStore returns IN_MEMORY_TEST_MODE only with explicit opt-in", () => {
  const env = new Map([["IBIS_ALLOW_INMEMORY_LIFECYCLE", "true"]]);
  const store = resolveLifecycleStore({ get: (k) => env.get(k) });
  assertEquals(store?.kind, "IN_MEMORY_TEST_MODE");
});

Deno.test("resolveLifecycleStore returns null (fail closed) with no configuration at all", () => {
  const store = resolveLifecycleStore({ get: () => undefined });
  assertEquals(store, null);
});

Deno.test("sha256Hex is deterministic and distinguishes different text", async () => {
  const a = await sha256Hex("hello");
  const b = await sha256Hex("hello");
  const c = await sha256Hex("hello world");
  assertEquals(a, b);
  assert(a !== c);
  assertMatch(a, /^[0-9a-f]{64}$/);
});

// Sanity: the in-memory store itself satisfies the same interface (used throughout
// ibis-canonical-brain.test.ts) -- one quick smoke test here, not a duplicate of that suite.
Deno.test("in-memory store: create -> transition -> getPlan reflects the terminal state", async () => {
  const store = createInMemoryLifecycleStore();
  await store.createPlan({ planId: "p1", authorizedTarget: "browser_local", intent: "SIMPLE_TEXT", freshnessRequired: false, textSha256: "x", ttlMs: 60000 });
  const transition = await store.transitionPlan("p1", "SUCCEEDED");
  assertEquals(transition.ok, true);
  const plan = await store.getPlan("p1");
  assertEquals(plan?.state, "SUCCEEDED");
});
