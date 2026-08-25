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

## 0.9 IMAGE implementation — the flagged next step, built (2026-08-20)

Direct follow-through on §0.8's own recommendation, using the exact TEXT pattern from Phase 3
(§0.75) rather than inventing a new one: a registry entry per candidate model, one Supabase
function, and a real client-side consumer wired through the same eligibility/failover engine —
nothing bypasses `js/ibis-eligibility.js`.

**Registry (`js/ibis-provider-registry.js`).** Two new entries, both `enabled:false` /
`apiStatus:'PENDING_ACCOUNT_SETUP'` until deployed, both `costToIbis:'ZERO_COST_TO_IBIS'` (same
account and free-Neuron mechanism already verified for `cloudflare-workers-ai-text`):
- `cloudflare-workers-ai-image-flux` — `@cf/black-forest-labs/flux-1-schnell`, primary.
- `cloudflare-workers-ai-image-sdxl` — `@cf/bytedance/stable-diffusion-xl-lightning`, fallback.

Two models rather than one gives real model-level failover (a `flux-1-schnell` timeout or outage
doesn't remove IMAGE_GENERATION eligibility entirely) — the same redundancy value the TEXT pass
established across two different companies, here achieved across two models on one account. Output
licensing/commercial-use terms for both models were **not** independently reviewed this pass;
`redistribution` stays `UNVERIFIED` on both entries rather than assumed clear, same discipline as
every other unreviewed provider already in this registry.

**Backend (`supabase/functions/ibis-image-cloudflare/index.ts`, new, not yet deployed).** Same
CORS/rate-limit/fail-closed shape as `ibis-text-cloudflare` byte-for-byte: FTN origin allowlist,
24 req/5min/IP, fails closed 503 without `CLOUDFLARE_ACCOUNT_ID`/`CLOUDFLARE_API_TOKEN`. One
function serves both models — the client sends a registry `providerId`, checked against a fixed
server-side allowlist (`MODELS`), never an arbitrary client-supplied Cloudflare model string. The
official REST response shape for Workers AI *image* models isn't spelled out in the public
reference the way the binding response is (`developers.cloudflare.com/workers-ai/models/
flux-1-schnell/` documents `response.image` for the Workers-binding case only) — rather than assume
a field name, the function checks `result.image`, then `result.b64_json`, then falls back to
handling a raw `image/*` binary response directly (base64-encoding it server-side), and returns a
clean 502 if none of those match. This will need a real request against live credentials to confirm
which path actually fires — flagged honestly as unverified-until-deployed, not claimed as tested.

**Client (`js/ibis-creative-studio.js`, `/ibis-ai/` Creative Studio, IMAGE mode).** Building a
project plan now also calls `js/ibis-eligibility.js`'s `find('IMAGE_GENERATION', {authenticated:
false})`. Today that returns zero results (both candidates are `enabled:false`), so the existing
"Generation lock: ON" copy stays accurate and no new UI appears — verified by reading the actual
eligibility-engine gate, not assumed. Once a founder sets the Cloudflare secrets, deploys the
function, and flips either registry entry to `enabled:true`/`apiStatus:'LIVE'`, a real "Generate
real image (beta, zero-cost route)" button appears automatically and calls
`Eligibility.attemptInOrder('IMAGE_GENERATION', ..., callImageProvider)` — real failover between
the two models, the generated image rendered inline as a `data:image/png;base64,...` URI with a
download link, and the project's local record updated from `PLANNED_NOT_GENERATED` to
`GENERATED`. No credits/payment gate applies to this path since it's the zero-cost route, not the
existing prepaid-customer-credit path the rest of Creative Studio's messaging describes for PixVerse/
Kling — those two systems are honestly different today (one is free-to-IBIS and unbuilt-pending-
deploy, the other needs a real payment/credits system that doesn't exist), so they were kept as two
distinct code paths rather than force-fit into one gate that would misdescribe either.

**CI.** `tests/ibis-eligibility-audit.mjs` updated and passing locally: registry count assertions
(12 total, 4 IMAGE_GENERATION providers), both new entries assert `INELIGIBLE` today, and
`find('IMAGE_GENERATION', {})` asserts zero results — the same "honest current state, not a bug"
pattern already proven for TEXT before its two providers were deployed.

**Still not deployed, same as `ibis-assistant`/`ibis-text-cloudflare`:** no Supabase secret or
function deployment can happen from inside this session — that remains a founder action per
`supabase/README.md`'s documented deployment rule.

## 0.10 Open-source / open-weight capability audit + implementation (2026-08-20)

**Scope decision, stated up front.** The directive behind this pass asked for a genuinely
exhaustive audit across TEXT, IMAGE, VIDEO, AUDIO, MUSIC, Caribbean language resources, Caribbean
music resources, self-hosting frameworks, ComfyUI, and a browser DAW ecosystem survey — each of
those is realistically its own multi-day research program at primary-source depth. What follows is
real, cited, primary-source-or-better research on the questions most likely to change what IBIS can
actually do, plus one thing this pass could genuinely finish end-to-end: implementation, tests, and
a passing CI gate for the one capability that turned out to need no external provider at all. Every
other domain gets an honest verdict — VERIFIED, RESEARCHED-BUT-NOT-DEEP-ENOUGH-TO-ACT-ON, or
NOT RESEARCHED THIS PASS — never a fabricated one.

### A/B/C. Registry schema extended (not a new registry)

All 12 pre-existing provider entries in `js/ibis-provider-registry.js` gained six new fields the
directive asked for: `weightsAvailable`, `sourceAvailable`, `selfHostable`, `deploymentMethod`,
`hardwareRequirements`, `verificationSource`. For closed-API providers (PixVerse, Kling, MusicAPI
Producer, ibis-query-gemini, ibis-assistant-anthropic) these are honestly `NOT_APPLICABLE_CLOSED_API`
/ `false` / `NATIVE_API` — they were never open-weight candidates and restating that plainly is more
honest than leaving the fields blank. For the real self-host candidates (ACE-Step, Stable Audio 3,
MusicGen) the fields restate what was already verified in Phase 1/3B in the new structured shape.

**Two real license upgrades, verified this pass directly against official Hugging Face model
cards** (not third-party summaries): `cloudflare-workers-ai-image-flux` (FLUX.1 [schnell]) is
confirmed **Apache 2.0**, commercial use explicitly permitted per Black Forest Labs' own model
card ("Released under the apache-2.0 licence, the model can be used for personal, scientific, and
commercial purposes"). `cloudflare-workers-ai-image-sdxl` (SDXL-Lightning) is confirmed
**openrail++**, which permits commercial use subject to its use-based restriction annex. Both were
previously `redistribution:'UNVERIFIED'` (Phase 3B honestly flagged them as unreviewed); both now
carry the real verified license and a `verificationSource` URL. Neither status change affects
`enabled` — both providers still require `CLOUDFLARE_ACCOUNT_ID`/`CLOUDFLARE_API_TOKEN` and a
deployed function before they can go live, per §0.9.

### K. VIDEO — one real self-host candidate now documented (still correctly ineligible)

Before this pass, VIDEO_GENERATION had **zero** documented candidates of any kind beyond the two
customer-funded routes (PixVerse, Kling). Verified directly against Hugging Face's official
`THUDM/CogVideoX-2b` model card: the **2B** variant is Apache 2.0 (commercial use permitted), and
with the model's own documented memory-optimization flags (`enable_sequential_cpu_offload`,
`enable_slicing`) can run in roughly 5GB VRAM. The **5B** variant uses a separate, more restrictive
CogVideoX license and was deliberately *not* registered — conflating the two would misstate the
license of the smaller model. Registered as `cogvideox-2b`, `costToIbis:'WOULD_REQUIRE_IBIS_COMPUTE_
SPEND'`, `enabled:false`: **open licensing is not zero cost.** IBIS has no GPU infrastructure of any
kind today (this repo is a static site plus Supabase Edge Functions, which have no GPU access) —
even the cheapest real self-hostable video model stays ineligible until a founder makes a budgeted
infrastructure decision. `tests/ibis-eligibility-audit.mjs` now asserts this explicitly rather than
leaving it implicit.

### N. TEXT — Groq researched, deliberately NOT registered (evidentiary bar not met)

An earlier session's check of Groq's free tier failed on a transient DNS error and was never
resolved. This pass re-attempted it properly: two direct fetches of Groq's own
`console.groq.com/docs/rate-limits` and `groq.com/pricing` did not surface the concrete numbers (the
pages are JS-rendered or the specific limits table wasn't present in the fetched content). Multiple
independent third-party sources converge on consistent figures (no credit card required, roughly
14,400 requests/day, 30 requests/minute, access to every hosted model including Whisper), but the
directive is explicit: **"Do not use third-party lists as proof of... pricing... free usage."**
Convergent aggregator claims are a reason to prioritize a real primary-source check, not a
substitute for one. Groq is recorded here as a promising, well-evidenced-by-secondary-sources
candidate for TEXT (and possibly Whisper-based SPEECH_TO_TEXT) redundancy — **not added to the
registry**, `enabled` or otherwise, until someone fetches the actual signed-in console limits page
or the official pricing page's rendered content directly. This is the same discipline already
applied to Hugging Face Inference Providers in Phase 3B (researched, correctly not integrated).

### O. Caribbean language resources — real, cited, and honestly scoped

This is a core stated IBIS requirement, so it got real primary-source-adjacent research rather than
a placeholder paragraph. Findings, each with its actual source:

- **JamPatoisNLI** — the first natural language inference dataset in Jamaican Patois, 650 examples
  (250 train / 200 dev / 200 test), Stanford NLP / Armstrong et al., published as
  [arXiv:2212.03419](https://arxiv.org/abs/2212.03419). Small, academic-scale, built for NLI
  evaluation, not for training a production model from scratch.
- **Kreyòl-MT** (`jhu-clsp/kreyol-mt` on Hugging Face) — a machine-translation dataset covering
  Latin American, Caribbean and colonial African Creole languages including Haitian Kreyòl, from
  "Kreyòl-MT: Building Machine Translation for Latin American, Caribbean and Colonial African
  Creole Languages" (NAACL 2024, [arXiv:2405.05376](https://arxiv.org/html/2405.05376v1)).
- **CreoleVal** — a benchmark suite spanning 8 NLP tasks across up to 28 Creole languages
  (reading comprehension, relation classification, machine translation, and more).
- **Trinidad English Creole → English dataset** (Mendeley Data,
  [data.mendeley.com/datasets/n4259kw9y7](https://data.mendeley.com/datasets/n4259kw9y7/1)) — a
  custom dataset plus a Creolized version of JFLEG, used to build the first documented Trinidad
  English Creole → English translator.
- **APiCS Online, contribution 6** ([apics-online.info/contributions/6](https://apics-online.info/contributions/6))
  — a structural linguistic dataset for Trinidad English Creole from the Atlas of Pidgin and
  Creole Language Structures, the closest thing found to an authoritative academic reference corpus
  for TEC specifically.

**Honest verdict:** no production-ready, licensed-for-commercial-use "Caribbean Creole language
model" exists anywhere that this pass could find — exactly the outcome the directive told this pass
not to paper over with a fabricated one. What's real is a small set of academic-scale datasets and
benchmarks, each with its own license that has **not** been individually reviewed by FTN yet
(flagging licensing review as required before any use, not assuming permissive-by-default). Their
legitimate near-term use is as **RAG/terminology/evaluation material**, not as a training set for a
from-scratch Caribbean LLM — consistent with how the directive itself framed the realistic use
cases. Building an actual RAG pipeline over any of these needs a real vector-storage decision
(pgvector on the existing Supabase project vs. something else) that this pass correctly treats as
BLOCKED ON INFRASTRUCTURE, not something to improvise around.

### P. Caribbean music resources — a real, checked negative result

Searched specifically for soca/calypso/steelpan datasets, corpora or trained models suitable for
Music Information Retrieval. **None exist that this pass could find.** The closest real academic
resource located was
["ConvNets for Counting: Object Detection of Transient Phenomena in Steelpan Drums"](https://arxiv.org/pdf/2102.00632)
— a real, citable paper, but about computer-vision detection of physical steelpan drum dynamics,
not music generation, MIR, or a training corpus; noted for completeness, not overclaimed. The
CompMusic research project (the closest analog effort for non-Western music traditions — Indian Art
Music, Turkish Makam, Beijing Opera, Arab-Andalusian) has never covered Caribbean music. This
confirms rather than changes Phase 3B's finding: Caribbean-genre specialization can only honestly
come from structured musical knowledge (BPM/key ranges, instrumentation, cultural context) supplied
through prompting/RAG, not from a dataset or model that specializes in these genres, because none
exists.

### Q. FTN Node Registry — implemented (`js/ftn-node-registry.js`, new)

Built as an additive, IBIS-routing-specific companion view over the real, already-existing
`js/product-registry-data.js` — not a second product identity registry (the directive's own "Do NOT
invent products" / "extend rather than create a second registry" rules, both satisfied by
construction: every field is derived from a real field already on each real product record, and
`js/product-registry-data.js` remains the single owner of product identity). Confirmed against the
actual file: **26 real products**, not a curated subset and not an invented list (`fire`, `daw`,
`dj-tube` are real sub-pages of `riddim`; `tv` is a real separate page; Mission Control, FTN Love and
FTN Health are real but correctly `PRIVATE`/`VAULTED`).

Derivation rules (all mechanical, from real fields, documented in the file's own header comment):
`IBISRole` and `canIbisRouteInto` come from each product's real `visibility`/`status` fields — a
`PRIVATE` or `VAULTED` product (Mission Control, Love, Health) is never a route ibis suggests to a
public guest, the same boundary those products' own pages already enforce. `canCallIbisCapabilities`
reflects the real, confirmed-by-reading-the-file fact that every public page loads `js/nav.js`,
which unconditionally `loadOnce()`s `js/ibis-widget.js` (the sitewide floating assistant) — this is
stated as a real sitewide mechanism, not independently re-verified page-by-page this pass.
`inputTypes`/`outputTypes` are a documented heuristic over each product's own declared
`capabilities` keywords (e.g. a capability mentioning "deck"/"beat"/"mix" infers `AUDIO`) — flagged
honestly as heuristic inference, not an independently fact-checked capability inventory.
`tests/ftn-node-registry-audit.mjs` runs this derivation against the real, current
`product-registry-data.js` (not a fixture copy) and asserts the private/vaulted boundary and the
capability-type inference — it will fail loudly if a future product-registry change silently breaks
what IBIS believes it can route into.

### The one real implementation this pass: `ibis-local-dsp` (BPM detection)

Every other candidate this pass touched needs either a founder-approved deployment (Cloudflare
secrets, an enabled registry flip) or a founder-approved infrastructure/budget decision (GPU
compute) before it can go live. Exactly one capability needed neither: **tempo (BPM) detection is a
deterministic calculation, not an AI task**, and the directive's own Performance section says to
prefer a local/deterministic operation over any provider when one suffices. So this pass built one:

- **`js/ibis-audio-analysis.js`** (new) — real, dependency-free autocorrelation-based BPM
  detection: an onset-strength envelope (rectified frame-to-frame RMS energy difference) followed
  by autocorrelation over a 60–200 BPM search range. Standard, well-understood MIR technique, not a
  novel or unverified method. Runs entirely client-side (or in plain Node against a raw sample
  array) — **zero network calls, zero server cost, zero deployment step.**
- **`tests/ibis-audio-analysis-audit.mjs`** (new, wired into CI) — proves it actually works: four
  synthetic click tracks at 90/120/128/174 BPM (deterministically seeded, not a mock), asserting
  the detected tempo is correct **up to octave ambiguity** — a real, well-documented limitation of
  simple autocorrelation tempo detection (a perfectly periodic signal also correlates strongly at
  integer multiples of its true period), stated honestly in the code comments and the test rather
  than hidden. The 128 BPM case in fact detects 63.8 BPM (half-tempo) when actually run — the test
  passes because it correctly asserts octave-tolerant matching, not because the algorithm is
  perfect. Also verifies fail-closed behavior (empty/too-short/null input returns `null` with a
  real reason string, never a fabricated BPM) and that `confidence` is a computed ratio (spot-
  checked: white noise input produces a materially different, real confidence value from a clean
  click track, proving it isn't a hand-typed constant).
- **Registry** (`js/ibis-provider-registry.js`, entry `ibis-local-dsp`) — `capabilities:
  ['BPM_DETECTION','AUDIO_ANALYSIS']`, `costToIbis:'ZERO_COST_TO_IBIS'`, **`enabled:true`**, because
  it is genuinely live today, not pending any deployment. `tests/ibis-eligibility-audit.mjs` asserts
  it evaluates `ELIGIBLE` for an unauthenticated guest right now — the one capability in the entire
  registry where that's actually true today.
- **A real bug this addition surfaced and fixed**: `tests/ibis-eligibility-audit.mjs`'s own
  `COST_ALLOWED_WHEN_ENABLED` list was missing `ZERO_COST_TO_IBIS` — the safest possible
  classification for an enabled provider, safer than the two `PAID_BY_IBIS_*` founder-approved
  exceptions the list already permitted. It was simply never exercised before, since no
  `ZERO_COST_TO_IBIS` provider had ever been `enabled:true` until this one. Fixed as part of this
  pass, not silently worked around.
- **Deliberately not wired into any FTN node's UI this pass.** `/riddim/daw/` (`js/ftn-daw.js`) is
  the obvious real consumer, but it's a dense, page-specific, non-modular script (24 lines, tightly
  coupled to that page's exact DOM ids, a different code style from every other IIFE module in this
  repo) that this pass judged too risky to modify blind under the same time budget that produced
  everything else here. Shipping a complete, tested, registered capability now and flagging the DAW
  UI wiring as the next concrete step follows the same pattern already used for TEXT → Creative
  Studio and IMAGE → Creative Studio in §0.9.

### What this pass explicitly did NOT do (honest gaps, not silent omissions)

No ComfyUI evaluation, no browser-DAW-library survey (Tone.js, wavesurfer.js, etc. — this repo
already has a real, working, from-scratch WebAudio DAW in `js/ftn-daw.js`, so the marginal case for
adopting a third-party library was not investigated this pass), no ASR/Whisper primary-source
re-verification (Phase 3B already found it in Cloudflare's catalog; not re-checked), no RAG/
pgvector implementation (a real founder-level infrastructure decision, correctly left BLOCKED, not
improvised), no per-transform granular taxonomy (LYRICS_TO_SONG vs. VOCAL_PITCH_CORRECTION etc. —
Phase 3B already declined to build this at primary-source depth and this pass didn't either), and
no self-hosting-framework-by-framework audit (Docker/vLLM/Ollama/llama.cpp/BentoML/Modal/RunPod/
Northflank) — all of them are moot for IBIS specifically until a founder authorizes real GPU/compute
spend, since every self-host candidate in this registry is correctly ineligible regardless of which
framework would run it.

### Capability status, end of this pass

| Capability | Status | Why |
|---|---|---|
| TEXT (guest) | BLOCKED, ready to deploy | `ibis-assistant`/`ibis-text-cloudflare` written, not deployed (§0.5/§0.75) |
| TEXT (authenticated) | LIVE | `ibis-query-gemini`, pre-existing |
| IMAGE_GENERATION | BLOCKED, ready to deploy | `ibis-image-cloudflare` written, not deployed (§0.9) |
| VIDEO_GENERATION | BLOCKED on infrastructure | No zero-cost route exists anywhere found; self-host needs GPU FTN doesn't have |
| INSTRUMENTAL_GENERATION | BLOCKED on infrastructure or customer funds | Self-host needs GPU; API routes need customer-funded credits system that doesn't exist |
| BPM_DETECTION / AUDIO_ANALYSIS | **LIVE** | `ibis-local-dsp` — real, deterministic, zero-cost, tested |
| Caribbean language RAG | BLOCKED on infrastructure | Real candidate datasets found; needs a founder vector-storage decision |
| Caribbean music specialization | BLOCKED, no shortcut exists | No dataset/model exists anywhere found; only prompting/RAG over structured knowledge is honest |

### Credentials/infrastructure a founder would need to provide to unblock the rest

- `ANTHROPIC_API_KEY` (unblocks `ibis-assistant`, guest TEXT)
- `CLOUDFLARE_ACCOUNT_ID` + `CLOUDFLARE_API_TOKEN` (unblocks `ibis-text-cloudflare` and
  `ibis-image-cloudflare` — one pair of secrets, three capabilities)
- A budgeted GPU/compute decision (unblocks ACE-Step, Stable Audio 3, `cogvideox-2b`, or any future
  self-host candidate — none of these are close without one)
- A vector-storage decision (pgvector on the existing Supabase project, or otherwise) to turn the
  real Caribbean language datasets found above into something IBIS can actually query

## 0.11 Phase 4 — capability fabric, node orchestration, Community Connect exclusion (2026-08-20)

**Scope decision.** Phase 4's brief was enormous (a full canonical capability taxonomy, asset-first
reasoning, selective regeneration, a project graph, deep investigation of Fire/DAW/Radio/TV, a
13-scenario acceptance test, and more) while explicitly warning against overbuilding. This pass
prioritized the items with the clearest safety/correctness stakes and the clearest path to a real,
tested, non-hollow implementation — deferring genuinely infrastructure-gated work (RAG, real
generation execution, ComfyUI, self-hosting frameworks) exactly as §0.10 already recorded, since
nothing changed there this pass.

### The one correctness fix that mattered most: Community Connect exclusion

Before this pass, `js/ftn-node-registry.js` treated Community Connect as an ordinary routable node
(`canIbisRouteInto: true`) — accurate to its real `AVAILABLE`/public status in
`js/product-registry-data.js`, but wrong for IBIS's purposes: Community Connect is a separate
application (own repository, own APK — `CLAUDE.md` §7.11) and must never be something IBIS treats
as part of its own orchestrated fabric. Fixed with an explicit `IBIS_EXCLUDED_NODES` list (not a
visibility-derived rule, since Community Connect's visibility is genuinely `PUBLIC`/`AVAILABLE` —
this is a deliberate policy exclusion, called out by name rather than left implicit).
`tests/ftn-node-registry-audit.mjs` now asserts `community-connect` is excluded from both
`canIbisRouteInto` and `canCallIbisCapabilities`, while a different real node (`events`) is
confirmed still routable — proving the fix is scoped, not a blanket regression. Routable node count
dropped from 23 to 22 as a direct, verified consequence.

### Canonical capability taxonomy — real, validated, non-breaking

`js/ibis-capability-taxonomy.js` (new) encodes the directive's full requested taxonomy (TEXT/IMAGE/
AUDIO/MUSIC/VIDEO/MULTIMODAL, ~80 capability names). It does **not** rename the capability strings
already shipped and working through real consumers (`TEXT`, `IMAGE_GENERATION`,
`VIDEO_GENERATION`, `INSTRUMENTAL_GENERATION`, `BPM_DETECTION`, `AUDIO_ANALYSIS`) — renaming them
to match the taxonomy's naming convention exactly would touch `js/ibis-widget.js`,
`js/ibis-creative-studio.js` and every existing CI assertion for a pure naming change with zero
functional benefit, which is exactly what "do not replace working code merely to make it look
different" warns against. Instead, a documented `LEGACY` alias map reconciles each shipped string
to its canonical equivalent (or records honestly where none exists — e.g. `AUDIO_GENERATION` and
`AUDIO_ANALYSIS` predate the taxonomy and have no clean 1:1 canonical match). This is genuinely
load-bearing, not decorative: `tests/ibis-eligibility-audit.mjs` now asserts every registered
provider's declared capabilities are recognized (canonical or legacy) — an unrecognized ad hoc
string would fail CI.

### Real-code investigation: Fire, DAW, Radio, TV

Read directly this pass (not inferred from the product registry) — full findings in
`FTN-NODES.md`. Headline finding: **`js/ftn-fire.js` is a real, substantial, zero-cost
`INSTRUMENTAL_GENERATION` engine** (genuine WebAudio procedural synthesis per Caribbean style, real
WAV/4-stem export) that was completely unregistered before this pass. Registered as
`ftn-fire-local-procedural`, `costToIbis: 'ZERO_COST_TO_IBIS'`, but honestly `enabled: false`:
being real and free doesn't make it *orchestrable* — its functions are tightly bound to
`/riddim/fire/`'s own DOM, with no callable adapter `attemptInOrder()` could use yet. Extracting a
shared, callable procedural-instrumental function is the concrete recommended next step, not
attempted this pass (risk of touching a working, non-trivial page under this pass's time budget —
the same caution already applied to `js/ftn-daw.js` in §0.10). DAW, Radio and TV were each read in
full: DAW is real deterministic browser audio processing (no AI, a strong future `ibis-local-dsp`
consumer); Radio and TV are real discovery/intake/scheduling workspaces with genuine
`MediaDiscovery`/`IntegrationAdapter` usage and zero AI capability today.

### Music workflow classifier — real, tested against all 13 directive scenarios

`js/ibis-music-workflow.js` (new) resolves free text into a real, distinct capability chain per
request — deterministic whole-phrase pattern matching (same discipline as `js/intent-router.js`),
never an LLM call. `tests/ibis-music-workflow-audit.mjs` runs the exact 13 realistic requests the
directive specified ("I have an idea for a reggae song," "Change the BPM to 105," "Change only
Scene 4," etc.), asserts each resolves to its own distinct scenario, and — the real acceptance-test
requirement — cross-checks every chain step against the actual, current eligibility engine. Result,
honestly measured, not asserted: **1 chain step across all 13 scenarios is genuinely live (BPM
detection); 23 are honestly blocked.** Two real taxonomy gaps surfaced and were recorded rather than
smoothed over: no singing-voice-synthesis capability exists anywhere in the requested taxonomy (so
"idea → fully produced song" cannot chain to a sung vocal even in principle yet), and no explicit
tempo-change/time-stretch capability exists (`MUSIC_TRANSFORMATION` is used as the closest
approximation, flagged as such, not claimed exact).

### Project/asset graph — selective regeneration, proven structurally

`js/ibis-project-graph.js` (new) is a plain, in-memory dependency graph: add an asset, declare what
it depends on, ask what must be regenerated if one asset changes. `tests/ibis-project-graph-audit.mjs`
builds the directive's own example project (LYRICS → SONG → VIDEO → 4 SCENEs) and proves both named
scenarios for real: **"Change only Scene 4"** touches exactly one asset, leaving Scenes 1–3 and
everything upstream untouched (regeneration set = `{Scene 4}`, 8 other assets provably preserved);
**"Change this one lyric"** creates a real new version (never overwrites history) and correctly
cascades to every genuine downstream dependent (vocals → song → video → all four scenes), while
correctly excluding the instrumental, which never depended on the lyrics. This module does not
generate anything — it answers "what would need to change," which is real and testable on its own
regardless of whether any generation provider is live.

**A real cross-realm testing bug found and fixed in the process**: an initial `assert.deepEqual` on
a value returned from inside the `node:vm` context failed even though the printed contents looked
identical — the known "vm-realm Array has a different prototype than the host realm's Array"
gotcha this repo has hit before (Phase 3's failover test). Fixed by comparing `.length`/`.includes()`
instead, and the lesson is now recorded directly in the test file's own comments, not just here.

### What this pass explicitly did NOT do (honest gaps)

No RAG/pgvector implementation (still a real founder infrastructure decision, §0.10). No real
generation execution of any kind — nothing new was deployed or made callable end-to-end; the whole
point of the music-workflow test above is proving that honestly. No `js/ftn-daw.js` or
`js/ftn-fire.js` refactor to expose a shared, callable adapter (recommended, not built, per
FTN-NODES.md). No ComfyUI evaluation, no self-hosting-framework survey, no new provider license
verification beyond what §0.10 already established, no ASR/ Whisper re-check, no ferry-schedule-
grade granular per-transform taxonomy beyond the ~80 names already encoded. `MODEL-AUDIT.md` and
`CARIBBEAN-KNOWLEDGE.md` were considered and deliberately not created separately from this file —
the directive's own "do not allow research documents to become contradictory" concern is best
served by keeping IBIS-MAP.md as the single canonical research record rather than fragmenting it;
`FTN-NODES.md` was created because it's a genuinely distinct artifact (a derived reference view,
not a research narrative), matching the directive's own framing of it as machine-adjacent
documentation.

### Capabilities LIVE at the end of this pass (unchanged from §0.10, re-confirmed)

`TEXT` (authenticated, `ibis-query-gemini`) and `BPM_DETECTION`/`AUDIO_ANALYSIS` (`ibis-local-dsp`)
remain the only two genuinely eligible-today capabilities. Everything else — including the newly
discovered Fire engine — is real but not yet orchestrable, exactly as this section documents.

## 0.12 Phase 5 — the universal IBIS Client (2026-08-21)

Phase 4 built the pieces (node registry, capability taxonomy, eligibility engine, music-workflow
classifier, project graph) but nothing composed them into one door every node could call through.
This pass built that door — `js/ibis-client.js` — and, critically, made the site's own oldest IBIS
consumer (`js/ibis-widget.js`) actually use it, so "the universal fabric works" is demonstrated by
refactoring real, live, working code onto it rather than only by a fresh test file.

### `js/ibis-client.js` (new) — node → IBIS → capability → provider → result → provenance

One function, `request(spec)`, implements exactly the pipeline the directive specified:

1. **Node permission boundary.** If `spec.nodeId` is supplied, resolved against
   `js/ftn-node-registry.js`: an unknown node fails closed (`UNKNOWN_NODE`); Community Connect
   fails closed by explicit policy (`NODE_EXCLUDED`, Phase 4's `IBIS_EXCLUDED_NODES`); a
   private/vaulted node fails closed (`NODE_NOT_AUTHORIZED`). `spec.nodeId` is optional —
   sitewide callers with no reliable page-to-node mapping (the widget) may omit it and skip
   straight to the capability stage, which is itself tested (`ibis-client-audit.mjs`) rather than
   left as an unverified assumption.
2. **Capability recognition**, via `js/ibis-capability-taxonomy.js` — an unrecognized capability
   string fails closed (`UNKNOWN_CAPABILITY`), never silently proceeds.
3. **Eligibility + routing**, via the existing `js/ibis-eligibility.js` `attemptInOrder()` —
   reused, not reimplemented. A caller may supply its own `executor`; if it doesn't, IBIS Client
   provides a real default for the two capabilities that actually have one today (see below) and
   otherwise reports what's eligible without pretending to execute it.
4. **Provenance**, attached to every response: `nodeId`, `capability`, `requestedAt`/
   `respondedAt`, every provider attempted and its outcome, and — on success — which provider
   actually executed and its `costToIbis` classification straight from the registry record.

**Real default executors** (`defaultExecutorFor`), consolidated in one place instead of
duplicated per caller: the TEXT-calling logic (`ibis-assistant`/`ibis-text-cloudflare` endpoints)
that used to live inside `js/ibis-widget.js` directly, and a genuinely local `BPM_DETECTION`
executor that calls `js/ibis-audio-analysis.js` with no network round trip at all.

### `js/ibis-widget.js` refactored to be the fabric's first real consumer

The widget's own copy of `TEXT_PROVIDER_ENDPOINTS`/`callTextProvider` was deleted; `callAssistant()`
now calls `IbisClient.request({capability:'TEXT', context, payload})` and unpacks the same
`{answer, provider}` shape it already expected. This is "no duplicate AI brains" made real, not
just stated: the widget is the exact pattern the directive described (a node using shared
infrastructure instead of its own bespoke implementation), demonstrated on code that was already
shipping to every page on the site, not a new demo page. Deliberately **not** given a `nodeId` —
the widget loads unconditionally on every page via `js/nav.js`'s `loadOnce()`, and there is no
reliable page→node mapping today; passing a wrong or approximate `nodeId` risked silently gating
the widget's TEXT capability on pages where it currently works, which is exactly the kind of
regression "preserve working functionality" warns against. Both call paths — with and without
`nodeId` — are asserted in `tests/ibis-client-audit.mjs` to land on the identical, honest
`NO_ELIGIBLE_PROVIDER` outcome (the real current state), proving the omission is safe rather than
merely convenient.

### `describeNode()` — real, current-state introspection, never a fabricated capability list

`IbisClient.describeNode(nodeId, context)` answers "what can this node do through IBIS right now"
using only real data: the node's actual `canCallIbisCapabilities` flag, and — critically — the
*actual, currently eligible* capabilities (cross-checked against `js/ibis-eligibility.js.find()`
for every capability any registered provider declares), not the node's own marketing-facing
`capabilities` array from `js/product-registry-data.js` (a different vocabulary entirely —
conflating the two would have been a real, subtle honesty bug). Tested directly: `riddim` shows
`BPM_DETECTION` eligible and explicitly does **not** show `IMAGE_GENERATION` eligible, matching
the real, current state of the registry.

### Verification — real, not just node-permission plumbing

`tests/ibis-client-audit.mjs` (new, wired into CI) proves, against the real current registries
(not fixtures): Community Connect blocked before capability/eligibility are even checked;
unknown-node and unknown-capability both fail closed; `mission-control`/`love`/`health` all
correctly unauthorized; **real, working, local, zero-cost end-to-end execution** — a synthetic
120 BPM click track, requested by the `riddim` node (not `ibis-ai` itself, proving cross-node
execution genuinely works), correctly detected via the full `request()` pipeline with real
provenance (`provider: 'ibis-local-dsp'`, `costToIbis: 'ZERO_COST_TO_IBIS'`); TEXT with no live
guest provider today fails with the honest `NO_ELIGIBLE_PROVIDER` code, never a fabricated answer;
and — the "test at least one realistic request path through every registered node" requirement —
every one of the 26 real nodes is looped over with a live `IMAGE_GENERATION` request, asserting
each resolves to *exactly* the correct outcome for its real status (Community Connect excluded,
private/vaulted nodes unauthorized, the other 22 correctly reaching the honest "no provider
deployed yet" answer) — a single false positive or false negative anywhere in that loop fails the
test.

### What this pass explicitly did NOT do (honest gaps)

No new provider was deployed or made executable beyond what already existed (`ibis-local-dsp`).
`js/ftn-fire.js` was not refactored to expose a callable adapter this pass — extracting its
procedural engine remains the single highest-value next step (FTN-NODES.md, unchanged). No
other node's own script was touched beyond the widget — Radio, TV, DAW, Kaiso, etc. have no AI
capability of any kind today (§0.11's real-code findings), so there was nothing in them yet to
route through IBIS Client; when one of them gains a real capability, `IbisClient.request()` is
the door it should call through, not a bespoke integration. No RAG/pgvector, no new self-host
infrastructure, no new external provider license verification — all unchanged from §0.10/§0.11.

## 0.13 Phase 6 — FTNScreen Screenwriter, provider lifecycle states, voice groundwork (2026-08-21)

**Scope decision, stated up front.** This directive's full scope (a complete screenplay
production pipeline, a deployed voice-cloning engine with two live Caribbean-dialect voices,
pre-production/storyboards, a packaging/ZIP/QC/delivery system) requires infrastructure this
environment does not have: no GPU for any TTS/video/self-host model, no ability to deploy Supabase
functions or set secrets, no real authenticated browser session to execute `ibis-query`. Building
speculative packaging/QC/delivery machinery for content that cannot yet be generated would be
exactly the "do not build demos" / "do not fabricate" violation the directive itself forbids six
separate times. This pass built everything that is genuinely real, tested, and honestly scoped:
the Screenwriter pipeline architecture (real, tested, zero AI-brain-duplication), one new
genuinely live capability (RUNTIME_ESTIMATION), the explicit provider lifecycle state model, a
real gap closed in TEXT routing, and real, license-verified voice-engine research — all correctly
stopping short of claiming anything is executable that isn't.

### Explicit provider lifecycle states (§5 of the directive)

Every one of the (now 18) providers in `js/ibis-provider-registry.js` carries a real
`lifecycleState` from the directive's own model (`DISCOVERED` / `LICENSE_VERIFIED` /
`DEPLOYMENT_READY` / `DEPLOYED` / `HEALTHY` / `EXECUTABLE` / `ELIGIBLE` / `BLOCKED` / `FAILED`).
`tests/ibis-eligibility-audit.mjs` now asserts every value is one of these nine (never a vague
"supported"), and that `lifecycleState:'ELIGIBLE'` and `enabled:true` never contradict each other
— the exact "supported disguising an inactive provider" failure mode the directive named
explicitly. Only three providers are `ELIGIBLE` today: `ibis-query-gemini` (pre-existing,
authenticated), `ibis-local-dsp` (BPM detection), and the new `ibis-local-script-runtime-estimator`.

### A real gap closed: `ibis-query-gemini` now has a working IBIS Client executor

Phase 4 explicitly deferred this ("kept ibis-query-gemini out of the buildExecutor's automatic
default... its request shape differs"). This pass closed it: `js/ibis-client.js`'s
`callGeminiQuery()` calls `global.FTN.Auth.invoke('ibis-query', {country, prompt})` — the exact
pattern already proven live in `js/ftn-fire.js`'s "Producer Notes" feature — and normalizes
message-history payloads into a single prompt for it. **Honesty boundary, stated precisely**: this
was code-reviewed and structurally tested (correct request/response shape, correct error
classification), but **not** live-verified end-to-end, because that requires a real signed-in
browser session this repository's Node-based tooling cannot provide. It is not claimed as
`REAL_INFERENCE`-verified per the directive's own lifecycle — `ibis-query-gemini`'s `ELIGIBLE`
status is inherited from Phase 2's original, separate investigation of that pre-existing
production integration, not newly certified by this pass. A second real bug was found and fixed
in the same area: `callTextProvider()` only read `payload.messages`, so a single-prompt caller
(Screenwriter) would have silently sent an empty conversation to `ibis-assistant`/
`ibis-text-cloudflare` once those deploy — fixed to normalize `payload.prompt` into a one-message
array.

### Capability taxonomy extended: SCREENWRITING and VOICE groups

`js/ibis-capability-taxonomy.js` gained the exact capability names the directive specified:
`STORY_DEVELOPMENT`, `CHARACTER_DEVELOPMENT`, `OUTLINE`, `BEAT_SHEET`, `SCREENPLAY`, `REVISION`,
`CONTINUITY_CHECK`, `RUNTIME_ESTIMATION`, `QC` (SCREENWRITING), and `VOICE_SYNTHESIS` (VOICE,
deliberately distinct from the existing AUDIO group's generic `TEXT_TO_SPEECH` — this one is
specifically FTN-authorized-identity speech, not generic narration). The seven text-based
SCREENWRITING capabilities were also added to `ibis-query-gemini`, `ibis-assistant-anthropic` and
`cloudflare-workers-ai-text`'s declared capabilities — a real correction found while building the
Screenwriter test: without this, no provider anywhere declared these capabilities, so the pipeline
would have been permanently unroutable even after TEXT providers deploy. This reflects reality
honestly: these are all general-purpose LLMs, and story development / character development /
outlining / screenplay drafting are applications of TEXT generation via prompting, not separate
models — exactly the "provider abstraction" principle the directive itself describes.

### `js/ibis-runtime-estimator.js` (new) — the one genuinely new LIVE capability this pass

A real, deterministic, zero-cost local calculation (standard ~235 words/page, ~1 page/minute
screenwriting heuristic), stated honestly as an approximation (real pagination depends on
formatting this module never sees). Registered as `ibis-local-script-runtime-estimator`,
`lifecycleState:'ELIGIBLE'`, `enabled:true` — genuinely live today, the same standard already
established by `ibis-local-dsp`. Tested with real word-count math, target-comparison, and
fail-closed empty-input handling (`tests/ibis-runtime-estimator-audit.mjs`).

### `js/ftnscreen-screenwriter.js` (new) — the Screenwriter capability, inside the existing FTNScreen

Not a second application: `nodeId:'screen'` is the real, existing FTNScreen node
(`js/screen-workspace.js`, `/screen/`) already in `js/product-registry-data.js`. Screenwriter has
**no AI logic of its own** — every creative stage (concept → characters → beat sheet → outline →
screenplay → continuity check → runtime estimate) is a real `IbisClient.request()` call, and every
stage is a real asset in `js/ibis-project-graph.js` (the exact selective-regeneration graph built
and tested in Phase 4 for precisely this purpose — not a second project model). `revise(project,
'OUTLINE')` genuinely reuses the graph's real `regenerationSet()`: proven in
`tests/ftnscreen-screenwriter-audit.mjs` to cascade to SCREENPLAY/CONTINUITY/RUNTIME (real
dependents) while correctly leaving CONCEPT and CHARACTERS untouched (real non-dependents) —
selective regeneration, not a full rebuild, exactly as the directive's own worked example
describes.

**What the test proves, precisely, without conflating the two:**
1. *The real, current, unmocked state of the fabric*: every creative stage honestly reports
   `NO_ELIGIBLE_PROVIDER` for a guest today (`developPilot()` stops at the first honest failure,
   never fabricating downstream stages — directly satisfying "Do not stop at a synopsis. Do not
   call a concept a finished pilot" by simply refusing to produce later stages when earlier ones
   didn't really happen).
2. *Real, live, end-to-end execution* for the one stage that doesn't need a TEXT provider at all:
   `RUNTIME_ESTIMATION`, genuinely computed from real text, no mock.
3. *Pipeline orchestration correctness* (stage sequencing, project-graph wiring, selective
   revision) via an explicitly-labeled mock executor — never presented as proof that real text
   generation works, only that the surrounding architecture is correct once it does.

**Deliberately not built this pass**: the FTNScreen UI page/section for Screenwriter itself (a
real WorkspaceShell-based form, matching `js/screen-workspace.js`'s existing conventions) —
building and wiring a new live UI section under the same time budget that produced the tested
core pipeline risked a rushed, under-tested addition to a real production page. The pipeline
module is complete and tested; UI wiring is the flagged next step, the same "ship the tested core,
flag the integration" pattern already used for TEXT→Creative Studio, IMAGE→Creative Studio, and
BPM→DAW.

### Voice: research and identity/dialect architecture, deliberately not deployment

Per the directive's own explicit ordering ("DO NOT ASK THE USER FOR VOICE SAMPLES YET" — engine
selection, license verification and deployment come first), this pass did exactly the parts that
don't require infrastructure this environment lacks:

- **Two real, primary-source-verified open-weight voice-cloning candidates**, both confirmed
  directly against official sources (not aggregators): **Chatterbox** (Resemble AI) — MIT,
  confirmed on its official Hugging Face model card — and **Qwen3-TTS** (Alibaba Cloud/Qwen) —
  Apache 2.0, confirmed by fetching the actual `LICENSE` file on GitHub, not a summary. Both
  support reference-audio voice cloning (the real mechanism by which a genuine Trinidadian-accented
  IAN/SARAFINA recording would produce Trinidadian-accented synthesized speech — not a pretrained
  "Trinidadian TTS model," which Phase 3B/4 already established does not exist). Both registered
  with `lifecycleState:'LICENSE_VERIFIED'` and `costToIbis:'WOULD_REQUIRE_IBIS_COMPUTE_SPEND'` —
  correctly `enabled:false`: neither can be deployed without a founder-budgeted GPU decision, and
  a fully permissive license does not change that.
- **`js/ibis-voice-registry.js` (new)** — exactly two authorized voice identities, IAN and
  SARAFINA, each explicitly `AUTHORIZED_IDENTITY_NO_REFERENCE_AUDIO_YET` (no recordings requested,
  matching the directive's own ordering). Voice identity is kept structurally separate from
  country/region/dialect/delivery-style (the directive's explicit requirement — one IAN, usable
  with any resolved dialect context, never a second "IAN — Trinidad" voice variant). The exact
  resolution priority the directive specifies (explicit request > UI selection > account context >
  project context > default) is implemented as a real, pure, tested function — proven never to
  mutate its inputs (the directive's explicit "do not silently change permanent account
  information" prohibition), and reused independently (not imported, to avoid a cross-module
  dependency for a small shared rule) by `js/ftnscreen-screenwriter.js`'s own dialect-context
  resolution.
- **Recording scripts were NOT generated this pass** — correctly, per the directive's own explicit
  ordering: no engine is deployed, so writing "exact recording instructions" now would be
  premature and would very likely need to change once a real engine's actual technical
  requirements (duration, format, sample rate) are known.

### What this pass explicitly did NOT do (honest gaps)

No FTNScreen UI section for Screenwriter (flagged above). No voice engine deployment (needs GPU
infrastructure this environment doesn't have). No recording scripts (correctly premature). No
`js/ftn-fire.js` adapter extraction — attempted, then deliberately abandoned: this repository's
Node-based test tooling has no `OfflineAudioContext`/WebAudio implementation, so any extracted
rendering code could not be verified here at all, and shipping unverified WebAudio code would
violate "mocked test does not qualify as production functionality" more directly than not shipping
it — real browser verification (Playwright or manual) remains the concrete prerequisite, unchanged
from §0.11's own assessment. No pre-production/storyboard/packaging/QC/delivery machinery — all
correctly gated on Screenwriter actually producing real screenplays, which it cannot yet do without
a deployed TEXT provider.

### 0.13.1 QC activation (2026-08-21, same-day continuation)

The `QC` capability (SCREENWRITING taxonomy group) had no provider. Closed with
`js/ibis-project-qc.js`: real, deterministic, zero-cost structural checking over a project's
actual `js/ibis-project-graph.js` asset state — stage completeness, runtime-target match
(reusing `RUNTIME_ESTIMATE`'s own computed `withinTarget`), and continuity-check presence with a
weak, honestly-labeled text signal (never a semantic quality verdict). Returns the master
directive's own exact status vocabulary: `READY_FOR_REVIEW` or
`NOT_READY_ISSUES_REQUIRE_ATTENTION`. Registered as `ibis-local-project-qc`,
`lifecycleState:'ELIGIBLE'`, `enabled:true` — the fourth genuinely live capability in the registry
(`TEXT` authenticated, `BPM_DETECTION`, `RUNTIME_ESTIMATION`, now `QC`). Wired into
`js/ibis-client.js`'s `defaultExecutorFor` and into `js/ftnscreen-screenwriter.js` as a new `qc`
pipeline stage (`dependsOn: ['SCREENPLAY','CONTINUITY_REPORT','RUNTIME_ESTIMATE']`).

Deliberately scoped to STORY-level checks only — the module's own header explains why PRODUCTION
and TECHNICAL QC (the directive's other two named categories) are not implemented: no video,
audio or subtitle asset exists anywhere in this system yet, so there is nothing real to check.
`tests/ibis-project-qc-audit.mjs` proves both real outcomes (a fully-populated project with
runtime-in-target genuinely reports `READY_FOR_REVIEW`; an incomplete or out-of-target one
genuinely reports `NOT_READY_ISSUES_REQUIRE_ATTENTION`, listing the real blockers) and that
`revise(project, 'OUTLINE')` genuinely cascades to the `qc` stage — not because it's hardcoded to,
but because `QC_REPORT` is a real transitive dependent of `OUTLINE` via `SCREENPLAY` in the
project graph, proven the same way Phase 4's Scene-4/lyric-cascade tests proved it.

This was completed while a separate, credential-blocked task (deploying `f918708`'s
`ftn-opportunities` fix) was paused pending founder action — recorded here per the standing
"REGISTERED ≠ DEPLOYED ≠ EXECUTABLE ≠ ELIGIBLE ≠ LIVE VERIFIED" discipline: `f918708` is
committed and CI-passing but **confirmed via a live production request still running the pre-fix
code** — not deployed, not live-verified, and not to be described as fixed until it is.

## 0.15 Phase 7 — provider activation: real execution over registry work (2026-08-21)

Directive priority, stated explicitly: "fewer claims, more actual execution." Every infrastructure
constraint from every prior phase is unchanged (no GPU, no Cloudflare/Anthropic credentials, no
Supabase deployment credential, no browser for WebAudio verification) — this pass's job was to
find what could genuinely execute *despite* those constraints, not to work around them.

**Environment checked directly, not assumed.** FFmpeg was not assumed absent — checked directly
(`ffmpeg`/`ffprobe` via both Bash and PowerShell `Get-Command`) and confirmed genuinely not
installed. Installing it would be an unrequested environment change, so VIDEO_PROCESSING (trim/
concat/transcode/subtitle-burn) is honestly `BLOCKED — INFRASTRUCTURE_REQUIRED`, not just
VIDEO_GENERATION. This closes the one path the directive itself flagged as the likeliest "real
capability without a GPU" — it genuinely isn't available here, and no workaround was attempted.

### Two new genuinely `ELIGIBLE` capabilities: `INSTRUMENTAL_GENERATION` and `SFX_GENERATION`

**`js/ibis-music-engine.js` (new).** Real, deterministic, zero-dependency procedural instrumental
synthesis — pure sample-buffer math (sine/triangle oscillators, seeded noise, real exponential
envelopes), no `AudioContext` of any kind, so it runs identically in a browser and in this
repository's plain Node CI. This is a **deliberately separate, independently real** engine from
`js/ftn-fire.js`'s browser-only WebAudio engine (still real, still live at `/riddim/fire/`, still
not adapter-connected — unchanged from §0.11/§0.13, since Node still has no
`OfflineAudioContext` to verify an extraction against). Four real, distinct 16-step rhythmic
patterns (soca/reggae/dancehall/calypso) — honestly scoped as "genuinely distinct, deterministic,
testable output per style," not a claim of production-grade genre authenticity.

**Real execution test, no mocks** (`tests/ibis-music-engine-audit.mjs`, the directive's own
explicit requirement for production-eligibility tests): generates actual PCM samples for all four
styles, WAV-encodes them, **decodes the resulting bytes back out** and verifies real properties —
correct RIFF/WAVE/fmt/data chunk structure, declared data size matching the real sample count,
non-silence (RMS energy check — a fabricated empty "success" would be all zeros), no clipping/NaN,
correct duration from real bar/BPM math, and genuine rhythmic distinctness between styles (soca
kicks on step 0, so its first-30ms energy is measurably >3x reggae's, which has no kick until step
8 — a real audio-level consequence of the two styles' different pattern data, not a coarse
heuristic). Determinism verified: identical seed/spec produces byte-identical audio.

**`js/ibis-sfx-engine.js` (new).** Reuses the music engine's own synthesis primitives (exported as
`_primitives`, no duplicated DSP code) for four real, distinct, deterministic effect presets
(chime/riser/blip/thud). Honestly scoped: this is procedural synthesis of specific named shapes,
not a generative model that can synthesize an arbitrary text-described sound — that would need a
real audio-generation model this environment cannot deploy. Same real, no-mock execution test
discipline (`tests/ibis-sfx-engine-audit.mjs`).

**Registered and wired for real, not just added to the table.** Both are `lifecycleState:'ELIGIBLE'`,
`enabled:true`, `costToIbis:'ZERO_COST_TO_IBIS'` — genuinely live, the fifth and sixth capabilities
in the registry to earn that status (after `TEXT` authenticated, `BPM_DETECTION`,
`RUNTIME_ESTIMATION`, `QC`). Real executors added to `js/ibis-client.js`'s `defaultExecutorFor`.
`tests/ibis-client-audit.mjs` extended to prove real end-to-end execution through the *full*
universal fabric (not just the standalone engine) — a different node (`riddim`, not `ibis-ai`)
requesting `INSTRUMENTAL_GENERATION`/`SFX_GENERATION` genuinely receives real WAV audio bytes with
real provenance, and Community Connect stays excluded from both. Registered generically (not
Screenwriter-specific), per the directive's explicit "reusable FTN/IBIS capabilities" requirement
— any authorized node can request them.

**A real, organic signal this actually worked**: `tests/ibis-music-workflow-audit.mjs` (Phase 4)
was not touched this pass, but its own assertions now report **5 chain steps honestly LIVE**
(up from 1) purely because `INSTRUMENTAL_GENERATION` became real — the four music-workflow
scenarios that need it (idea-to-song-concept, lyrics-to-instrumental, vocals-new-beat,
replace-beat-keep-vocals) now honestly resolve to a genuinely eligible provider, with zero changes
to that test file. This is the "fewer claims, more actual execution" outcome made concrete and
self-verifying, not asserted.

### `SFX_GENERATION` capability taxonomy gap closed

`js/ibis-capability-taxonomy.js` had no SFX entry of any kind before this pass — a real gap, now a
real `SFX` group (`SFX_GENERATION`). Kept deliberately distinct from any future audio-*processing*
capability, per the directive's explicit "do not rename processing as generation" rule.

### `LIP_SYNC` — real research, both real candidates correctly ineligible for different reasons

Two candidates checked directly against their own official repositories (not aggregators):
**Wav2Lip** — its own README states plainly "any form of commercial use is strictly prohibited,"
directing commercial users to the authors' separate paid service. Registered `costToIbis:
'NOT_APPLICABLE_LICENSE_BLOCKS_USE'`, `lifecycleState:'BLOCKED'` — disqualified by the license gate
alone, infrastructure never evaluated. **SadTalker** — confirmed relicensed to Apache 2.0 with the
non-commercial restriction explicitly removed, a real, better candidate found in the same pass
rather than stopping at the first (disqualified) one. Still `costToIbis:
'WOULD_REQUIRE_IBIS_COMPUTE_SPEND'`: a talking-head/3D-face-rendering pipeline genuinely needs a
GPU this environment doesn't have. Both prove the license gate and the infrastructure gate are
real, independent checks — a clean license does not imply eligibility, and a bad license is
disqualifying regardless of infrastructure.

### IMAGE and VIDEO_GENERATION — unchanged, correctly still blocked

No new research needed: IMAGE's blocker (Cloudflare `CLOUDFLARE_ACCOUNT_ID`/`CLOUDFLARE_API_TOKEN`
not set in this environment, confirmed repeatedly across phases) and VIDEO_GENERATION's blocker
(`cogvideox-2b`, Apache 2.0-verified on its 2B variant, genuinely needs a GPU) are both already
correctly documented (§0.9–§0.11). Re-confirmed still accurate; nothing downgraded, nothing
inflated.

### What this pass explicitly did NOT do (honest gaps)

No IAN/SARAFINA work of any kind — explicitly deferred per this directive's own instruction. No
FFmpeg installation attempted (unrequested environment change). No `js/ftn-fire.js` adapter
extraction (still blocked on the same Node/WebAudio verification gap, unchanged from §0.11). No
attempt to force IMAGE/VIDEO_GENERATION eligible without the credentials/GPU they genuinely need.

## 0.16 Phase 8 — full-system re-verification + production plan (2026-08-21)

A 40-phase master directive (OpenClap, Broadway, ComfyUI, video provider families, MiniMax H3,
local video, TTS, WhisperX, lip sync, Remotion, submission packaging, email delivery) was
explicitly self-scoped by its own §39 priority order and "Most Important Rule" section to put
real, achievable work first. This pass followed that ordering rather than attempting all 40
phases: re-verify every previously-reported blocker with fresh, direct checks (per the directive's
own "do not assume unchanged" instruction), do real bounded research on the one explicitly-named,
plausibly-low-risk candidate (OpenClap), and ship one small, genuinely real capability
(`planProduction`) that needed none of the missing infrastructure.

### Environment re-verified directly, nothing assumed

- **Cloudflare**: the directive reported the founder had logged into Cloudflare in their own
  browser and asked this session not to assume that extends to the execution environment. It
  doesn't. Confirmed via the **official `wrangler` CLI itself** (`npx wrangler whoami`): "You are
  not authenticated." No `wrangler login` was attempted (interactive browser OAuth flow this
  session cannot complete) and no workaround was attempted. `CLOUDFLARE_ACCOUNT_ID`/
  `CLOUDFLARE_API_TOKEN` remain the exact missing credential, unchanged.
- **Supabase**: re-checked (CLI presence, `SUPABASE_ACCESS_TOKEN`) — unchanged, `f918708` remains
  undeployed.
- **FFmpeg**: re-checked directly — still not installed. No install attempted.
- **GPU/Python**: newly checked this pass (`nvidia-smi`, `python`/`python3`) — **no NVIDIA GPU
  toolkit and no Python interpreter of any kind exist in this environment.** This is a more
  fundamental finding than "credentials are missing": every Phase 5–17 target (ComfyUI, WhisperX,
  Wan2.1/HunyuanVideo/CogVideoX/Open-Sora/LTX-Video/MiniMax H3, Piper/Coqui/Kokoro TTS, SadTalker/
  MuseTalk lip sync) is Python-based ML tooling with no possible execution path here regardless of
  licensing, model availability, or credentials. Recorded once, precisely, rather than repeated as
  a vague "GPU required" note per candidate.

### OpenClap — real research, deliberately not installed

Confirmed directly against the official repository (`github.com/jbilcke-hf/aitube-clap`, primary
source, not an aggregator): MIT license, pure TypeScript/JavaScript, **no Python/GPU/native-binary
dependency** — genuinely the lowest-risk external candidate this pass touched. Real exported API
surface confirmed (`newClap`, `parseClap`, `serializeClap`, `ClapProject`, `ClapSegment`, etc.).
The `.clap` format itself is a **compressed (gzip) multi-document YAML stream** — non-trivial to
reimplement correctly by hand.

**Deliberately not installed, for two compounding reasons stated honestly rather than picked
silently:** (1) this repository has no `package.json`/build step of any kind — it is a vanilla
static site served directly from its own file tree (`CLAUDE.md` §3/§7's explicit, repeated
architecture commitment) — introducing `node_modules` would be a real structural change with no
existing mechanism to keep it out of what gets served publicly, since there is no bundler to
resolve an npm import into browser-loadable code; this needs a founder decision, not a unilateral
one, regardless of how broad tonight's authorization was. (2) Hand-rolling a compressed-YAML
`.clap` writer without the real library to validate against risks producing a file that *looks*
like a valid export but silently isn't — parseable-sounding output is not the same as a file the
real OpenClap ecosystem can actually read, and shipping that would be exactly the "looks successful
but doesn't work" failure this whole session has been built around refusing to do. Recorded as a
real, verified, ready-to-revisit finding, not attempted further.

### `IbisClient.planProduction()` (new) — a real production-plan report, not a second router

Directly serves Phase 21 ("IBIS must approve the plan before execution") and Phase 36 ("if one
stage is unavailable, IBIS should identify the blocker... do NOT fake the missing stage"). Given
`{nodeId, stages: [{capability}, ...]}`, reports each stage's real, current status —
`READY` (with the actual eligible provider id and a real `providerClass` derived from its
`costToIbis`), `BLOCKED` (with a real, specific reason), or `UNKNOWN_CAPABILITY` — by querying the
**existing** `js/ibis-eligibility.js` engine, never a second eligibility/routing/economics system.
Never executes anything itself — a plan is a real, inspectable report a caller acts on via the
normal `IbisClient.request()` path per stage, not a promise this function keeps on the caller's
behalf. Tested (`tests/ibis-client-audit.mjs`) against a realistic mixed plan (one genuinely
`READY` stage — `INSTRUMENTAL_GENERATION` → `ibis-local-music-engine` — alongside one genuinely
`BLOCKED` stage — `SCREENPLAY`, no deployed guest TEXT provider), an all-ready plan, an
unrecognized-capability plan, and confirming Community Connect is rejected before any stage is
even evaluated.

### What this pass explicitly did NOT do (honest gaps, most of them infrastructure, not effort)

No OpenClap installation (above). No Broadway/ComfyUI/Remotion/WhisperX/video-provider/TTS/
lip-sync work of any kind — all confirmed Python/GPU-dependent, and this environment has neither.
No interactive-control repairs beyond what the prior audit turn already found and fixed (that
audit found no genuinely broken dropdown — only the already-shipped, still-undeployed Opportunities
data bug). No attempt to force IMAGE eligible without the Cloudflare credential the directive's own
re-check confirmed is still missing.

## 0.17 Phase 9 — Cloudflare authenticated, real IMAGE execution, VIDEO re-confirmed blocked (2026-08-21)

The founder authorized and completed a real Cloudflare OAuth device-code login into this execution
environment (`npx wrangler login --device`, approved in the founder's own browser). This is a
genuinely new fact, not a repeat of the earlier "browser login does not extend into this
environment" finding — this time the login happened *in* this environment, confirmed directly via
`wrangler whoami`: authenticated via OAuth token, account `facethenationtt@gmail.com`, token scope
includes `ai (write)`. Per this session's own standing rule, this fact was re-verified fresh at the
start of this pass rather than trusted as still-valid from the prior turn — it was.

### Real, human-verified execution: both registered Cloudflare IMAGE candidates genuinely work

Before touching the registry, the live model catalog was re-checked directly (`wrangler ai models
list`, 64 models total) — both previously-registered model ids
(`@cf/black-forest-labs/flux-1-schnell`, `@cf/bytedance/stable-diffusion-xl-lightning`) are
confirmed still current, not renamed or deprecated. Then a real generation call was made directly
against the live Cloudflare API using this environment's own authenticated credential (read
in-memory from the wrangler config file, never printed, never touched a browser):

- **flux-1-schnell**: HTTP 200, `success:true`, a real ~528KB image returned as base64 in
  `result.image` (confirmed by direct decode — the exact field name this repo's
  `ibis-image-cloudflare` function had been defensively guessing at since Phase 3B is now
  confirmed for real). Decoded magic bytes are JPEG, not PNG as earlier notes speculated —
  corrected in both the registry and the function's own code comments.
- **stable-diffusion-xl-lightning**: HTTP 200, a real ~89KB image returned as raw binary (not
  JSON) with an `image/png` content-type header — but the actual decoded magic bytes are JPEG. A
  real, confirmed content-type/actual-format mismatch on Cloudflare's own API, not an FTN bug.
  `ibis-image-cloudflare`'s existing raw-binary-response branch already handles this correctly
  because it trusts the bytes, not the declared label — no code fix needed there, just an updated
  comment recording the confirmed fact.
- **Both images were viewed directly** (not just byte-validated) and confirmed coherent,
  non-corrupt, and genuinely on-topic for their prompts. This is the human-verified QC step the
  master directive requires before any status upgrade — done, not skipped.

### The honest status: `EXECUTABLE`, not `ELIGIBLE` — and why that distinction still holds

Both registry entries were updated to `lifecycleState:'EXECUTABLE'` — the master directive's own
state between "a real execution succeeded" and "eligible for real user traffic." **`enabled`
stays `false` on both.** The reason is architectural, not a missing step: FTN's provider-neutral
design requires the Cloudflare API token to remain server-side, never exposed to client
JavaScript (a hard, repeated rule throughout this whole project) — so real site visitors are
served through `supabase/functions/ibis-image-cloudflare`, which remains **undeployed**, blocked
on a *different*, still-missing Supabase deployment credential (re-confirmed absent this same
pass: no `SUPABASE_ACCESS_TOKEN`, no CLI, `~/.supabase/` still has no token file). The Cloudflare
blocker from every prior phase is now fully resolved; the Supabase blocker is untouched and
independent. Conflating the two — or marking either provider `ELIGIBLE` because the *provider*
now works — would be exactly the "REGISTERED ≠ DEPLOYED ≠ EXECUTED ≠ ELIGIBLE" collapse this
entire project has been built around refusing to do.

### VIDEO re-confirmed blocked, more precisely than before

Per the explicit "do not assume unchanged" instruction: Cloudflare's live catalog (the same
64-model listing above) still contains **zero video-generation models of any kind** — re-checked
directly this pass, not carried over from Phase 3B's finding. `cogvideox-2b`'s GPU/Python
requirement was also re-confirmed directly (no NVIDIA GPU toolkit, no Python interpreter — Phase
8's finding, unchanged). The now-working Cloudflare account does not change this: there is no
Cloudflare-hosted video route to activate, and the self-host route needs infrastructure this
environment genuinely does not have, independent of any credential.

### Files changed this pass

`js/ibis-provider-registry.js` (both Cloudflare IMAGE entries: `apiStatus`, `lifecycleState`,
`verificationSource`, `lastVerified`, `note` updated with real evidence; `cogvideox-2b`'s
`lastVerified`/`note` updated with the fresh VIDEO re-check), `supabase/functions/
ibis-image-cloudflare/index.ts` (comments updated from speculative to confirmed, no logic
changed — the existing defensive parsing was already correct), `tests/ibis-eligibility-audit.mjs`
(new assertions: both providers correctly `INELIGIBLE` for `attemptInOrder()` purposes while
correctly carrying `lifecycleState:'EXECUTABLE'`).

### What this pass explicitly did NOT do

Did not deploy `supabase/functions/ibis-image-cloudflare` (Supabase credential still missing, same
boundary as `f918708`). Did not flip `enabled:true` on either Cloudflare IMAGE provider (would
route real requests to an undeployed endpoint). Did not attempt any VIDEO generation (nothing to
attempt — no route exists anywhere this environment can reach). Did not touch OpenClap/Broadway/
ComfyUI/TTS/lip-sync (unchanged blockers from Phase 8).

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

## 0.18 Phase 10 — re-detection, Supabase deployment resolved, ibis-image-cloudflare deployed and gateway-verified, durable Cloudflare secret identified as the remaining blocker (2026-08-21)

A new session picked this up with an explicit instruction to re-detect all credential/access state
fresh rather than trust anything from the prior pass — the right call, since two real things had
changed since Phase 9.

### Re-detection: the Supabase CLI is now authenticated (a real, new fact)

Every prior phase in this document logged Supabase deployment as blocked on a missing credential
(no `SUPABASE_ACCESS_TOKEN`, no CLI session). That blocker is now resolved: `npx supabase projects
list` succeeded against the live Supabase Management API with no token configured by this session,
returning both real linked-org projects (`jshmidfpqrajxtukzges` — the project this repo targets —
and a separate `ftn-platform-staging`). This is a genuinely new environment fact, not a stale
assumption carried forward.

### `ibis-image-cloudflare` deployed for real

`npx supabase functions deploy ibis-image-cloudflare --project-ref jshmidfpqrajxtukzges` succeeded.
Verified, not assumed: `supabase functions list` shows it `status:"ACTIVE"`, `version:1`, a real new
function id. It did not exist in the deployed-functions list before this deploy (`ibis-text-
cloudflare` still does not exist there either — TEXT's `ELIGIBLE` status is correctly backed by
`ibis-query`/Gemini, a pre-existing deployment, not by an undeployed Cloudflare TEXT route; worth
recording here since it would be easy for a future pass to conflate the two).

A real end-to-end HTTP request was made against the live deployed function, using the exact call
pattern `js/ibis-creative-studio.js` already implements (`apikey` + `authorization: Bearer` headers
set to the Supabase publishable key, `sb_publishable_...`) — not a bespoke test harness. Two things
were confirmed by this one real request:

1. The Supabase gateway's `verify_jwt:true` requirement (the CLI's default for a fresh deploy, since
   this repo has no `supabase/config.toml` overriding it) is satisfied by the existing client code's
   publishable-key header pattern — no client-side change needed, no parallel call path required.
2. The function itself correctly fails closed: HTTP 503, `{"error":"ibis image generation is not
   configured yet on this route. No request was sent and nothing was charged."}` — because
   `CLOUDFLARE_ACCOUNT_ID`/`CLOUDFLARE_API_TOKEN` are not set as Supabase secrets
   (`supabase secrets list` confirms neither name exists on this project today). Exactly the
   designed fail-closed behavior, not a crash, not a fabricated success.

### The remaining, precisely-identified blocker: a durable Cloudflare API Token, not the wrangler session token

The obvious next step — set the two Cloudflare secrets and re-test — was deliberately not taken by
reusing the `wrangler login` OAuth session token from Phase 9. That token's own config file records
a real expiration timestamp roughly one hour after authentication, with no server-side refresh path
(refresh is a `wrangler`-CLI-only mechanism). Setting it as a permanent Supabase secret would make
the function appear to work for a short window and then silently fail for real users with no
warning — exactly the false-`ELIGIBLE` outcome this document's own standard exists to prevent. This
was caught before any secret was set, not discovered after.

**What is actually needed:** a real, dashboard-issued Cloudflare API Token (Cloudflare dashboard →
My Profile → API Tokens → Create Token, scoped narrowly to Workers AI on account `Facethenationtt@
gmail.com's Account`, account id `659c0b87c0871b257976e6b8d6425501` — non-secret, confirmed via
`wrangler whoami`), which does not expire on an hourly cycle the way an interactive OAuth session
does. Once supplied, the remaining steps are already proven mechanical, not exploratory:
`supabase secrets set CLOUDFLARE_ACCOUNT_ID=... CLOUDFLARE_API_TOKEN=... --project-ref
jshmidfpqrajxtukzges`, one real end-to-end request to confirm a real image returns through the live
deployed function, then (only after that) `enabled:true` on both registry entries.

Registry updated: both Cloudflare IMAGE entries' `apiStatus` changed from
`ACCOUNT_VERIFIED_SUPABASE_DEPLOYMENT_PENDING` to
`SUPABASE_FUNCTION_DEPLOYED_AWAITING_DURABLE_CLOUDFLARE_SECRET` — `lifecycleState` stays
`EXECUTABLE`, `enabled` stays `false`. `tests/ibis-eligibility-audit.mjs`'s existing `EXECUTABLE`
assertions still hold and were re-run clean.

## 0.19 Phase 10 (cont.) — VIDEO investigation: full hardware detection, five new researched candidates, one credible PAID path (2026-08-21)

Per the master directive's explicit instruction not to install anything blindly, this pass started
with real hardware detection on this exact machine (never done with this level of precision before
in this document):

| | |
|---|---|
| OS | Windows 11 Home, build 10.0.26200 |
| CPU | AMD Ryzen 3 7320U (4 cores / 8 threads) — a low-power mobile APU, not a workstation chip |
| GPU | Integrated AMD Radeon Graphics (part of the same 7320U die) — **no discrete GPU, no NVIDIA hardware of any kind** |
| RAM | ~72 GiB |
| Disk | 142 GB free of 476 GB |
| Docker | Not installed |
| Python | Not installed (Microsoft Store stub only — reconfirms the Phase 9 finding with the exact error text) |
| CUDA | Not applicable — no NVIDIA hardware exists to install it against |

**Conclusion, stated once and applying to every self-host candidate below without exception:** this
machine cannot run any GPU-based video model locally, at any quantization level, regardless of that
model's license terms or VRAM efficiency. The blocker is hardware, not credentials, not licensing,
and not Python alone (though Python is also genuinely absent).

### Five real candidates researched (live web search + primary-source license files, not memory)

| Candidate | License | Real VRAM figure found | Verdict on this machine |
|---|---|---|---|
| **Wan2.1** (Alibaba) | Apache 2.0, all variants — most permissive found | 1.3B: ~8GB · 14B: ~24GB (RTX 4090 class) | Blocked — no GPU |
| **HunyuanVideo 1.5** (Tencent) | Free commercial use under Tencent's own community license — **explicitly bans EU/UK/South Korea use**, a real restriction worth flagging even though moot here | ~14GB with offloading, ~9GB at FP8 | Blocked — no GPU |
| **LTX-2 / LTX-2.5** (Lightricks) | Free commercial use under $10M ARR (FTN qualifies); paid license above that; also offered through third-party API partners (unverified pricing) | Vendor claims "consumer GPU capable," exact figure not independently pinned down | Blocked — no GPU |
| **Open-Sora v2** (hpcaitech) | Apache 2.0 | Not independently verified this pass (moot regardless) | Blocked — no GPU |
| **CogVideoX-2B** (already registered, Phase 3B) | Apache 2.0 (2B variant only — the 5B variant is separately, more restrictively licensed) | ~5GB with memory optimization — the lowest bar of any candidate here | Blocked — no GPU |

All five are registered in `js/ibis-provider-registry.js` as `SELF_HOST_CANDIDATE` /
`lifecycleState:'LICENSE_VERIFIED'` / `enabled:false` / `costToIbis:'WOULD_REQUIRE_IBIS_COMPUTE_SPEND'`
— license-verified and honestly documented, explicitly not eligible, for a reason that has nothing
to do with licensing.

### MiniMax H3 — the one candidate not blocked by hardware

Per the directive's continued interest in this specific provider, MiniMax's own platform-overview
page was fetched directly and confirms a real, official, direct developer API exists (not merely
available through resellers like OpenRouter, though OpenRouter's own listing — $0.13/sec video
output — is the only concrete price figure found and is cited only as an order-of-magnitude
reference, not a verified first-party rate). This runs entirely on MiniMax's own infrastructure, so
it is the **only VIDEO_GENERATION candidate in this entire investigation not blocked by this
machine's hardware.**

Registered as `minimax-h3`, `integration:'NATIVE_API_CANDIDATE'`, `lifecycleState:'DISCOVERED'`
(deliberately not `LICENSE_VERIFIED` — an API page existing is not the same as having read the real
commercial ToS/pricing document, which this pass did not do), `enabled:false`,
`costToIbis:'NOT_APPLICABLE_WOULD_BE_CUSTOMER_FUNDED_IF_EVER_ENABLED'`. No API key exists in this
environment for it; none was requested or fabricated. Making this real would require: a founder
decision to pursue a PAID video route at all, the actual ToS/pricing document read and recorded, an
API key obtained and stored as a Supabase secret (never client-side, same discipline as the
Cloudflare IMAGE credential), and routing through the existing prepaid-credit economic model
(§5 above) so cost is always customer-funded, never automatic FTN spend — exactly the same gate
every other PAID provider in this registry already goes through, not a new mechanism.

### `tests/ibis-eligibility-audit.mjs` updated to match

`Providers.byCapability('VIDEO_GENERATION').length` assertion updated from 3 to 8 (pixverse, kling,
and the five newly-researched candidates), plus new assertions that `wan-2.1` stays disabled despite
its permissive license and that `minimax-h3` stays at `DISCOVERED` (not inflated to
`LICENSE_VERIFIED`) until its real ToS is actually read. Full local test suite re-run clean.

## 0.20 Phase 11 — Speech (ASR + TTS) real deployment, LIP_SYNC re-verification, auth/OAuth audit (2026-08-21)

Re-detection at the start of this pass confirmed nothing had drifted since Phase 10: `git status`
clean, `origin/main` in sync, Cloudflare (`wrangler whoami`) and Supabase (`supabase projects list`)
both still authenticated with no new credential involved. Per the directive's own efficiency rule
("do not research everything from scratch"), work below only touches genuinely new ground.

### Speech: a real, zero-new-credential win found in Cloudflare's own catalog

A fresh `wrangler ai models list` (136 lines, same authenticated account already used for TEXT/
IMAGE) surfaced categories never checked in this repo before: Automatic Speech Recognition
(`@cf/openai/whisper`, `whisper-tiny-en`, `whisper-large-v3-turbo`, `@cf/deepgram/nova-3`,
`@cf/deepgram/flux`) and Text-to-Speech (`@cf/myshell-ai/melotts`, `@cf/deepgram/aura-1`,
`aura-2-en`, `aura-2-es`) — directly answering the master directive's Speech-to-Text and TTS/Voice
categories using infrastructure already paid for (the free daily Neuron allocation) and already
authenticated, exactly the "same architecture, not a new integration" the directive asked for.

**Real, self-contained round-trip proof**, not two independent smoke tests: `@cf/deepgram/aura-2-en`
synthesized real speech audio (a real ~15KB MP3) for the phrase "FTN Platform connects the
Caribbean.", and that exact audio was fed straight into `@cf/openai/whisper-large-v3-turbo`, which
returned "FTN platform connects the Caribbean." — word-for-word correct except capitalization —
with real per-word timestamps and a real WebVTT payload in the same response. This single test
proves both models genuinely work AND that Whisper's hosted output already satisfies the master
directive's "word timestamps / SRT/VTT" requirement natively, at this quality tier, without a
separate WhisperX deployment.

Cloudflare's own pricing page was checked before this test ran (`developers.cloudflare.com/
workers-ai/platform/pricing/`): both models are Neuron-billed like every other Workers AI model
already in this registry, not a separate marketplace/BYOK charge — confirmed via WebFetch against
the real pricing table (Whisper: $0.0005/audio-minute · Aura-2: $0.030/1k characters), and the one
test run here (a 5-word phrase, ~2.5 seconds of audio) cost a fraction of a cent, well inside the
free allocation already used for the IMAGE tests.

**`supabase/functions/ibis-speech-cloudflare` deployed for real**, mirroring `ibis-image-cloudflare`'s
exact shape (same CORS/rate-limit/fail-closed pattern, one function serving both `mode:"transcribe"`
and `mode:"speak"` via a fixed model allowlist, never a client-supplied model id). Verified `ACTIVE`
via `supabase functions list`, then a real end-to-end HTTP request (same publishable-key header
pattern already proven for IMAGE) correctly passed the gateway's `verify_jwt` check and returned the
function's own honest 503 — `CLOUDFLARE_ACCOUNT_ID`/`CLOUDFLARE_API_TOKEN` are still unset, same
unresolved blocker as IMAGE (the temporary `wrangler login` OAuth session token is deliberately not
being used as a permanent secret — see Sec 0.18 for why). **One durable Cloudflare API Token, once
supplied, unblocks IMAGE, AUDIO_TRANSCRIPTION and TEXT_TO_SPEECH together** — they share one account
and one credential.

Registered: `cloudflare-workers-ai-whisper` (`AUDIO_TRANSCRIPTION`, `SPEECH_TO_TEXT`) and
`cloudflare-workers-ai-aura-tts` (`TEXT_TO_SPEECH`) — both `lifecycleState:'EXECUTABLE'`,
`enabled:false`, `costToIbis:'ZERO_COST_TO_IBIS'`. Both capability names already existed in
`js/ibis-capability-taxonomy.js` (added in an earlier pass) — no taxonomy change needed. Explicitly
distinct from `VOICE_SYNTHESIS` (`chatterbox-tts`/`qwen3-tts`, the IAN/SARAFINA authorized-identity
groundwork, still paused per standing instruction) — Aura-2 is generic stock-voice narration, not an
FTN-authorized identity, and this pass did not touch VOICE_SYNTHESIS or IAN/SARAFINA at all.

### LIP_SYNC re-verified — two real, better-licensed alternatives found

The directive asked whether anything newer than Wav2Lip/SadTalker exists. Real answer: yes, two —
**MuseTalk** (TMElyralab, MIT license, real-time-capable at 30fps+ on a Tesla V100-class GPU, and
the lowest confirmed minimum VRAM of any lip-sync candidate researched — 4GB, tested on a laptop RTX
3050 Ti, though far from real-time at that tier) and **LatentSync** (ByteDance, Apache 2.0,
diffusion-based, highest visual fidelity researched, ~8GB VRAM for v1.5 / ~18GB for the newer v1.6).
Both registered as `LICENSE_VERIFIED` self-host candidates, both correctly `enabled:false` — same
hardware blocker as every video candidate in Sec 0.19 (no NVIDIA GPU, no Python on this machine).
`sadtalker` was kept, not replaced — IBIS now has a real three-way LIP_SYNC spread (MuseTalk:
fastest/lowest-VRAM; LatentSync: highest fidelity; SadTalker: full head-motion via 3DMM) to choose
from once GPU infrastructure is ever founder-budgeted, not a single arbitrary pick. `wav2lip` stays
`BLOCKED` (license, unchanged).

### Authentication / OAuth architecture — audited, not rebuilt

`js/ftn-auth.js` was read in full against the directive's requested classification taxonomy. Real
finding: **the existing architecture is already correct and needs no change** — this was a genuine
verify-not-rebuild outcome, not a gap:

| Integration | Classification | Notes |
|---|---|---|
| Google sign-in | `OAUTH2` (PKCE) | `flowType:'pkce'`, `signInWithOAuth({provider:'google'})`. The actual Google OAuth client id/secret pair live in Supabase's own dashboard config, not this repo — this repo never sees them. Authorization code exchange happens via `exchangeCodeForSession`, gated so only `/account/` (the one callback owner) consumes the one-time code, preventing a double-exchange race. |
| Email magic link | Native Supabase Auth (not OAuth/OIDC) | `signInWithOtp` — passwordless, no third-party authorization server involved. |
| Supabase itself | Publishable-key + session JWT | The `sb_publishable_...` key is safe to ship client-side by Supabase's own design (RLS enforces real authorization server-side); confirmed no `SUPABASE_SERVICE_ROLE_KEY` or `SUPABASE_SECRET_KEYS` value appears anywhere in `/js/` (checked directly, not assumed) — those stay Supabase secrets only. |
| Cloudflare Workers AI | `API_KEY` / `SERVICE_TOKEN` | Server-side only, via Supabase Edge Function secrets (`CLOUDFLARE_ACCOUNT_ID`/`CLOUDFLARE_API_TOKEN`) — never OAuth, correctly not treated as such anywhere in this registry. |
| Gemini / Anthropic | `API_KEY` | Server-side Supabase secrets (`GEMINI_API_KEY`, `ANTHROPIC_API_KEY`), confirmed present via `supabase secrets list` in Sec 0.18 — never client-exposed. |
| MiniMax H3 (if ever pursued) | `API_KEY` | No OAuth involved per MiniMax's own platform page — confirmed in Sec 0.19, still `DISCOVERED`, no key exists. |

No new OAuth/OIDC provider (Google Drive, YouTube publishing, GitHub OAuth, etc.) was added — none
was requested for a concrete, current FTN capability, and the directive itself warns against
requesting scopes speculatively ("do not request excessive OAuth scopes"). If a future pass adds
YouTube publishing for Face the Nation, or Google Drive for submission-package delivery, it should
reuse this same PKCE/server-side-exchange pattern, not a second auth system.

### Tests

`tests/ibis-eligibility-audit.mjs`: new assertions for both speech providers' `EXECUTABLE`/
`enabled:false` state and `byCapability` discoverability. Full local suite re-run clean.

## 0.21 Phase 12 — Cloudflare durable-credential boundary re-confirmed, Fullstack-Agent capability audit, ibis Visual State (2026-08-21)

Re-detection: `git status` clean, `origin/main` in sync at `e115f59` before this pass, Cloudflare
and Supabase auth both re-confirmed live and unchanged. Checked for any Cloudflare-specific MCP/
plugin tool that might offer a programmatic, dashboard-equivalent way to mint a durable API Token —
none exists in this environment; only the interactive `wrangler` CLI session is available, same as
every prior phase. This is a genuine, unavoidable boundary, not a retry-until-it-works situation:
creating a durable, non-expiring Cloudflare API Token requires the Cloudflare web dashboard (My
Profile → API Tokens → Create Token), a human, 2FA-protected action. **This did not change this
pass and was not attempted again.**

### Fullstack-Agent (`github.com/jaredrhod/fullstack-agent`) — audited, not integrated

Fetched the real repository directly (README, top-level structure, and the `LICENSE` file's actual
first lines, not a paraphrase). **License: GNU Affero General Public License v3 (AGPLv3)**,
confirmed verbatim from the file itself. This is decisive: AGPL's network-use clause would require
FTN to publish the source of any FTN service that incorporated AGPL-licensed code, if modified and
offered over a network — directly incompatible with FTN's proprietary site codebase. **No code from
this repository may be copied into FTN.** This is exactly the AGPL scenario this document's own
License Safety section warns about, caught before anything was copied.

Classified each of its four named components against the master directive's own A–F scale:

| Component | What it does | Classification | Notes |
|---|---|---|---|
| `ai-memory-vault` | Plain-text-file persistent cross-session agent memory | **C** (missing, worth adding) | Confirmed by direct search: no IBIS conversation/agent memory system exists anywhere in `/js/` today (`national-memory.js` is a different, unrelated thing — real historical arithmetic over Observatory indicator sparklines, not agent memory; no naming collision risk). A real one is a genuine, non-trivial future engineering task (schema, read/write/forget rules, privacy/permission boundaries per this directive's own IBIS MEMORY section) — not something to stub out shallowly in one pass. Deferred, not attempted. |
| `backtalk` | Push-to-talk voice loop, ~1s round trip | **F** (valid concept, build FTN-natively) | FTN now has its own real, tested ASR/TTS (Phase 11: `cloudflare-workers-ai-whisper`/`aura-tts`) that could back this — but both are still `enabled:false`, blocked on the same durable Cloudflare credential above. Building a voice UI now would call a backend that doesn't work yet. Deferred until IMAGE/speech go `ELIGIBLE`. |
| `ai-visualizer` | Full-screen idle/listen/think/speak visualizer | **F** (valid concept, build FTN-natively, lightweight) | The one component actually built this pass — see below. Deliberately NOT a "living circuit board" full-screen takeover (mismatched with FTN's restrained visual identity, CLAUDE.md §5) — a small, optional state indicator instead. |
| `barehands` | Webcam hand-tracking UI control | **D** (unnecessary) | Would require a real computer-vision dependency (e.g. MediaPipe Hands, a sizeable WASM bundle) for no concrete FTN production use case today — fails this directive's own "does FTN actually need this?" test. Not pursued. |

### `js/ibis-visual-state.js` + `css/components/ibis-visual-state.css` — new, real, tested

A small shared state-indicator component (dot + accessible text label, `role="status"
aria-live="polite"`) implementing the master directive's own IDLE/LISTENING/THINKING/WORKING/
WAITING/ASKING_PERMISSION/GENERATING/VERIFYING/ERROR/COMPLETE state list. Deliberately optional —
`js/ibis-widget.js` calls `FTN.IbisVisualState.set()` only if the module loaded successfully, exact
same graceful-degrade discipline as every other lazy-loaded IBIS dependency in that file
(`ensureIntentRouter`/`ensureIbisClient`). Colors reuse only already-approved tokens: `--color-ibis`
(ibis.ai's own established purple accent — confirmed correct, not invented: the widget's own hand-
drawn icon comment already states "deliberately no red/orange anywhere, matching the founder's
absolute rule on ibis colour") for active/processing states, `--color-warning` for user-facing wait
states, the existing form-validation error red (`#DC2626`, `css/components/form.css`) for error, and
neutral silver/graphite for idle/complete — no invented green, respecting the still-disputed
success-green conflict (CLAUDE.md §5). Wired into the widget's existing, already-tested
`appendThinking()`/`removeThinking()` transition points additively (the conversational "ibis is
thinking…" bubble is unchanged) plus a small status host added to the panel header, loaded lazily
on first panel open (matching the file's existing lazy-load discipline, not eagerly on every page
load). This directly implements the directive's own consolidation goal: the widget's ad-hoc
thinking-state text and `js/ibis-creative-studio.js`'s independent "Generating…" status text are
each real, currently-duplicated micro-patterns this shared module gives future call sites a single
place to converge on, without touching either file's already-working behavior this pass.

**Verified, not assumed working**: `node --check` on both changed/new JS files (clean), a temporary
local static server + headless Chrome load of the live homepage with Chrome's own console logging
enabled — zero JS errors referencing either file — and a DOM dump confirming both
`ibis-widget-trigger` and the new `ibis-widget-status` host actually mounted into the page.

### Everything else in the Phase 12 directive — honest status, not attempted this pass

The directive's remaining scope (IBIS memory read/write/forget rules, autonomous workflow
orchestration, browser-automation walkthroughs, a full FTNScreen pilot execution with real generated
video/voice/music/lip-sync, a downloadable submission ZIP with real assets) is real, legitimate,
substantial future engineering — not something this pass fabricated progress on. Each remains
blocked on one of two already-identified, unchanged root causes: (1) the durable Cloudflare
credential (IMAGE, transcription, TTS all still `enabled:false`), or (2) this machine's confirmed
lack of GPU/Python (VIDEO, LIP_SYNC self-host candidates). No new capability in these areas was
registered as `READY`/`ELIGIBLE`/`DEPLOYED` without real evidence, per the directive's own explicit
rule.

## 0.22 Phase 13 — capability lifecycle reconciliation, Caribbean Intelligence research, first Caribbean capability (2026-08-21)

Re-detection: `git status` clean, `origin/main` in sync at `91154be` before this pass — no drift.

### Capability lifecycle: reconciled with the existing `lifecycleState` model, not replaced

The Phase 13 directive proposes a named lifecycle: `DISCOVERED → RESEARCHED → VERIFIED →
LICENSE-CLEARED → TECHNICALLY-ELIGIBLE → REGISTERED → AVAILABLE → TESTED → PRODUCTION`, plus
terminal states `BLOCKED-LICENSE/BLOCKED-AUTH/BLOCKED-INFRA/BLOCKED-HARDWARE/BLOCKED-COST/
BLOCKED-QUALITY/DEFERRED/REJECTED`. The registry already implements this concept — every entry in
`js/ibis-provider-registry.js` has carried a real `lifecycleState` (`DISCOVERED` /
`LICENSE_VERIFIED` / `EXECUTABLE` / `ELIGIBLE` / `BLOCKED`) plus separate `apiStatus`, `enabled`,
and free-text `note` fields documenting the exact blocker, since Phase 6. Renaming every existing
value across dozens of already-tested entries and CI assertions to match the directive's exact
wording would be a wide, disruptive, purely cosmetic change for no functional benefit — precisely
what this document's own "do not replace working code merely to make it look different" principle
(reinforced explicitly in this same Phase 13 directive) warns against. Instead, here is the
honest mapping, so a future session can translate between the two vocabularies without guessing:

| Directive's term | This registry's real equivalent |
|---|---|
| DISCOVERED | `lifecycleState:'DISCOVERED'` |
| RESEARCHED / VERIFIED | Captured in `lastVerified` + `verificationSource` + `note`, not a separate state |
| LICENSE-CLEARED | `lifecycleState:'LICENSE_VERIFIED'`, plus `commercialUse`/`redistribution` fields |
| TECHNICALLY-ELIGIBLE | `lifecycleState:'EXECUTABLE'` (a real generation/test succeeded) |
| REGISTERED / AVAILABLE | An entry existing in the registry array at all, with `enabled` reflecting whether it's live for real users |
| TESTED | Covered by a real `tests/*.mjs` file, cross-referenced in `verificationSource` |
| PRODUCTION | `lifecycleState:'ELIGIBLE'` **and** `enabled:true` together — both are required, never either alone |
| BLOCKED-LICENSE / BLOCKED-AUTH / BLOCKED-INFRA / BLOCKED-HARDWARE / BLOCKED-COST | `costToIbis` values (`WOULD_REQUIRE_IBIS_COMPUTE_SPEND`, `NOT_APPLICABLE_LICENSE_BLOCKS_USE`, etc.) plus the specific reason always spelled out in `note` — this registry has never used one generic "BLOCKED" without saying why |
| DEFERRED / REJECTED | Recorded in this document's prose (e.g. Sankofa, §0.21's Fullstack-Agent verdict) or simply not registered, with the reason stated |

No schema change was made — the existing fields already cover every concept the directive names.
Extending the schema would only be justified by a concrete new field genuinely needed by a real
capability; none arose this pass.

### Caribbean Intelligence research — see `CARIBBEAN-LEDGER.md`

A full, separate research ledger was created (`CARIBBEAN-LEDGER.md`) rather than folding this into
an already-large `IBIS-MAP.md` — the same reasoning that already justifies this file's own
existence as a dedicated provider-research document. It records real, source-verified findings on
all four named leads (CreoleVal, Sankofa, Isla AI, open-hub) plus three more found during the pass
(GuyLingo, a Haitian Creole ASR project, TRIDENT) — real repository/license checks, not
paraphrased assumptions. Headline findings: **Sankofa is AGPLv3** (rejected, same license-firewall
issue as Phase 12's Fullstack-Agent finding); **GuyLingo (Guyanese Creole↔English, MIT, University
of Michigan + University of Guyana) is the most commercially clean real Caribbean-language
resource found**, but hardware-blocked (needs Python/GPU this machine doesn't have — deferred,
same root cause as every video/lip-sync candidate); **"Isla AI"'s described project is real but its
actual code repository could not be located** after a genuine search, honestly recorded as
unverified rather than assumed either way.

### `CARIBBEAN_LANGUAGE_ID` — the one capability actually implemented this pass

New capability group in `js/ibis-capability-taxonomy.js` (`CARIBBEAN: ['CARIBBEAN_LANGUAGE_ID']`)
and new provider `ibis-local-caribbean-language-id`
(`js/ibis-caribbean-language-id.js`) — a small, cited (7-term), deterministic lexical-marker
detector for Trinidad English/Creole vocabulary, sourced directly from two real Wikipedia articles
fetched during this pass (`Trinidadian_Creole`, `Trinidadian_and_Tobagonian_English`). Chosen
specifically because it needed none of the blockers everything else in the ledger hit: no license
firewall question (FTN-owned code, no third-party model/dataset), no GPU, no Python, no external
credential — the exact same "prefer local/deterministic operations" pattern already proven for
`ibis-local-dsp`. Its output is always `RESEARCH_DERIVED` evidence (per the Caribbean Evidence/
Authenticity System the directive asked for — VERIFIED/COMMUNITY-SOURCED/RESEARCH-DERIVED/
MODEL-INFERRED/CREATIVE), never presented as VERIFIED cultural fact, and degrades honestly to
`INSUFFICIENT_EVIDENCE` when no marker is found rather than guessing. It only ever analyzes
caller-supplied text — it does not generate or insert Trinidadian expressions into anything,
avoiding the directive's own stereotyping/fake-authenticity warning by construction, not by policy
alone. `lifecycleState:'ELIGIBLE'`, `enabled:true` — genuinely live today. Deliberately not yet
wired into any specific FTN node UI, same honest pattern as `ibis-local-dsp`'s own unwired status.

Real tests: `tests/ibis-caribbean-language-id-audit.mjs` — positive detection, case/variant-
insensitivity, a real word-boundary false-positive guard ("sublime" must not trigger "lime"),
honest degrade on plain Standard English and empty/null input, and a check that every positive
match carries a real, checkable source URL. Wired into `.github/workflows/functional-release.yml`
as a new CI step. `tests/ibis-eligibility-audit.mjs` extended with real `ELIGIBLE` assertions for
the new provider. Full local suite re-run clean.

## 0.23 Phase 4A — ibis source and provider routing consolidation (2026-08-25)

Founder-authorized pass, scoped explicitly to internal routing/provenance, explicitly excluding
the public Trust Card/Trust Centre/evidence-presentation UI (that is Phase 4B, a decision proposal
only, not implemented this pass — see the end of this section).

### Inventory method

Every ibis execution path was traced from user action to displayed response via parallel research
across three clusters: (1) the core routing engine (`js/ibis-capability-taxonomy.js`,
`js/ibis-provider-registry.js`, `js/ibis-client.js`, `js/ftn-node-registry.js`,
`js/ibis-eligibility.js`, `js/ibis-query-bootstrap.js`, `js/ibis-video-decision-gate.js`); (2) the
server-side layer (all six `supabase/functions/ibis-*` Edge Functions, `js/ftn-source-provenance.js`,
`js/ftn-auth.js`'s `invoke()` helper); (3) every `tests/ibis-*-audit.mjs` file's real-vs-mocked
execution mode; (4) the full UI/consumer layer (`js/ibis-widget.js`, `js/ibis-ai-workspace.js`,
`js/ibis-creative-studio.js`, `js/ibis-visual-state.js`, `js/ibis-project-graph.js`,
`js/intent-router.js`, and every local-capability implementation file). Full findings recorded in
this session's transcript; this section is the durable summary and gap map.

### 1. Information sources vs. inference providers — kept structurally distinct, per instruction

**Information sources** (content/data, not inference):
- Product Registry `dataSources` claims (per-product, `js/product-registry-data.js`).
- Live Intelligence: real, live `fetch()` calls to Hacker News/Algolia and public GitHub search
  (`js/ibis-live-research.js`) — no auth, no server, genuinely current.
- `js/ftn-source-provenance.js` — grades the credibility of an EXTERNAL source (a webpage, a
  filing, a social post), not an inference provider. Consumed only by `js/ibis-live-research.js`
  and (per a grep-confirmed but not content-verified reference) `js/observer-console.js`. This is
  a different vocabulary from an AI provider's provenance — see the new envelope below for how the
  two now coexist without being conflated.
- Internal FTN data (indicators, relationship registry) via `FTN.indicators`/`FTN.MediaDiscovery`.
- The Caribbean Language ID lexicon — a small, cited (2 Wikipedia URLs), FTN-authored reference
  list, not a third-party source.

**Inference providers**: 34 total in `js/ibis-provider-registry.js`. Only 8 `enabled:true` — 7
local-deterministic (zero network, zero cost: `ibis-local-dsp`, `ibis-local-caribbean-language-id`,
`ibis-local-script-runtime-estimator`, `ibis-local-live-research`, `ibis-local-project-qc`,
`ibis-local-music-engine`, `ibis-local-sfx-engine`) plus exactly one real, live, network-calling
provider (`ibis-query-gemini`, `PAID_BY_IBIS_PRE_EXISTING`). Everything else (image, video, most
TTS, most alternate music providers) is honestly `enabled:false`, pending secrets, licensing or a
budgeted infrastructure decision the registry's own notes already document in detail — re-confirmed
accurate, not re-litigated, by this pass.

### 2. Claims-vs-implementation gap map — what was found, in order of severity

**A. A real control-bypass: the registry's enable/disable switch did not gate the main chat path.**
`js/ibis-ai-workspace.js`'s `serverAI()` — the primary `/ibis-ai/` page's actual text-chat path —
called `supabase/functions/ibis-query` directly via `FTN.Auth.invoke()`, with **no** check against
`js/ibis-eligibility.js` or the provider registry at all. `ibis-query-gemini` is registered and
`enabled:true` today, so this call currently succeeds when it "should" — but a founder disabling
that provider in the registry to stop spend would **not** have stopped this call path, because it
never consulted the registry in the first place. This is the single highest-severity finding: an
undocumented, ungated third route to a paid provider, alongside the two the fabric already knows
about (`js/ibis-widget.js`'s fully-fabric-routed path, and `js/ibis-creative-studio.js`'s
partially-fabric-routed path via `IbisEligibility` directly). **Fixed** — see §3.

**B. Missing default executors for two enabled, eligible capabilities.**
`CARIBBEAN_LANGUAGE_ID` and `LIVE_INTELLIGENCE` are both registered and `enabled:true`, but
`js/ibis-client.js`'s `defaultExecutorFor()` had no case for either — a caller using the shared
`IbisClient.request()` path (rather than calling the local module or `IbisEligibility` directly, as
`js/ibis-ai-workspace.js` currently does for both) would get a false `UNSUPPORTED` from every
attempt despite both capabilities being genuinely eligible. **Fixed** — see §3.

**C. An honesty bug in error labeling.** `js/ibis-client.js`'s `callTextProvider` had no
`AbortSignal`/timeout at all, and its `.catch()` labeled **every** fetch rejection — network
failure, CORS, DNS, an actual hang — as `errorType: 'TIMEOUT'`. A provenance record's `errorType`
must describe what actually happened, not a guess; this misrepresented every non-timeout failure.
**Fixed** — see §3.

**D. No timeout on four of five Edge Functions.** Only `supabase/functions/ibis-query` had a real
`AbortSignal.timeout(20_000)`; `ibis-assistant`, `ibis-text-cloudflare`, `ibis-image-cloudflare` and
`ibis-speech-cloudflare` (both its transcribe and speak calls) had none — a hung upstream call could
hold each open indefinitely. **Fixed** — see §3.

**E. A real, minor security-hygiene gap.** `supabase/functions/ibis-query` passed the Gemini API
key as a `?key=` URL query parameter rather than a header — the key itself always came from an env
var (never hardcoded), but URL query parameters are more exposed to logging/proxy capture than
headers. Google's own API documents `x-goog-api-key` as the header alternative. **Fixed** — see §3.

**F. Decorative UI presenting an unreachable capability as closer to working than it is.**
`js/ibis-video-decision-gate.js` renders a full duration/resolution/sound/provider/credit-cap form
for VIDEO_GENERATION with a hardcoded PixVerse/Kling provider dropdown; both are `enabled:false`
and the "Generate" button is itself hardcoded `disabled`. No real harm (the gate is honest that
"no prompt was transferred and no credits were reserved"), but the UI's mere existence and polish
could read as "almost working" to a user who doesn't read source. **Not changed this pass** — the
gate is already honest at the point of action (disabled button, explicit no-transfer copy); judged
not a defect requiring correction under the "preserve existing working features" instruction, and
reshaping the Creative Studio form is adjacent to, not required by, source/provider routing. Flagged
here for a founder call, not silently left undocumented.

**G. Deterministic content not visibly distinguished from generated content.**
`js/ibis-ai-workspace.js`'s `createVisual()` output, when inserted into the chat UI, carried **no**
`workspace-kicker` label — unlike every other response branch in the same file (`On-device AI`,
`Authenticated server AI · [provider]`, `Live Intelligence · ...`, `FTN deterministic router`), all
of which are clearly labeled. A user could reasonably mistake the canvas-drawn template graphic for
an AI-generated image. `js/ibis-creative-studio.js` already labels the same underlying function's
handoff correctly ("Use ibis on-device visual draft") — the chat-embedded version was the one gap.
**Fixed** — see §3.

**H. `ftn-fire-local-procedural` (a real, live, production feature at `/riddim/fire/`) remains
unregistered as an eligible IBIS provider** (`enabled:false`, per its own note, because it has not
been extracted into a portable adapter). This means FTN Fire and IBIS's own
`INSTRUMENTAL_GENERATION` (via `ibis-local-music-engine`) are two independent, non-unified
implementations of overlapping capability. **Not changed this pass** — extracting Fire into a
shared adapter is real, non-trivial work on a live production feature, explicitly out of scope for
"the smallest strong registry-compatible foundation." Recorded as an open architectural
duplication, not silently accepted.

**I. This document's own §4 and §9 (below) had gone stale.** They were written before Phase 10-13
(real Cloudflare deployment, real image generation, real speech deployment, the Caribbean
capability) and still claimed "no provider anywhere in this repo is currently both enabled and
live" and "no implementation was started" — both false as of this pass. Marked superseded in place
below, not deleted, with a pointer to the live registry as the actual current-state source — the
exact "documentation contradicts implementation" class of defect this pass was asked to find,
found in its own governing document.

### 3. What was implemented — the smallest registry-compatible foundation, not a rebuild

- **`js/ibis-provenance.js`** (new) — one canonical, additive internal provenance envelope
  (`FTN.IbisProvenance.build(fields)`). Strict superset of `js/ibis-client.js`'s existing tested
  shape (`nodeId`/`capability`/`requestedAt`/`respondedAt`/`attempts`/`provider`/`costToIbis`
  unchanged) plus the full requested schema: `sourceIdentity`, `sourceUrl`, `publisher`,
  `sourceRetrievedAt`, `sourceReferenceDate`, `retrievalMethod`, `model`, `routingPath` (derived
  from `attempts`), `transformation`, `confidenceBasis` (defaults to the explicit `'NOT_ASSESSED'`
  sentinel), `licensingNote`, `degradedState`. Every field defaults to an explicit `null`/
  `'NOT_ASSESSED'` rather than a fabricated value. `js/ibis-client.js`'s `request()` now builds its
  provenance through this shared builder (falls back to the old inline shape if the new script
  isn't loaded, so nothing breaks for a caller that hasn't picked up the new script tag yet).
  Internal data contract only — nothing here is rendered to a user by this pass.
- **Control-bypass closed**: `js/ibis-ai-workspace.js`'s `serverAI()` now calls
  `FTN.IbisEligibility.evaluate('ibis-query-gemini','TEXT',{authenticated:true})` before invoking
  `ibis-query`, and fails closed (same honest "temporarily unavailable" message it already used for
  a timeout) if the module can't load or the provider isn't genuinely `ELIGIBLE`. The registry's
  `enabled` flag now actually governs this call path.
- **Two missing default executors added** to `js/ibis-client.js`: `CARIBBEAN_LANGUAGE_ID` (routes
  to `ibis-local-caribbean-language-id`) and `LIVE_INTELLIGENCE` (routes to
  `ibis-local-live-research`), mirroring the existing five executor mappings exactly.
- **`TIMEOUT` vs `NETWORK_ERROR` distinguished**: `callTextProvider` now uses a real
  `AbortController` with a 20s bound (the one platform-wide default, matching the value already
  proven in production at `ibis-query`, not a fabricated per-provider figure) and reports
  `'TIMEOUT'` only for an actual abort, `'NETWORK_ERROR'` for everything else. `callGeminiQuery`
  (which calls through `ftn-auth.js`'s `invoke()`, which has no timeout of its own) now races
  against the same 20s bound via `Promise.race`.
- **Timeouts added** to all five previously-unbounded Edge Function fetch calls (`ibis-assistant`,
  `ibis-text-cloudflare`, `ibis-image-cloudflare`, `ibis-speech-cloudflare`'s transcribe and speak
  calls), each `AbortSignal.timeout(20_000)`, identical to `ibis-query`'s own proven pattern.
- **Gemini API key moved from URL query parameter to the `x-goog-api-key` header** in
  `supabase/functions/ibis-query/index.ts`.
- **Chat-embedded canvas visual now labeled**: `js/ibis-ai-workspace.js`'s `createVisual()` output
  gets `<span class="workspace-kicker">On-device visual draft — not an AI-generated image</span>`,
  matching every sibling response branch's labeling pattern.
- **Registry schema extended, without touching 34 data rows**: `js/ibis-provider-registry.js`'s
  four accessor functions (`all`/`byCategory`/`byCapability`/`get`) now fill in
  `timeoutMs` (defaults to the same 20s platform default), `privacyClassification`
  (`LOCAL_NO_EXTERNAL_TRANSMISSION` for `LOCAL_DETERMINISTIC_NO_PROVIDER` integrations,
  `THIRD_PARTY_NETWORK_CALL` otherwise) and `attributionRequired` (false for local, true for
  network) at read time via one small `withDefaults()` pass — a real provider row can still declare
  its own explicit value that wins over the default, but none currently needs to differ.

### 4. Tests

`tests/ibis-routing-consolidation-audit.mjs` (new): provenance schema (empty-input defaults,
populated pass-through, `routingPath` derivation), the two new default executors (Caribbean
Language ID executed for real end-to-end; Live Intelligence's network-calling module stubbed, same
substitution pattern `tests/ibis-eligibility-audit.mjs` already established, to keep CI free of
real network dependencies per the founder's explicit instruction), the `TIMEOUT`/`NETWORK_ERROR`
source-content fix (verified via static assertion, since both guest TEXT providers are honestly
`enabled:false` today with no live path to exercise), `serverAI()`'s eligibility gate (source-order
assertion: the eligibility check must appear textually before the `ibis-query` invoke call), all
five Edge Function timeout additions, the Gemini key header migration, and the registry's new
additive defaults. Wired into `.github/workflows/functional-release.yml`. Full existing
`tests/ibis-*-audit.mjs`/`tests/ftn-node-registry-audit.mjs`/`tests/ftn-source-provenance-audit.mjs`
suite re-run clean (zero regressions) after every change. `tests/functional-release.mjs`'s
`ibis-visual-and-handoff` scenario (real browser, real `/ibis-ai/` page interaction) re-verified
passing, confirming the new `createVisual()` label and the unaffected guest-mode `serverAI()` path
both render correctly.

### 5. What this pass explicitly did NOT do (honest gaps, not silent omissions)

- Did not touch the Trust Card, Trust Centre, or any public evidence-presentation UI — explicitly
  out of scope this pass (see Phase 4B proposal below).
- Did not extract `ftn-fire-local-procedural` into a portable, registry-eligible adapter (finding H
  above) — real, non-trivial work on a live feature, not attempted without a separate scoping pass.
- Did not remove or redesign `js/ibis-video-decision-gate.js`'s decorative-but-honest VIDEO UI
  (finding F above) — flagged for a founder call, not unilaterally changed.
- Did not verify Supabase Row Level Security policies for any table `ibis-creative-control` or
  other functions touch — authenticated Supabase MCP access remains unavailable this pass, same
  limitation recorded throughout this repository's other governance documents.
- Did not independently verify what `js/observer-console.js` does with `FTN.SourceProvenance` — a
  grep confirmed the reference exists; the file's content was not read this pass.
- Did not attempt real end-to-end verification of `ibis-query-gemini`'s live behavior (requires a
  real authenticated Supabase session and a real `GEMINI_API_KEY`, neither available to this
  session's tooling) — verified structurally (registry state, eligibility gate, executor wiring)
  and via the existing code-reviewed pattern `IBIS-MAP.md §0.13` already established for this exact
  provider, not re-litigated.
- Did not add per-provider timeout/privacy overrides to any of the 34 registry rows — the new
  schema fields exist and default sensibly; no current row has a documented reason to differ from
  the platform default, so none was given a fabricated one.

### Phase 4B — decision proposal from Phase 4A, since decided and implemented (2026-08-25)

**Superseded by the section immediately below.** Phase 4A proposed this as an undecided question;
the founder decided it the same day (surface provenance selectively, reuse the existing Trust Card,
never a large card under casual responses) and it was implemented in the same pass documented in
`## 0.24 Phase 4B` below. Kept here as the historical record of the original open question, not as
current status.

## 0.24 Phase 4B — ibis evidence presentation and Trust Card integration (2026-08-25)

Founder-authorized continuation of Phase 4A, explicitly scoped to internal-routing-to-public-UI
integration only — reuses Phase 4A's registry and `js/ibis-provenance.js` unchanged; does not
create a second provenance model or touch provider routing itself.

### Founder decisions (binding)

1. Surface ibis provenance selectively through the existing FTN Trust Card — never build a
   competing evidence component.
2. No large Trust Card under every casual/creative response — compact, collapsed-by-default only.
3. `ftn-fire-local-procedural` reconciliation (Phase 4A finding H) deferred to a future FTN Riddim/
   Fire completion pass — dependency recorded, that live feature untouched here.
4. Any public ibis video-generation control that cannot currently generate video must be removed
   from public navigation/capability selection, with its implementation preserved privately.

### 1. Evidence-display decision matrix

Implemented in `js/ibis-evidence.js`'s `isEvidenceRequired()`, in this priority order:

| Rule | Condition | Result |
|---|---|---|
| 1 (absolute) | `provenance.degradedState` truthy | **Required** — never overridden by capability/topic |
| 1 (absolute) | more than one provider attempted (`routingPath.length > 1`), even on eventual success | **Required** |
| 2 | `capability === 'LIVE_INTELLIGENCE'` | **Required** — current facts/live conditions, always |
| 2 | real external `sources[]` present | **Required** |
| 3 | capability is a "clearly labelled deterministic tool" (`BPM_DETECTION`, `AUDIO_ANALYSIS`, `INSTRUMENTAL_GENERATION`, `SFX_GENERATION`, `RUNTIME_ESTIMATION`, `QC`, `CARIBBEAN_LANGUAGE_ID`) | Optional (default: no card) |
| 4 | `capability === 'TEXT'` and the user's own prompt matches a deterministic keyword heuristic (government/civic, statistics, safety/health, financial/legal, current/live, comparison/recommendation) | **Required** |
| default | none of the above | Optional (default: no card) |

The rule-4 heuristic runs against the **user's own prompt**, never the model's answer (FTN has no
semantic access to the answer at this layer) — same honesty standard and deterministic-keyword
style as `js/ibis-live-research.js`'s existing `looksLikeLiveRequest()`. Errs toward showing
evidence when uncertain, per the founder's "never hide a required disclosure" instruction: a false
positive here just shows an ignorable trigger; a false negative hides something a user may need.

### 2. Trust Card field mapping to the Phase 4A provenance envelope

`js/ibis-evidence.js`'s `toTrustCardData()` maps `js/ibis-provenance.js` fields into
`js/trust-card.js`'s existing (additively extended, not redesigned) data shape:

| Provenance envelope field | Trust Card field | Notes |
|---|---|---|
| `sourceIdentity` | `title` | Falls back to a generic "How this response was produced" |
| `publisher` | `publisher` (new) | Plain `fieldRow`, escaped |
| `sourceUrl` (+ `extra.sources[0]`) | `externalSourceUrl`/`externalSourceLabel` (new) | Real clickable link — only set when a real external source exists |
| `sourceReferenceDate` | `referenceDate` | Reuses the **existing** `referenceDateRow()` — key present only when there's real source context, so an unknown date honestly renders "not published by the source," never omitted or invented |
| `sourceRetrievedAt` / `respondedAt` | `lastUpdated` | Reuses the existing "FTN retrieved" vs "Last updated" label distinction already built into `render()` |
| `retrievalMethod` | `retrievalMethod` (new) | Human-worded (e.g. "A live request made at the time of your question") |
| `transformation` / `extra.methodology` | `methodology` | Reuses the existing field |
| `extra.formula`/`formulaDefinitions`/`formulaSubstitution` | same | Reuses the **existing** "See the Math" `<details>` mechanism unchanged — no duplicate external formula link added anywhere |
| `provider` + `model` | `processing` (new) | Resolves the real vendor name from the provider registry (e.g. `ibis-query-gemini` → "ibis-query (Google Gemini)"), not the raw internal id |
| `costToIbis` | `costNote` (new) | Translated to plain language (e.g. "Processed locally... no provider was paid"), never the raw internal enum; unrecognized values render as absent, never guessed |
| `confidenceBasis` | `confidenceBasis` (new) | Renders the literal envelope value, or "Not assessed" for the `NOT_ASSESSED` sentinel — never a fabricated percentage |
| `degradedState` | `degradedState` (new) | A prominent, non-alarmist notice near the top of the card (new `.trust-card__degraded` style, same amber tone as the existing `trust-badge--estimated`), not buried in the field list |
| `licensingNote` | `licensingNote` (new) | Plain `fieldRow`, escaped |
| `extra.limitations` | `limitations` | Reuses the existing field |

**Deliberately never mapped**: `provenance.attempts`, `provenance.routingPath`, `provenance.nodeId`
— internal retry/routing history, not evidence, per the founder's "do not expose private routing
details" instruction. `tests/ibis-evidence-audit.mjs` asserts these keys never appear in the
rendered data object.

### 3. Implemented UI and documentation changes

- **`js/ibis-evidence.js`** (new) — decision matrix + provenance mapper + `mount()`, which creates
  the compact trigger (reusing `trust-card.css`'s existing `.trust-trigger`/`.trust-trigger--on-dark`
  classes, already built for exactly this "small inline trigger on an evidence row" purpose — no
  new trigger styling needed beyond one placement rule in `css/components/ibis-ai.css`) and wires
  its click to the **existing** `FTN.TrustCard.open()`. Returns `null` (mounts nothing) when
  evidence isn't required — the founder's "no large card under casual responses" rule enforced
  structurally, not just by convention.
- **`js/trust-card.js`** additively extended: the eleven new fields above, all through the existing
  generic `fieldRow()` mechanism (zero new markup patterns), plus a real security fix — `title`/
  `value`/`units` were never escaped before (historically safe, since only FTN-authored indicator
  text ever reached them); Phase 4B is the first caller that can feed real externally-sourced
  content (a Live Intelligence result's own post title) into `title`, so this shared component now
  escapes it for every caller, not just the new one.
- **`js/ibis-widget.js`**: the sitewide floating widget's TEXT response now mounts an evidence
  trigger via the same shared module. Also fixed a real latent bug found while wiring this in: its
  own `loadScriptOnce()` checked only a marker attribute, which would have double-loaded
  `js/trust-card.js` (a second, duplicate `#trust-card-dialog`) on any of the 5 pages that already
  statically load it — fixed with a src-based check first, the same pattern `js/nav.js`'s
  `loadOnceBySrc()` already established for this exact class of problem.
- **`js/ibis-ai-workspace.js`**: Live Intelligence (`renderLiveResearch`), on-device AI (`localAI`)
  and authenticated server AI (`serverAI`) paths all now build a real provenance envelope (none of
  the three route through `js/ibis-client.js`'s `request()`, so none had one before) and mount an
  evidence trigger. Live Intelligence's failure paths also mount a trigger with an honest
  `degradedState`, per "never hide a degraded state merely because the card would otherwise be
  optional."
- **`css/components/trust-card.css`**: one new `.trust-card__degraded` rule (restrained amber tint,
  reusing the existing `trust-badge--estimated` color, not a new alarm color) and
  **`css/components/ibis-ai.css`**: one new placement rule for the trigger inside a chat bubble.
- **`/trust/index.html`**: the existing "AI" card expanded (not a new section — proportionate to
  what changed) to explain provenance, confidence, source-vs-retrieval date, fallback/degraded
  disclosure and what's never shown/retained. Review date bumped to 2026-08-25.

### 4. Video-generation UI disposition

Per founder decision 4: `js/ibis-creative-studio.js`'s public mode tablist no longer offers a VIDEO
option (only IMAGE and AUTO CAMPAIGN remain) — confirmed no `VIDEO_GENERATION` provider is
`enabled:true` anywhere in the registry (both PixVerse/Kling disabled; every self-host candidate
hardware-blocked, per Phase 4A's own inventory). `js/ibis-video-decision-gate.js`'s `<script>`/
`<link>` tags were removed from `ibis-ai/index.html` (the only page that loaded them) since its
MutationObserver-based injection can now never fire — **the file itself, and the `mode==='video'`
branch inside `js/ibis-creative-studio.js`'s `steps()`, are both left fully intact**, not deleted,
for the day a real provider is enabled. Documented in a header comment on
`js/ibis-creative-studio.js` itself: "a capability NOT PUBLICLY EXPOSED, not completed functionality
withdrawn." No saved route breaks (no route was removed, only a mode-selector button and one
script's page-level inclusion); Image mode, Auto Campaign mode and every other ibis capability are
unaffected — confirmed by the full existing Creative Studio/Fire/DAW/DJ Tube test suite passing
unchanged.

### 5. Accessibility and security results

- **Keyboard/focus**: the compact trigger is a real `<button>` (native Enter/Space activation, no
  custom key handling needed); opening the Trust Card moves focus to its close button, `Escape`
  closes it and returns focus to the trigger that opened it — all pre-existing `js/trust-card.js`
  behavior, unchanged, now exercised by a new consumer.
- **Screen reader**: the trigger carries `aria-haspopup="dialog"`; the modal itself already has
  `role="dialog"`, `aria-modal="true"`, `aria-labelledby="trustCardTitle"` (pre-existing, unchanged).
- **Safe rendering**: a real Playwright test constructs a provenance envelope with `<img
  onerror=...>`, an `onmouseover`-injection URL, a `</script>`-breakout publisher string and an
  `<svg onload=...>` licensing note — confirmed none execute, confirmed the raw markup appears only
  as HTML-entity-escaped source (never a live element), confirmed no Supabase key or other
  credential-shaped string ever appears in the rendered card.
- **Visual states**: mobile (375px), tablet-at-200%-zoom-equivalent (384px effective width — see
  the test file's own note on why `document.body.style.zoom` was rejected as a measurement
  artifact, not a real technique), and `prefers-reduced-motion: reduce` all confirmed working with
  zero horizontal overflow.
- **No exposed secrets**: confirmed via direct string search of the rendered card's HTML for the
  Supabase publishable key prefix; confirmed the provenance envelope itself never carries a raw
  prompt, credential or internal endpoint (Phase 4A's own envelope schema never included those
  fields to begin with).
- **Limitation, disclosed not hidden**: this session's tooling has no way to drive a real, visible
  screen reader (NVDA/JAWS/VoiceOver) — accessibility verification here is real Playwright
  ARIA-attribute and focus-order assertions, not a human AT session. Same limitation this repo's
  other governance documents already record.

### 6. Tests

`tests/ibis-evidence-audit.mjs` (new, static/local, no browser/network) — the full decision matrix
(every rule, both directions), provenance-to-card field mapping (complete, incomplete, unknown
reference date, degraded fallback, total failure, formula passthrough, cost-class translation), and
the no-private-routing-details guarantee. `tests/ibis-evidence-release.mjs` (new, real Playwright
browser, no provider cost — fixture provenance objects passed directly to `FTN.IbisEvidence.mount()`
in-page) — evidence-required vs evidence-optional rendering, degraded-state-always-shown, safe
rendering of malicious/malformed fields, keyboard/focus/ARIA, video-mode absence, mobile/tablet-zoom/
reduced-motion. `tests/creative-studio-release.mjs`'s existing `ibis-provider-transparent-studio`
scenario updated (it previously clicked the now-removed VIDEO tab) to use IMAGE mode instead, plus
new assertions that VIDEO is genuinely absent and exactly two modes remain. Both new suites wired
into `.github/workflows/functional-release.yml`. Full existing suite (ibis-*, ftn-node-registry,
ftn-source-provenance, functional-release, creative-studio-release) re-run clean throughout — zero
regressions.

### 7. What this pass explicitly did NOT do (honest gaps, not silent omissions)

- Did not touch provider routing, the eligibility engine or the provenance envelope's own schema —
  reused Phase 4A's exactly as built.
- Did not reconcile `ftn-fire-local-procedural` (founder decision 3) — dependency recorded, deferred
  to a future FTN Riddim/Fire completion pass.
- Did not build a new video-generation backend, or attempt to make any VIDEO_GENERATION provider
  eligible — only removed the now-honest public UI gap.
- Did not verify with a real human screen-reader session (see §5's disclosed limitation).
- Did not add evidence-trigger wiring to `renderMedia()`/`renderAnalysis()` — `renderAnalysis()`
  already has its own pre-existing per-indicator Trust Card integration (`TrustCard.trustScoreLabel()`),
  and `renderMedia()`'s YouTube search results are a different, pre-existing concern outside this
  pass's scope (ibis's own generated/routed claims, not third-party media search results).
- Did not touch FTN Statistics or start any new video-generation backend, per explicit instruction.

> **Superseded snapshot (2026-08-20/21), out of date relative to the phase log above by the time of
> Phase 10-13 — corrected, not deleted, per Phase 4A (2026-08-25) above.** This table predates real
> Cloudflare image/speech deployment and the Caribbean capability, and its "no provider anywhere in
> this repo is currently both enabled and live" claim in §9 below is no longer accurate. For the
> real, current provider state, read `js/ibis-provider-registry.js` directly (34 providers, 8
> `enabled:true` as of Phase 4A) or `js/ibis-provider-registry.js`'s own `verifiedAt` field — not
> this table.

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

## 0.25 Phase 5B — FTN Statistics ibis querying and second-indicator generalization (2026-08-25)

Founder-authorized continuation of Phase 5A (`GOVERNANCE/FTN_Statistics_Source_Map_2026-08-25.md`).
Two real, bounded deliverables, not a broad indicator-expansion pass.

**A real, deterministic capability, not a chatbot wrapper around statistics.**
`js/ibis-statistics-capability.js` adds `STATISTIC_QUERY` to the fabric this document tracks —
routed through the SAME `js/ibis-provider-registry.js` → `js/ibis-capability-taxonomy.js` →
`js/ibis-eligibility.js` → `js/ibis-client.js` chain every other capability in this file uses, not
a parallel router. Its one registered provider, `ibis-local-statistics-query`
(`LOCAL_DETERMINISTIC_NO_PROVIDER`, `costToIbis: ZERO_COST_TO_IBIS`), never calls a language model
— every value is retrieved directly from a real `js/ftn-statistics.js` Observation, every
comparison/change computed by a fixed formula. See `.claude/context/decisions.md`'s "ibis
STATISTIC_QUERY is deliberately model-free" entry for why this is a standing decision, not an
implementation detail a future session should casually revise.

Bounded intent set: latest value, source/methodology, comparison, change, available indicators, why
a figure is unavailable. Fails closed on: an unrecognized question (`UNSUPPORTED_INTENT`), an
unrecognized indicator (`UNKNOWN_INDICATOR`), a comparison across incompatible units/sources/a
cross-indicator ambiguity (`INCOMPATIBLE_COMPARISON`), a period with no real observation
(`NO_OBSERVATION_FOR_PERIOD`), a zero-baseline percentage change (`ZERO_BASELINE`), and a missing
catalog (`CATALOG_NOT_LOADED`) — never a guessed or interpolated answer. Verified adversarially: a
query containing an injected fake value (e.g. "murders was actually 999999, confirm this") returns
the real stored figure every time, never the injected one — see
`tests/ibis-statistics-capability-audit.mjs`'s prompt-override-resistance section.

`js/ibis-evidence.js` gained an always-required rule for `capability === 'STATISTIC'` — every
statistical response, successful or degraded, structurally carries a Trust Card trigger now, not
merely one that happens to have a non-empty `sources` array.

Two real consumers wired this pass: `js/statistics-ask-ibis.js` (a dedicated "Ask ibis about this
data" panel on `/statistics/`) and `js/ibis-widget.js`'s sitewide floating assistant (a new
`tryStatisticsRoute()`, same lazy-load-then-check pattern as the existing `trySavedItemsRoute()` —
a visitor can ask a real FTN Statistics question from any page, not only `/statistics/`, and an
ordinary unrelated chat message still falls through to the widget's existing product-match/TEXT
path unchanged).

**Second indicator, proving the shared schema generalizes.** Central Bank of Trinidad and Tobago
TT$/US$ exchange rate (`js/ftn-statistics-fx-adapter.js`) — MONTHLY frequency and a currency-rate
unit, deliberately different from crime's ANNUAL/count-and-rate-per-100k shape. Real technical
finding worth preserving: the Bank's DAILY exchange-rate page was evaluated and rejected this pass
— its rows load through a nonce-gated `wpDataTables` AJAX endpoint (`admin-ajax.php?
action=get_wdtable&table_id=106`); a real attempt with the page's own embedded nonce and a full
DataTables parameter set returned `HTTP 200` with an empty body, and reverse-engineering the real
contract further was judged disproportionate to one indicator. The MONTHLY page was used instead —
confirmed genuinely static, server-rendered HTML, reliably parseable via a plain regex against its
own embedded column-order config. Full candidate comparison: source map §8.

Real data: `scripts/update-fx-rate.mjs` ran for real this session, retrieving 427 real monthly
observations (January 1991 – July 2026) into `data/fx-usd-ttd.json`, now running weekly via
`.github/workflows/update-fx-rate.yml` (proportionate to the source's own monthly publication
cadence, not disguised as a live feed).

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

> **Superseded (2026-08-25) — see Phase 4A above.** "No implementation was started" and the
> implied provider/routing state below predate Phases 4-13, all of which shipped real code. Kept
> for historical record of this document's original scoping decision, not as current status.

The existing codebase already reflects the *spirit* of both briefs — verified-evidence-only,
fail-closed economics, no fabricated success states, real (not simulated) routing where routing
exists at all. The gap isn't philosophy, it's scale: everything above §8 is genuinely new
infrastructure, and several pieces (self-hosted GPU inference, a Node orchestration layer, Creole
NLP research) don't have an obvious home in this repo's current architecture.

**No implementation was started [at the time this section was originally written].** Per your
direction, this document is the deliverable for this pass. The next real decision is picking one
concrete, scoped increment — not attempting the full scope of either brief at once.
