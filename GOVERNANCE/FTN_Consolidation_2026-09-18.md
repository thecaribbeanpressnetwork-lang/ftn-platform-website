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
| Scenario Workspace | Calculators, comparison logic, evidence views, relationship graph | *(not extracted this pass — see Disclosed Limitation below)* | — | FTN ibis (registry-level; real engine wiring not yet built) | — | `/scenario-workspace/` (unchanged, still live) | **PARTIAL** — registry/nav/directory correctly show it as an absorbed ibis capability; the actual calculator/graph code has not yet been ported into an ibis-callable module |
| FTN Learn | Course/training discovery + tutoring | *(not extracted this pass)* | — | FTN ibis (registry-level) | — | `/learn/` (unchanged, still live) | **PARTIAL** — same as above: classification and discoverability are corrected, the discovery listing function itself is not yet wired as a callable ibis capability |
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

## Disclosed Limitation

Scenario Workspace's and Learn's *registry classification, navigation, directory presentation and
ibis "where did X go" honesty* are complete and live-verified. Their actual calculator/
comparison-graph (Scenario Workspace) and course-discovery (Learn) code has **not** been ported
into a real, ibis-callable engine in this pass — porting Fire/DAW/EPK already closed the three
capabilities explicitly named in the mission's own test matrix (music generation, audio processing,
EPK), and time did not allow a fourth and fifth full extraction+integration+live-test cycle at the
same rigor. ibis does not claim to execute these two capabilities inline; it correctly explains
(via the same "where did X go" handler) that they are ibis-associated without overclaiming
execution it cannot yet perform. This is the honest, disclosed state — not silently dropped scope.
