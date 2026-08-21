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
- **NEXT REDUNDANCY TARGET (superseded by Phase 3 below):** TEXT is the obvious next target once
  `ibis-assistant` is actually deployed — it's the only capability with two registry entries
  already, just not two *live*, *guest-eligible* ones yet. IMAGE has zero live candidates (both
  PixVerse and Kling require prepaid customer credits IBIS doesn't yet collect); that's a product
  decision (build the credit purchase flow) before it's an eligibility-engine decision.

## 0.75 Phase 3 — verified provider discovery + first real redundancy (implemented 2026-08-20)

**Scope decision, stated up front:** the Phase 3 directive asks for provider research across ~20
capabilities and ~25 named companies, plus a full Caribbean/Creole resource inventory. Its own
target section narrows this to something achievable: *"At least TWO genuinely executable routes
for one major capability. Preferably TEXT first."* That's what got built. Everything outside TEXT
below is marked NOT RESEARCHED, honestly, rather than filled in with unverified guesses.

### Research method

Live web search + direct fetch of official documentation (not SEO aggregator summaries) for three
TEXT-capable candidates, 2026-08-20:

| Provider | Verified against | Key finding |
|---|---|---|
| Groq | `console.groq.com/docs/rate-limits` (official) | Real per-model free-tier rate limits confirmed (e.g. `openai/gpt-oss-120b`: 30 RPM, 1K RPD, 8K TPM, 200K TPD). Official docs page did **not** explicitly state whether a credit card is required — a secondary source claimed "no credit card," but that claim is unconfirmed against the primary source, so Groq is recorded as researched, not added to the registry. |
| Google Gemini (AI Studio) | Search-aggregated, cross-referenced against known existing `ibis-query` usage | Free tier confirmed to still exist as of April 2026 policy change (Pro models removed from free tier; Flash/Flash-Lite remain, 5–15 RPM, ≤1,000 RPD). Not independently re-verified against Google's own pricing page this pass — this is the provider `ibis-query` already uses in production, so this is a freshness note, not new discovery. |
| **Cloudflare Workers AI** | `developers.cloudflare.com/workers-ai/platform/pricing/` and `.../get-started/rest-api/` (both official) | **Selected.** Free 10,000-Neuron/day allocation, confirmed to fail closed — official docs state *"If you exceed any one of the above limits, further operations will fail with an error"* — not silent billing. No credit card required for the free allocation. Confirmed callable via plain REST (bearer token + account id) from any external server — fits this repo's Supabase-Edge-Function architecture with zero new infrastructure. Covers four capability categories (text, embeddings, image, speech-to-text), though only TEXT was registered this pass. |

**NOT researched this pass** (recorded honestly, not guessed): VISION, OCR, IMAGE_EDITING,
IMAGE_UPSCALING, VIDEO_GENERATION, VIDEO_ANALYSIS, MUSIC_GENERATION beyond what Phase 2's registry
already had, TRANSLATION, LANGUAGE_IDENTIFICATION, RERANKING, DOCUMENT_PROCESSING, CODE, and the
entire Caribbean/Creole resource inventory (CreoleVal, JamPatoisNLI, MIT-Haiti, ICE Trinidad &
Tobago, Radio Haiti-Inter, CreoleNLP). None of these got fabricated entries.

### What was implemented

- **`js/ibis-eligibility.js`'s cost taxonomy reconciled with the directive's own A/B/C/D/E economic
  categories** (documented inline in the file). Added `ZERO_COST_TO_IBIS` (category A — genuinely
  free to IBIS, not customer-funded) as a new allowed classification, distinct from the existing
  `ZERO_CUSTOMER_FUNDED` (category B). The two `PAID_BY_IBIS_*` exceptions stay — labeled
  explicitly as narrow, already-shipped, founder-approved exceptions predating this stricter rule,
  not something a new provider can claim by default.
- **New registry entry: `cloudflare-workers-ai-text`** (`@cf/meta/llama-3.1-8b-instruct`,
  `costToIbis: ZERO_COST_TO_IBIS`, `enabled: false` until real credentials exist — discovery is not
  deployment).
- **New Supabase function: `supabase/functions/ibis-text-cloudflare`** — same shape as
  `ibis-assistant` (CORS, per-IP rate limit, guest-accessible, fails closed 503 without
  `CLOUDFLARE_ACCOUNT_ID`/`CLOUDFLARE_API_TOKEN`). Documented in `supabase/README.md` alongside
  every other function.
- **Real failover, not a diagram: `js/ibis-eligibility.js` gained `attemptInOrder(capability,
  context, executor)`.** Ranks eligible providers, tries each in order, records every real
  outcome, returns on first success. `js/ibis-widget.js`'s `callAssistant()` now calls this instead
  of hardcoding one provider — the widget doesn't know or care which TEXT provider answers.
  **Proven with a real test** (`tests/ibis-eligibility-audit.mjs`, extended): a controlled
  Provider-A-fails/Provider-B-succeeds scenario against the actual `attemptInOrder()` code path
  (not a reimplementation of it), plus an all-fail case and a zero-eligible-providers case that
  confirms the executor is never even called when nothing is eligible.

**Current live behavior, unchanged today:** with zero enabled guest-eligible TEXT providers, the
widget still shows its honest "not turned on yet" message. Nothing about the user-visible behavior
changes until a human deploys at least one of `ibis-assistant` or `ibis-text-cloudflare` with real
credentials — at which point real failover activates automatically, with no further code change.

**Files changed:** `js/ibis-eligibility.js`, `js/ibis-provider-registry.js`, `js/ibis-widget.js`,
`js/nav.js` (cache-bust bump), `supabase/functions/ibis-text-cloudflare/index.ts` (new),
`supabase/README.md`, `tests/ibis-eligibility-audit.mjs`.

### Phase 3 report (directive's requested format)

- **WHAT WAS VERIFIED:** Cloudflare Workers AI's free-tier hard cost cap and REST callability
  (official docs, both fetched directly, 2026-08-20). Groq's free-tier rate limits (official docs)
  — not integrated, credit-card requirement unconfirmed against primary source.
- **WHAT WAS ACTUALLY INTEGRATED:** the eligibility/failover *machinery*. The Cloudflare provider
  itself is registered and has a real, deployable function — but is not live (`enabled: false`,
  no credentials set).
- **WHAT IS CURRENTLY $0 TO IBIS:** nothing new went live. `cloudflare-workers-ai-text` is
  classified `ZERO_COST_TO_IBIS` and ready, pending deployment.
- **WHAT REQUIRES USER AUTHORIZATION:** unchanged from Phase 2 — only `ibis-query`.
- **WHAT IS OPEN SOURCE / OPEN WEIGHT:** Llama 3.1 8B (via Cloudflare) is Meta's open-weight model;
  Cloudflare's own hosting/pricing terms govern actual usage, not the model's license alone — this
  is exactly the "open weight ≠ free to run" distinction the directive warned about, and why
  `costToIbis` reflects Cloudflare's hosting terms, not the model's license.
- **WHAT IS SELF-HOSTABLE:** unchanged — `ace-step`, `stable-audio-3` remain
  `WOULD_REQUIRE_IBIS_COMPUTE_SPEND`, correctly ineligible; no self-hosting infrastructure exists
  in this repo.
- **WHAT IS NOT CURRENTLY FREE:** PixVerse, Kling, MusicAPI Producer (all require prepaid customer
  credits — category B once that flow exists, not yet built).
- **WHAT IS NOT CURRENTLY INTEGRATED:** every capability outside TEXT; Groq (researched, not
  added); the entire open-source inference ecosystem (Phase 2G/3's own list) — no code, no
  scaffolding, because none of it has a real place to run in this repo's architecture yet.
- **CURRENT REDUNDANCY BY CAPABILITY:** TEXT now has 3 registry entries (1 live-but-authenticated,
  2 real-but-undeployed) — genuine architecture-level redundancy once either is deployed. Every
  other capability: 0–2 entries, all disabled.
- **CURRENT CARIBBEAN/CREOLE RESOURCES:** still none — not researched this pass, not fabricated.
- **NEXT HIGHEST-VALUE PROVIDER TO ADD:** deploying either already-registered TEXT provider
  (`ibis-assistant` or `ibis-text-cloudflare`) creates real, observable redundancy immediately with
  zero further code. That's higher-value than researching a fourth TEXT candidate or a new
  capability right now.

### Phase 4 status: blocked, correctly

The Phase 4 multimodal acceptance test (generate a real reggae instrumental + images + video,
prove cross-modal handoff, prove failover under real generation load) was **not attempted**. Its
own prerequisite — at least one real, live, zero-cost-to-IBIS generation route for
IMAGE/VIDEO/MUSIC — does not exist. The only live generation capability in this repo remains FTN
Fire's on-device procedural synthesis, which isn't an AI provider call at all. Attempting Phase 4
now would require either fabricating a result (explicitly forbidden throughout every phase of this
directive) or blocking on infrastructure (third-party API accounts, billing, Supabase secrets) that
can't be provisioned from inside this session. Phase 4 stays gated until Phase 3-style discovery
produces a real IMAGE, VIDEO, or MUSIC candidate and a human deploys it.

## 0.8 Phase 3B — MUSIC / AUDIO / IMAGE / VIDEO capability audit (2026-08-20)

**Scope decision, stated up front, same as Phase 3:** the directive's own capability taxonomy
lists 30+ granular MUSIC transforms, 15+ IMAGE transforms, and 20+ VIDEO transforms. Verifying
each one individually against a primary source (as the directive itself requires — "every
candidate must be verified against a primary source," "unknown values must remain UNKNOWN") would
take a research budget far beyond one pass. What follows is real, primary-source-verified research
at the **capability level** (IMAGE_GENERATION, IMAGE_EDITING, VIDEO_GENERATION, INSTRUMENTAL_
GENERATION, STEM_SEPARATION) — the level Phase 2's registry already operates at — rather than a
fabricated-looking table with 60+ rows most of which would be guesses. This is explicitly a
research pass; nothing new was enabled or deployed this round (see "What was NOT implemented"
below).

### Verified findings, 2026-08-20, primary sources only

**IMAGE — real zero-cost route exists, same provider already verified for TEXT.**
Fetched `developers.cloudflare.com/workers-ai/models/` directly. Cloudflare Workers AI's free,
hard-capped 10,000-Neuron/day allocation (verified in Phase 3) also covers a real IMAGE lineup:
`flux-1-schnell`, `flux-2-dev`, `flux-2-klein-4b`/`9b`, `stable-diffusion-xl-base-1.0`,
`stable-diffusion-xl-lightning`, `dreamshaper-8-lcm`, `lucid-origin`, `phoenix-1.0` (TEXT_TO_IMAGE)
— plus genuine IMAGE_EDITING: `stable-diffusion-v1-5-inpainting`, `stable-diffusion-v1-5-img2img`,
and `flux-2-klein-9b`, which the platform's own docs describe as unifying generation and editing
in one model. Same account, same verified cost mechanism as the TEXT provider — this is the
highest-confidence new finding this pass.

**VIDEO — confirmed no zero-cost hosted route exists.** The same official model listing (84
models total, enumerated by task type) has **no video generation category at all** — Text-to-Video
or Image-to-Video is simply absent from Cloudflare Workers AI. This is a real, checked negative
result, not an absence of research: VIDEO_GENERATION currently has zero verified zero-cost-to-IBIS
candidates anywhere. PixVerse and Kling (Phase 1's registry) remain the only video routes, both
requiring prepaid customer credits that don't exist as a real payment flow yet.

**Hugging Face Inference Providers — researched, correctly not a free route.** Fetched
`huggingface.co/docs/api-inference/main/en/pricing` (via search summary of the official page).
It's explicitly a **paid product**: free-tier users get under $0.10/month in credits, and HF
states plainly it passes through the underlying provider's own rates with no markup — meaning
once the trivial free credit is gone, every call bills a real third-party provider. This directly
matches the directive's own warning against classifying a "free trial credit" as a zero-cost
route. Not integrated, and shouldn't be without a real payment/credit-purchase decision.

**MUSIC/INSTRUMENTAL generation — confirmed no genuinely free hosted API exists.** Checked
MusicAPI, Suno-API resellers, TemPolor, Mubert, Kie — every one offers free *trial* credits then
pay-as-you-go, which is exactly the pattern the directive says must not be classified as free.
This reinforces rather than changes Phase 1's finding: the only non-customer-funded MUSIC paths
remain the self-host candidates (ACE-Step, Stable Audio 3 — both `WOULD_REQUIRE_IBIS_COMPUTE_
SPEND`, correctly ineligible without real infrastructure spend authorization).

**Stem separation (Demucs, Meta/`facebookresearch/demucs`) — a real Caribbean-relevant candidate
for the "preserve the vocals, replace the beat" workflow the directive's own asset-first routing
examples describe, but its licensing isn't fully clear yet.** The *code* is confirmed MIT
(commercial-use permitted). The *pretrained model weights* — a legally separate question the
directive explicitly warns not to conflate with code license — could not be confirmed from the
repository's own README as carrying the same MIT grant explicitly. Recorded as `license: UNKNOWN`
for the weights specifically, which per the directive's own fail-closed rule ("if license =
UNKNOWN then NOT ELIGIBLE for unrestricted production use") means this is a documented candidate,
not an eligible one, until someone reads the actual `LICENSE` file in the repo (not just the
README) or contacts the maintainers. Also self-hostable only — even once cleared, it would need
real compute, same as ACE-Step/Stable Audio 3.

### What was NOT researched this pass (honest gaps, not silent omissions)

The full granular transform taxonomy the directive requested (LYRICS_TO_SONG vs LYRICS_TO_
INSTRUMENTAL vs SONG_TO_REMIX vs VOCAL_PITCH_CORRECTION vs VIDEO_SCENE_REPLACE vs VIDEO_LIP_SYNC,
etc. — 60+ named transforms) was not individually verified. The capability-level findings above
cover the transforms that matter most for eligibility (can IBIS reach this modality at zero cost
at all), but a real per-transform matrix would need a dedicated, much larger research pass.
Whisper/faster-whisper (SPEECH_TO_TEXT) were already covered in Phase 3's Cloudflare findings
(`whisper`, `whisper-large-v3-turbo` are in the same free Workers AI catalog) but weren't
re-verified here. Caribbean/Creole language resources remain entirely unresearched, as recorded in
Phase 3.

### What was NOT implemented this pass, and why

No registry entries were added or enabled, and no new Supabase function was written. The one
strong, well-evidenced finding (Cloudflare Workers AI's IMAGE lineup) uses the exact same verified
account/cost mechanism already proven for TEXT — registering and wiring it is real, low-risk,
buildable work, but it's implementation, not research, and this response was already large. Flagging
it as the clear next concrete step rather than bundling a second Phase-3-sized implementation into
a Phase-3B-sized research response.

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
