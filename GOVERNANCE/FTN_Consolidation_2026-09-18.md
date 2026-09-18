# FTN Product/Node Consolidation — 2026-09-18

Authorized by Ricardo. Architecture review by ChatGPT (system architect). Implementation by Claude.

## Principle

IBIS = intelligence + orchestration + generative/reasoning workspace.
SHARED ENGINES = deterministic, reusable capabilities (headless, no DOM dependency, callable by
more than one consumer).
SPECIALIZED INTERFACES = kept only where direct manipulation is genuinely better than
conversational interaction.
DATA/SERVICE NODES = authoritative/shared state that ibis (and everything else) consumes but never
owns or replaces.

A prior, partial attempt at this consolidation existed on branch `feat/ftn-product-consolidation`
(65 commits, mostly repeated `sync` re-runs). It correctly identified the registry schema
(`absorbedInto`), the node-registry role (`ABSORBED_CAPABILITY`) and the target navigation shape —
but touched zero lines of actual product code. Adopting it as-is would have made ibis's own
registry *claim* to run FTN Fire/DAW/EPK/Scenario Workspace/Learn with no code behind the claim —
exactly the "falsely claim capability parity" outcome this consolidation is required to avoid. This
pass independently re-derived the classification from the real registry and real product code, then
did the actual extraction and wiring.

## Capability Extraction Register

| OLD PRODUCT | UNIQUE VALUE | REUSABLE MODULE | NEW CAPABILITY | PRIMARY CONSUMER | OTHER POSSIBLE CONSUMERS | LEGACY ROUTE | PARITY STATUS |
|---|---|---|---|---|---|---|---|
| FTN Fire | Caribbean rhythm/bass/harmony/melody procedural generator (soca, power-soca, reggae, dancehall, calypso, chutney, kompa, zouk, island-fusion); WAV/ZIP-stem export | `js/ibis-caribbean-music-engine.js` (headless; `schedule`/`drum`/`tone`/`wav`/`zipStore` ported verbatim, same math) | `MUSIC_GENERATION` | FTN ibis (`js/ibis-absorbed-capabilities.js`) | FTN DJ Tube (future), any future media tool | `/riddim/fire/` (unchanged, still live, rewired to call the shared engine) | **VERIFIED** — live-tested: "Make me a 90 BPM reggae instrumental…" produces a real rendered WAV + stem export in ibis; the Fire page itself re-tested unchanged (draft build, playback, WAV export all pass) |
| FTN DAW | Browser WebAudio DSP chain (highpass/lowshelf/2×peaking/highshelf/lowpass EQ, gain, tempo/playback-rate, spectrum/waveform), WAV + MP3 (lamejs) export | `js/ftn-audio-dsp-engine.js` (headless; `buildFilterChain` unifies what were two independently-hand-built chains — live playback and offline export — into one) | `AUDIO_PROCESSING` | FTN ibis | FTN DJ Tube (future), any future media tool | `/riddim/daw/` (unchanged, still live, rewired to call the shared engine) | **VERIFIED** — live-tested: DAW's own starter groove, live playback (real-time filter chain) and WAV export all re-tested and pass; ibis's "Clean up this audio and export a WAV" correctly triggers an in-chat file-upload + on-device processing flow |
| FTN EPK | Creator metadata/credits/press-links schema, portable JSON export, rights declaration | `js/ftn-epk-schema.js` (headless; `buildRecord`/`validate`/`toPortableJSON`) | `EPK_GENERATION` | FTN ibis | Radio (existing), Screen, Events (already listed as related products) | `/radio/#ftn-epk` (unchanged, still live, rewired to call the shared schema) | **VERIFIED** — live-tested: ibis's inline EPK form builds a real, valid, downloadable JSON record; the Radio page's own EPK builder re-tested and unaffected |
| Scenario Workspace | Weighted-sum comparison/scoring formula (explicitly illustrative, not a calibrated model) | `js/ibis-scenario-engine.js` (headless; `scoreOutcomes` ported verbatim from Scenario Studio's `recompute()`; `compareOptions`/`deltaSummary` generalize the same math to discrete named options, the primitive "compare N strategies" needs) | `SCENARIO_ANALYSIS` / `SCENARIO_COMPARE` | FTN ibis (`js/ibis-absorbed-capabilities.js`) | Any future multi-criteria comparison need | `/scenario-workspace/` (unchanged, still live, rewired to call the shared engine) | **VERIFIED** — live-tested: "Compare three possible strategies…" renders a real 3-option builder, computes a transparent ranked weighted score, and a live weight-slider recompute genuinely changes the ranking (a real wiring bug here — weight sliders read from the wrong DOM scope — was live-caught and fixed during verification, not shipped broken); export-to-JSON confirmed; Scenario Workspace's own native page re-tested unchanged |
| FTN Learn | Real provider/course discovery data (one dated listing + four real Trinidad and Tobago training institutions, honestly labelled where unverified) | `js/ftn-learn-discovery.js` (headless text-match query layer over the SAME `js/learn-data.js`, never duplicated/re-typed) | `COURSE_DISCOVERY` | FTN ibis | — | `/learn/` (unchanged, still live) | **VERIFIED** — live-tested: "Find a real project-management course…" returns real institutions (Lok Jack GSB, YTEPP, UTT) with an honest "FTN indexes providers, not live catalogues" caveat, never a fabricated course. AI tutoring ("Teach me...") deliberately stays fully conversational (unchanged, reaches the existing canonical/serverAI path) — only genuine discovery requests are intercepted |
| FTN Riddim (hub identity) | Cross-links Fire/DAW/DJ Tube/Kaiso | — (this was a landing page, not an engine) | — | FTN ibis (music/creation entry point) | — | `/riddim/` (unchanged, still live; content unchanged this pass — a "now part of ibis" banner is a good follow-up, not done this pass) | **N/A** (no engine to extract; hub identity retired, page kept live) |
| FTN Parliament | Official-source directory, record lookup, broken-source reporting | — (kept as its own vertical, not merged into shared code) | — | FTN Govern | — | `/parliament/` (unchanged, still live) | **N/A** (absorbed as a civic vertical, not a portable engine) |
| FTN TV | Scheduled/on-demand programme guide | — | — | FTN Screen | — | `/tv/` (unchanged, still live) | **N/A** |
| FTN Screen Display Mode | Ambient kiosk/waiting-room screen | — | — | FTN Screen | — | `/display/` (unchanged, still live — **a real, physically-deployed kiosk depends on this exact URL**) | **N/A** |
| FTN Kaiso | Source-backed current-affairs desk | — (editorial identity preserved, not a portable engine) | — | FTN Live | — | `/kaiso/` (unchanged, still live) | **N/A** — brand/editorial identity explicitly preserved, see Brand Equity below |
| FTN Picks | Affiliate/relationship-disclosed recommendations | — | — | FTN Invest-in | — | `/top-picks/` (unchanged, still live) | **N/A** |

## Brand Equity Preserved (not destroyed to reduce registry count)

- **Kaiso** stops being a standalone *software product* but remains a real, named *editorial
  desk* inside FTN Live — its newsroom identity, source-radar and correction workflow are
  unchanged at their own route.
- **Face The Nation** was left untouched — it is a distinct editorial/programme brand, not a
  software capability, and nothing about it needed to move.
- **Riddim** stops being an independent product *shell* but the name/brand is preserved as the
  music-creation entry point's own legacy hub page.

## Explicitly Kept, Not Absorbed

- **FTN DJ Tube** — `SPECIALIZED_INTERFACE`. Live dual-deck performance (cue, loop, crossfade) is
  a direct-manipulation task a conversational interface does not replace. Its `parentProduct`
  changed from `riddim` to `ibis-ai` (Riddim's own identity dissolved), but it was never marked
  `absorbedInto` — it is still a real, routable destination.
- **FTN Statistics** — `DATA_SERVICE`. Explicitly NOT folded into ibis: it is the shared,
  source-verified data foundation FTN Live, ibis and Govern all consume. Folding it into ibis would
  turn a shared foundation into one consumer's private feature.
- **Community Connect, Account, Opportunities, Events, Display Network, Invest, Govern, Screen,
  FTN Live** — all explicitly required to remain distinct nodes per the mission brief; no code
  evidence contradicted that, so none were touched beyond nav/footer placement.

## Closure wave (2026-09-18, same day)

Scenario Workspace and Learn were both brought to VERIFIED parity: real engines extracted
(`js/ibis-scenario-engine.js`, `js/ftn-learn-discovery.js`), wired into
`js/ibis-absorbed-capabilities.js`, live-tested end to end, and their own native pages re-verified
with zero regression. **PARTIAL parity count: 0.** Every absorbed capability with a real underlying
engine (Fire, DAW, EPK, Scenario Workspace, Learn) is now VERIFIED. Parliament/TV/Display/Kaiso/
Riddim-hub/Picks remain N/A (never had a portable engine to extract — absorbed as verticals/brand
identity, not as reusable code, per the register above).

## Final acceptance pass (2026-09-18, closure wave)

**Live 20-query production matrix** — every query run against the deployed `https://ftnplatform.org/ibis-ai/`, in order, 20/20 PASS. Four real production bugs were found, fixed, deployed and re-verified live during this pass (not merely written and assumed correct):

1. **Scenario weight-slider wiring bug** — `renderComparison()` read weight inputs from the wrong DOM scope (a sibling div outside `<form>`), silently defaulting every weight to 1. Fixed by passing the weights container explicitly (`js/ibis-absorbed-capabilities.js`). Confirmed live: changing a weight now changes the ranked total.
2. **FTN identity hallucination** — "What can FTN do?" answered "FTN (Financial Technology Network)..." with no grounding. Fixed with an explicit `FTN_IDENTITY_CORRECTION` in `supabase/functions/ibis-assistant/index.ts`'s system prompt. Re-verified live.
3. **UK Parliament instead of Trinidad and Tobago Parliament** — "Show me Parliament records..." returned `bills.parliament.uk`. Fixed with civic-term disambiguation in `supabase/functions/_shared/ibis-ftn-disambiguation.ts` (5 new unit tests, 11/11 pass). Re-verified live against `ttparliament.org`.
4. **Festival-submission request swallowed by video discovery** — "Find a Caribbean film festival and help me prepare a submission" matched bare "film" and returned a YouTube grid instead of planning help. Fixed with a `wantsFestivalPlanning` exclusion in `js/ibis-ai-workspace.js`. Re-verified live.

A fifth, systemic issue was found and fixed while verifying bug 4: **every static JS asset the site serves carries a 4-hour browser cache** (`Cache-Control: public, max-age=14400, must-revalidate`), and several lazy-loaded script paths inside `js/ibis-ai-workspace.js`/`js/ibis-absorbed-capabilities.js` had no cache-busting version string at all, meaning any future edit to those files would silently fail to reach already-visited browsers for up to 4 hours. Fixed by adding `?v=` version strings to every previously-unversioned lazy-load path, and bumping every changed asset's version tonight (and again for the Directory/homepage-pathways fixes below).

**Capability-routing proof (not just answer quality):** MUSIC_GENERATION, AUDIO_PROCESSING, EPK_GENERATION, SCENARIO_ANALYSIS/COMPARE and COURSE_DISCOVERY were each confirmed to genuinely invoke their shared engine (`ibis-caribbean-music-engine.js`, `ftn-audio-dsp-engine.js`, `ftn-epk-schema.js`, `ibis-scenario-engine.js`, `ftn-learn-discovery.js`) rather than produce a plausible-looking text answer with no execution behind it.

**Release gates run this closure wave** (all against the real registry/live server, not mocked):

| Gate | Result |
|---|---|
| Product Registry audit | PASS (28/28 required products, metadata complete) |
| Node Registry audit | PASS (29 nodes, 14 routable) |
| Nav registry audit | PASS (44/44 targets match config) |
| Footer drift check | **Found real drift on 5 pages** (ibis-ai, scenario-workspace, radio, riddim/fire, riddim/daw — stale footers left over from tonight's edits), fixed via `sync-footer.mjs`, now 46/46 match |
| Sitemap check | PASS (50 URLs, all registry-derivable) |
| CSP source audit | PASS (80 documents, no inline scripts) |
| Service-worker lifecycle + route policy | PASS (9/9 scenarios; policy registry-driven) |
| Broken-link audit | PASS (80 pages, ~5,000 anchors, zero breaks) |
| Performance budgets | PASS (12/12 representative routes) |
| Visual regression | PASS (19/19 flagship surfaces; baselines updated to reflect the sanctioned banner-insertion layout change) |
| Mobile viewport matrix | PASS (13/13 critical surfaces) |
| UX Guardian (rendered-output audit) | 0 real BLOCKER/MAJOR findings — 27 initial MAJOR flags were verified by hand to be heuristic false positives on pre-existing, confirmed-working JS controls (Creative Studio toggle, FTN TV day-selector), not consolidation regressions |
| Functional release (`tests/functional-release.mjs`) | PASS, 61/61 scenarios (3 stale hardcoded assertions updated to reflect intentional consolidation changes: ecosystem-link count 24→14, `/govern/` link count scoped past the new Capabilities section, ibis-ai's intentional dual group placement) |
| `ibis-ux-release` | PASS (stale `revealAnswer` call-site count 6→7, reflecting the new capability router's own render path) |
| Investor readiness (`ibis-investor-readiness.mjs`, 9-gate acceptance runner) | **LOCALLY_VERIFIED**, 0 real FAIL (remaining BLOCKED_EXTERNAL/NOT_RUN items require live infra this environment does not have — a real database, a live search provider — and are honestly classified as such, not claimed as passing) |
| Deno backend suite | PASS, 237/237 |

**Two further real, previously-undiscovered gaps found and fixed during this closure wave's own audit of itself:**

- The FTN Directory (`/applications/`) listed standalone Products but had **no visible Capabilities or Data Services distinction at all** — the 11 absorbed products had silently vanished from Directory with no trace, and FTN Statistics (a Data Service) was visually indistinguishable from an ordinary product. Fixed: `js/product-registry.js` gained `absorbedCapabilities()`/`dataServiceProducts()`; `js/ftn-directory.js` now renders a "Data Services" section and a "Capabilities (absorbed into FTN products)" section on the full Directory page, each capability card honestly labelled `ABSORBED` with a link to its real current home.
- The homepage's primary "What can FTN help you do?" outcome shortcuts (`js/homepage-pathways.js`) hardcoded `id: 'tv'`, `id: 'kaiso'`, `id: 'riddim'` and `id: 'display'` — sending first-time visitors straight to four now-retired standalone identities from the site's own top CTA grid. Fixed: retargeted to `screen`, `ftn-live`, `ibis-ai` (the real current homes); the task each button promises is unchanged.
- Two of the 11 absorbed pages (`/riddim/fire/`, `/riddim/daw/`) had been deliberately excluded from the compatibility-banner pass earlier tonight ("a mid-workflow banner would be more disruptive than useful"). That reasoning did not survive comparison with `/scenario-workspace/`'s own successful banner (an equally tool-like page) — both now carry the same banner.

## Final architecture count

**Registry size is unchanged: 29 entries before, 29 after** — consolidation never deletes a route; it changes discoverability.

| Category | Count | Members |
|---|---|---|
| BRAIN | 1 | ibis-ai |
| CORE_NODE (primary-nav flagships) | 6 | platform-home, govern, screen, ftn-live, opportunities, invest |
| CONSUMER (standalone secondary products) | 5 | facethenation, events, radio, display-network, account |
| SPECIALIZED_INTERFACE | 1 | dj-tube |
| DATA_SERVICE | 1 | statistics |
| PRIVATE | 1 | mission-control |
| VAULTED | 2 | love, health |
| EXCLUDED_SEPARATE_APPLICATION | 1 | community-connect |
| **ABSORBED_CAPABILITY** | **11** | scenario-workspace→ibis-ai, learn→ibis-ai, riddim→ibis-ai, ftn-fire→ibis-ai, daw→ibis-ai, epk→ibis-ai, parliament→govern, tv→screen, display→screen, kaiso→ftn-live, top-picks→invest |

**Live, independently discoverable products after consolidation: 14** (BRAIN + CORE_NODE + CONSUMER + SPECIALIZED_INTERFACE + DATA_SERVICE), down from 25 standalone identities before (29 minus the 4 already-private/vaulted/excluded).

**Shared reusable headless engines built this mission: 5** — `js/ibis-caribbean-music-engine.js`, `js/ftn-audio-dsp-engine.js`, `js/ftn-epk-schema.js`, `js/ibis-scenario-engine.js`, `js/ftn-learn-discovery.js`.

**Absorbed-capability parity: 5 VERIFIED (Fire, DAW, EPK, Scenario Workspace, Learn — each has a real, tested, ibis-callable engine), 6 N/A (Parliament, TV, Display, Kaiso, Riddim-hub, Top Picks — absorbed as discoverability/vertical consolidation into an existing sibling CORE_NODE product, never had a portable computational engine to extract), 0 PARTIAL.**

## Classification

**FTN CONSOLIDATION COMPLETE.**
