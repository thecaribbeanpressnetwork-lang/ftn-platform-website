# IBIS-MAP — Current State Audit

**Date:** 2026-08-20 (updated same day with the Phase 1 and Phase 2 sections below)
**Purpose:** Ground-truth audit requested by two build briefs ("Ibis v6 — multimodal creation" and
the "Master Engineering Prompt — Caribbean AI Operating Layer"). Both briefs require this step
before any implementation. §§1–9 below are the original audit (no code changed to produce it). §0
records the first implementation phase, done after the audit was reviewed and approved.

---

## 0. Phase 1 reconciliation — "one IBIS brain" (implemented 2026-08-20)

The "Master Engineering Prompt" directive's Phase 1 asked to reconcile the three ask-ibis surfaces
(`/ibis-ai/` intent router, `ibis-query`, `ibis-widget`) so a request doesn't land in three
disconnected brains. Here's exactly what was decided and changed, and — as important — what was
deliberately **not** merged and why.

**Not merged: `ibis-query`'s and `ibis-widget`'s backends.** `supabase/functions/ibis-query` has a
CI-enforced requirement (`tests/backend-source-audit.mjs`: `'ibis must retain an authenticated
server boundary'`) — it must stay behind sign-in. `js/ibis-widget.js` was built guest-accessible by
explicit design (present on every page, no sign-in friction). Merging their backends would either
break that CI check or force sign-in onto a widget designed not to need it. Left both functions
exactly as they were; **`ibis-query` was not touched at all** in this pass.

**What was actually duplicated, and got fixed:** `ibis-widget.js`'s system prompt hardcoded FTN's
product list as static text, completely disconnected from `js/product-registry-data.js` — the one
real source of truth `intent-router.js` and everything else already reads from. That's the actual
"three brains" problem: not three different LLMs, but one surface silently maintaining its own
stale copy of data that already lives somewhere else.

**The fix, in order of what actually happens on a message:**
1. `js/ibis-widget.js` now lazy-loads `product-registry-data.js` + `product-registry.js` +
   `intent-router.js` (mirroring `platform-foundation.js`'s existing `ensureRegistry()` pattern,
   not a new loader convention) and tries the same deterministic, non-LLM keyword match
   `/ibis-ai/` already uses — `FTN.IntentRouter.route()` — **before** ever calling the paid
   Anthropic backend. A match only counts as confident if it hits one of the product's own
   registered keywords (the same bar `intent-router.js` already documents as its honest-match
   standard), not just incidental word overlap.
2. If that produces a confident match, the widget shows it instantly, for zero cost, as real
   clickable product links — no API call happens for that turn.
3. Only when the deterministic router has nothing confident does it fall through to
   `ibis-assistant` (Anthropic).
4. `supabase/functions/ibis-assistant/index.ts` no longer carries its own hardcoded product list.
   The client now sends a live snapshot (`FTN.ProductRegistry.publicProducts()`, name/route/tagline
   only) with every request, and the server builds its system prompt from that. If the client can't
   supply one, it falls back to a generic instruction rather than stale hardcoded data.

**This is a real, if modest, instance of the requested architecture** — INTENT → CAPABILITY
(deterministic router) → cheapest eligible route first → PROVIDER (Anthropic) only on fallback —
scoped to what could be done without touching Supabase schema, without touching the existing
production `ibis-query` function, and without inventing an orchestration layer that doesn't
actually route anything yet. Sections 10 (dynamic multi-provider ranking), 11–12 (failover/health)
and 14+ (open-model infrastructure, RAG, Creole layer) remain genuinely unbuilt — there is still
only one real provider (Anthropic) behind the widget, so there is nothing yet to fail over
*between*.

**Files changed:** `js/ibis-widget.js`, `js/nav.js` (cache-bust bump), `css/components/
ibis-widget.css` (route-suggestion list styling), `supabase/functions/ibis-assistant/index.ts`.
No new Supabase tables, no RLS changes, no changes to any other Edge Function.

## 0.5 Phase 2 — provider fabric foundation (implemented 2026-08-20)

The Phase 2 directive asked for a provider registry, capability model, eligibility engine,
economic router, adapter pattern, failover, health tracking, RAG/Creole extension points, and
tests — while also explicitly saying "do not overbuild," "do not claim redundancy when only one
provider exists," and "implement the smallest complete increment." Those two instructions bound
what actually got built.

**What's real and shipped:**

- **`js/ibis-provider-registry.js` broadened, not replaced.** It was scoped to Creative Studio
  (image/video/instrumental) candidates; it's now the one registry for every external AI provider
  IBIS touches. The original `categories`/`byCategory()` shape `ibis-creative-studio.js` already
  depends on is untouched. Added, additively: `capabilities` (the standardized taxonomy — TEXT,
  IMAGE_GENERATION, VIDEO_GENERATION, INSTRUMENTAL_GENERATION, AUDIO_GENERATION are the ones any
  real provider here actually uses; the rest of Phase 2B's list — VISION, OCR, CODE, etc. — isn't
  added because nothing in this registry does those yet, and an unused enum value isn't a
  capability, it's decoration), `costToIbis` (the field the economic router actually gates on),
  and two new entries for the two real TEXT providers already live in this codebase (`ibis-query`
  → Gemini, `ibis-assistant` → Anthropic) so capability lookups have one place to check.
- **`js/ibis-eligibility.js` — the eligibility engine, for real.** `evaluate(providerId,
  capability, context)` returns ELIGIBLE / INELIGIBLE / USER_AUTH_REQUIRED /
  TEMPORARILY_UNAVAILABLE / UNKNOWN. Fails closed: an unrecognized provider id, or an unrecognized
  `costToIbis` value, is UNKNOWN — never treated as safe to call. `find(capability, context)`
  returns only ELIGIBLE providers, ranked by real observed health (successes minus failures), not
  a hand-typed quality score. `recordOutcome()`/`getHealth()` track real call outcomes in memory;
  three straight observed failures demote a provider to TEMPORARILY_UNAVAILABLE. This is a genuine
  implementation of Phase 2A/2D's flow (capability → registry → eligibility filter → ranking), not
  a diagram — see `tests/ibis-eligibility-audit.mjs` for the proof.
- **The economic invariant is enforced, not just documented.** Both the eligibility engine
  (`evaluate()` rejects any `costToIbis` not in an explicit allow-list) and a dedicated CI test
  assert: *no provider with `enabled: true` may carry a cost classification that wasn't explicitly
  reviewed.* This is now a release-gate check (`.github/workflows/functional-release.yml` runs
  `tests/ibis-eligibility-audit.mjs`), not a promise in a comment.
- **`js/ibis-widget.js` is the first real adapter consumer.** Before calling the paid Anthropic
  backend, it now calls `evaluate('ibis-assistant-anthropic', 'TEXT', {...})`. Today that
  correctly returns INELIGIBLE (the provider record's `enabled` is still `false` until the
  function is actually deployed — see §0), so the widget shows an honest "not turned on yet"
  message instead of attempting a network call that would just fail. This is a real behavior
  change and a real improvement: previously a failed call produced a generic "check your
  connection" message that misattributed the cause. Every real call outcome (success/failure/
  latency) is now recorded via `recordOutcome()`.

**What this deliberately does NOT do, and why:**

- **No failover.** Phase 2I's own text says "once at least TWO genuinely executable providers
  exist for a capability, implement automatic failover." There is exactly one real TEXT provider
  candidate reachable without sign-in (`ibis-assistant-anthropic`, and it isn't deployed yet).
  Building failover logic with nothing to fail over *to* would be exactly the "claim redundancy
  when only one provider exists" the directive explicitly forbids.
- **No new provider research was added to the registry.** Phase 2F asked for freshly verified
  provider discovery via authoritative sources. The 7 pre-existing creative-studio entries are
  dated 2026-08-10 — 10 days old, not stale enough to justify re-verification right now — and I
  didn't fabricate new "verified" entries for providers I hadn't actually checked against current
  documentation. If you want a real, bounded research pass on 1–2 new zero-cost-to-IBIS candidates
  for a specific capability, that's a good, scoped next request — distinct from this pass.
  RAG/pgvector, Creole/Caribbean-language metadata, and the open-source inference ecosystem
  (Phase 2G/2N/2O) are genuine extension points, not yet built: no code exists for any of them, and
  none was added. Building empty scaffolding for them now would be exactly the "meaningless
  metadata" / "fake integration" the directive also explicitly forbids.
- **No Node backend, no GPU hosting.** Still nothing in this repo's own infrastructure that could
  run a self-hosted open model. `ace-step` and `stable-audio-3` remain `costToIbis:
  WOULD_REQUIRE_IBIS_COMPUTE_SPEND` — correctly ineligible until that's a deliberate, budgeted
  infrastructure decision.

**Files changed:** `js/ibis-provider-registry.js`, `js/ibis-eligibility.js` (new), `js/ibis-widget.js`,
`js/nav.js` (cache-bust bump), `tests/ibis-eligibility-audit.mjs` (new), `.github/workflows/
functional-release.yml` (new CI step). No Supabase schema changes, no changes to any Edge Function
other than what Phase 1 already changed in `ibis-assistant`.

**Report, per the directive's own requested format:**

- **WHAT EXISTS:** a real provider registry (9 entries, 2 of them TEXT/chat, 7 creative-studio
  candidates, all correctly disabled except the pre-existing `ibis-query`); a real eligibility
  engine with fail-closed unknown handling; real in-memory health tracking; one real adapter
  consumer (the widget).
- **WHAT WAS ADDED:** `capabilities` + `costToIbis` fields on every registry entry; two new
  registry entries documenting the two real TEXT providers; the eligibility engine; a CI-enforced
  economic-invariant test.
- **WHAT IS ACTUALLY LIVE:** `ibis-query` (Gemini, authenticated) — pre-existing, untouched.
  Nothing new went live; `ibis-assistant` (Anthropic) still needs manual Supabase deployment.
- **WHAT IS FREE TO IBIS:** nothing new. The 7 creative-studio candidates that are genuinely
  `ZERO_CUSTOMER_FUNDED` are all still `enabled: false`, pending real account/rights review — that
  status didn't change in this pass, only its visibility to the eligibility engine did.
- **WHAT REQUIRES USER AUTHORIZATION:** `ibis-query` (sign-in, CI-enforced). Nothing else yet
  declares `userAuthorizationRequired`.
- **WHAT STILL DOES NOT EXIST:** multi-provider failover, provider health beyond simple in-memory
  success/failure counts, RAG, Creole/Caribbean-language layer, any open-model inference
  infrastructure, any second real TEXT/IMAGE/VIDEO provider.
- **NEXT REDUNDANCY TARGET:** TEXT is the obvious next target once `ibis-assistant` is actually
  deployed — it's the only capability with two registry entries already, just not two *live*,
  *guest-eligible* ones yet. IMAGE has zero live candidates (both PixVerse and Kling require
  prepaid customer credits IBIS doesn't yet collect); that's a product decision (build the credit
  purchase flow) before it's an eligibility-engine decision.

---

## 1. Architecture (the constraint every other section depends on)

- **This is a static site**, not a Node.js application: vanilla HTML/CSS/JS, no `package.json`, no
  build step, no `lib/` directory, no bundler. Deployed to **GitHub Pages** (not Cloudflare, despite
  some external briefs assuming that) via `.github/workflows/functional-release.yml` +
  `static-pages.yml`. Confirmed live: `Deploy static site to GitHub Pages` is the actual deploy
  workflow.
- **The only backend compute is Supabase Edge Functions** (Deno, TypeScript, one `index.ts` per
  function under `supabase/functions/`). There is no Node/Python/GPU-inference host anywhere in this
  repository's own infrastructure.
- **Nothing auto-deploys to Supabase from Git.** Per `supabase/README.md`'s own documented process, a
  human deploys the reviewed source via CLI/dashboard and sets secrets manually. This applies to any
  new function/table this audit's briefs propose.
- Both briefs propose things (self-hosted GPU inference for open models, WebGPU local inference,
  vLLM/ComfyUI/LangGraph orchestration, Prometheus/Grafana observability, a `lib/` Node app) that
  **do not fit this architecture as it stands today.** That's not a reason they're wrong ideas — it's
  a real decision this repo doesn't currently have an answer for: where would that code actually run?

## 2. Routes / products (confirmed from `js/product-registry-data.js`)

26 products registered, 24 public. Two `VAULTED` (Love, Health — no public access by design).
Mission Control is `PRIVATE` (institutional, not public). The ones this audit's briefs specifically
named:
- **FTN Riddim** (`/riddim/`) — parent hub for FTN Fire (`/riddim/fire/`), FTN DJ Tube
  (`/riddim/dj/`), FTN DAW (`/riddim/daw/`), FTN EPK (`/radio/#ftn-epk`).
- **FTN Screen** (`/screen/`) — this is **discovery**, not generation: "Caribbean film, filmmaker and
  screen-work discovery with permitted trailers, lawful destinations and festival-package
  preparation." No video-generation capability exists here today. One brief's premise that Screen
  already generates video is incorrect.
- **ibis.ai** (`/ibis-ai/`) — see §3/§4 below, this is where almost everything both briefs ask about
  already lives.

## 3. Current ibis.ai component inventory

Loaded by `/ibis-ai/index.html`, in order: `intent-router.js`, `ibis-provider-registry.js`,
`ibis-ai-workspace.js`, `ibis-creative-studio.js`, `ibis-video-decision-gate.js`,
`ibis-query-bootstrap.js`. Each has one real, distinct job:

| File | What it actually does today |
|---|---|
| `js/intent-router.js` | Matches a stated goal to FTN products via real keyword overlap against the Product Registry (`FTN.ProductRegistry.search()`). Explicitly documented in its own header comment: **"never an LLM call, never a simulated thinking delay."** This is the honest, working "route the user to the right FTN product" capability both briefs ask for — already built, deterministic, not AI. |
| `js/ibis-provider-registry.js` | A real, structured, evidence-based registry of external creative-AI providers: PixVerse, Kling AI, MusicAPI Producer · Lyria 3 Pro, ACE-Step, Stable Audio 3, MusicGen, Producer.ai. Each entry carries `apiStatus`, `affiliateStatus`, `commercialUse`, `redistribution`, `enabled` (all currently `false`), `lastVerified` date, and a plain-English note explaining exactly why it isn't live yet. This is most of what the new brief's §9 "capability & redundancy matrix" asks for, already built to a real evidentiary standard — just not yet wired to a live routing engine, because nothing has been approved to route to. |
| `js/ibis-ai-workspace.js` | Mounts the ibis.ai page shell via the shared `WorkspaceShell`. |
| `js/ibis-creative-studio.js` | The creative-brief UI (image/video/instrumental mode picker). |
| `js/ibis-video-decision-gate.js` | Adds video-specific fields (length/resolution/sound/provider/credit cap) and — critically — **deliberately disables the Generate button** with `title="Requires a live provider quote and enough available credits"`, and renders "Provider has not returned a live quote or balance to this FTN session. No prompt was transferred and no credits were reserved." This is already the "don't fabricate a completed generation" discipline the new brief's §42/§43 asks for. |
| `js/ibis-query-bootstrap.js` | Not yet read in this pass — bootstraps the `ibis-query` chat call (see §4). |

**My own earlier work this session** added a third, separate ibis surface: `js/ibis-widget.js` (a
sitewide floating chat button, backed by a new `ibis-assistant` Edge Function calling Anthropic).
This is now a genuine overlap worth your attention: **three parallel "ask ibis" surfaces exist**
(`/ibis-ai/`'s intent router + creative studio, the `ibis-query` Gemini chat used elsewhere, and my
new sitewide widget). None of them currently talk to each other. If real routing/consolidation work
happens, this is the first thing to reconcile — not something to silently pick a winner on without
your say.

## 4. Current provider inventory (every real external AI call in this repo, confirmed by file)

| Function/file | Provider | Auth required | Status |
|---|---|---|---|
| `supabase/functions/ibis-query` | Google Gemini (`GEMINI_API_KEY`, model configurable, default `gemini-2.5-flash`) | Yes — Supabase Auth, rejects guests | Live if `GEMINI_API_KEY` is set; rate-limited 24 req/5min/IP |
| `supabase/functions/ibis-assistant` (added this session) | Anthropic (`ANTHROPIC_API_KEY`) | No — guest-accessible by design | **Not yet deployed** — needs manual deploy + secret |
| `supabase/functions/ibis-creative-control` | None yet — `adapters` map is intentionally empty | Yes | Fails closed: every `generate` call returns 409, "no provider was called and no credits were reserved" |
| `supabase/functions/dj-tube-stems` | Replicate (`REPLICATE_API_TOKEN`) | Yes | Gated behind `FTN_STEM_GENERATION_ENABLED`-equivalent checks, rights confirmation, credit reserve/refund, signed private URLs only |
| `supabase/functions/ftn-fire-generate` | A private FTN-owned inference gateway (`FTN_FIRE_INFERENCE_URL`/`TOKEN`) fronting `stable-audio-3-medium` / `stable-audio-3-small-sfx` | Yes | Gated behind **both** `FTN_CREATIVE_GENERATION_ENABLED` and `FTN_FIRE_GENERATION_ENABLED` — per `supabase/README.md`: "Keep disabled until the Fire runbook is complete" |
| `js/ftn-fire.js` (client-only, `/riddim/fire/`) | None — 100% on-device Web Audio API procedural synthesis | No | Live today, real, explicitly labelled "not a Stability AI model. It runs on your device." |

**No provider anywhere in this repo is currently both `enabled` and live for paid generation.** The
only thing users can actually generate right now is Fire's free, on-device procedural sketch (zero
cost by construction — it never leaves the browser) and text chat via `ibis-query` (Gemini,
authenticated) and my not-yet-deployed `ibis-assistant` (Anthropic, guest).

## 5. Economics — how "never spend money automatically" is enforced today

Already real, not just documented:
- `ibis-creative-control`'s `generate` action **cannot be reached** without `FTN_CREATIVE_GENERATION_ENABLED==="true"` *and* a populated `adapters[providerId]` — both are false/empty today, so the code path is provably unreachable.
- Credits are **customer-funded**, not FTN-funded: `ftn_ai_credit_accounts` / `ftn_ai_credit_ledger` / `ftn_reserve_ai_credits` / `ftn_refund_ai_job` (from `20260810150000_ibis_creative_cost_controls.sql`) model a prepaid-balance system where a user spends *their own* purchased credits, never FTN's own money. This is a different mechanism from "always route to what's free," but serves the same non-negotiable outcome: no surprise bill lands on FTN.
- `ftn-fire-generate` requires **both** a platform-wide and a product-specific flag to be `"true"` — a real two-key fail-closed pattern, not a single toggle.

## 6. Authentication (confirmed working end-to-end, not a gap)

`js/ftn-auth.js` wraps Supabase Auth (PKCE flow): `signInWithGoogle()` calls
`supabase.auth.signInWithOAuth({provider:'google',...})`, `signInWithEmail()` sends a magic link,
`signOut()`, `getVerifiedUser()`, `?return=` redirect handling — all real and already used by
`ibis-creative-control`, `dj-tube-stems`, `ftn-fire-generate`, and the account page. No new auth
system is needed for anything either brief describes; both explicitly forbid automating third-party
logins anyway.

## 7. Storage (private-only, confirmed from migrations)

Three buckets exist, **all `public:false`**: `ftn-private-audio` (Fire/stem output),
`ftn-fire-output` (managed Fire generation results, signed URLs only), `community-report-evidence`
(Community Connect, unrelated to ibis). No public bucket exists for AI-generated media today.

## 8. Explicitly NOT present (real gaps, not oversights to silently fill)

- No pgvector / RAG — `ibis-query` and `ibis-assistant` are single-turn-context system-prompt chat,
  no retrieval layer.
- No `knowledge/caribbean/` structured knowledge base, no Creole/English persona split, no Creole
  corpus ingestion of any kind.
- No provider health monitoring, no automatic multi-provider failover (there's nothing to fail over
  *between* yet — zero providers are enabled).
- No workflow/project orchestration beyond the single `ftn_ai_projects` table (id, title, type,
  brief JSON, status) — no multi-step pipeline execution engine.
- No self-hosted open-model inference (ACE-Step and Stable Audio 3 are listed in the provider
  registry as `SELF_HOST_CANDIDATE`, explicitly not deployed).
- No corpus/training-data export pipeline, no consent-tracked community-contribution intake beyond
  what Community Connect already does for civic reports (unrelated domain).

## 9. What this means for next steps

The existing codebase already reflects the *spirit* of both briefs — verified-evidence-only,
fail-closed economics, no fabricated success states, real (not simulated) routing where routing
exists at all. The gap isn't philosophy, it's scale: everything above §8 is genuinely new
infrastructure, and several pieces (self-hosted GPU inference, a Node orchestration layer, Creole
NLP research) don't have an obvious home in this repo's current architecture.

**No implementation was started.** Per your direction, this document is the deliverable for this
pass. The next real decision is picking one concrete, scoped increment — not attempting the full
scope of either brief at once.
