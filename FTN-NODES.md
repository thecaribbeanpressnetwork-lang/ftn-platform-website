# FTN Node Capability Map

Generated reference over `js/ftn-node-registry.js`, which derives an IBIS-routing view from the
real, existing `js/product-registry-data.js` — the single source of truth for product identity.
This file does not duplicate that data; it explains it. Re-derive rather than hand-edit if the
underlying product registry changes — `tests/ftn-node-registry-audit.mjs` will fail loudly if the
derivation rules and the real product data drift apart.

**How a node actually reaches IBIS (Phase 5):** `js/ibis-client.js`'s `request({nodeId, capability,
context, payload})` is the one door — it checks this file's permission boundary, validates the
capability against `js/ibis-capability-taxonomy.js`, routes through `js/ibis-eligibility.js`, and
returns a result with provenance or an honest blocked reason. `js/ibis-widget.js` is its first real
consumer (refactored off its own duplicate TEXT-calling logic this pass) — see IBIS-MAP.md §0.12.
`IbisClient.describeNode(nodeId, context)` reports what a node can *actually* reach right now
(cross-checked against live eligibility, not this file's own `primaryCapabilities`, which is a
different, marketing-facing vocabulary inherited from the product registry).

**Absolute scope boundary (Phase 4):** Community Connect is a real, public, `AVAILABLE` product in
`js/product-registry-data.js` (this site markets and links to it), but it is a **separate
application** — its own repository, its own Capacitor/APK build (see `CLAUDE.md` §7.11). It is
explicitly excluded from IBIS routing: `IBISRole: 'EXCLUDED_SEPARATE_APPLICATION'`,
`canIbisRouteInto: false`, `canCallIbisCapabilities: false`. This is enforced in code
(`IBIS_EXCLUDED_NODES` in `js/ftn-node-registry.js`) and tested
(`tests/ftn-node-registry-audit.mjs`), not just documented.

## The brain

| id | role |
|---|---|
| `ibis-ai` | `BRAIN` — the one IBIS orchestration/creative-studio surface |

## Private / vaulted — never routed into

| id | Why |
|---|---|
| `mission-control` | Private institutional infrastructure, not a public product |
| `love` | Vaulted pending a separately approved safety/moderation gate |
| `health` | Vaulted pending a separately approved clinical-governance gate |

## Excluded by explicit policy — never routed into or called

| id | Why |
|---|---|
| `community-connect` | Separate application (own repo, own APK) — see `CLAUDE.md` §7.11 and §2's standing "never modify Community Connect" rule |

## Real FTN web nodes — investigated directly, not guessed

The four nodes the Phase 4 directive specifically asked about, assessed from their actual code
(read directly this pass, not inferred from the product registry):

### FTN Fire (`/riddim/fire/`, `js/ftn-fire.js`, 62 lines)

**Real, substantial, and previously unregistered.** Genuine client-side WebAudio procedural
instrumental synthesis (real kick/snare/hat/bass/harmony/melody scheduling per Caribbean style —
soca, power-soca, reggae, dancehall, calypso, chutney, kompa, zouk, island-fusion), real WAV
export, and real 4-stem export via a hand-rolled ZIP/CRC32 writer — all zero-cost, all client-side.
It also makes one real authenticated call today: `ibis-query` for text-only "Producer Notes"
(arrangement advice, explicitly never audio/lyrics generation), and has a gated, currently-disabled
managed-generation path (`ftn-fire-generate`, requires `FTN_CREATIVE_GENERATION_ENABLED` +
`FTN_FIRE_GENERATION_ENABLED`, both off).

**Registered this pass**: `ftn-fire-local-procedural` in `js/ibis-provider-registry.js` —
`capabilities: ['INSTRUMENTAL_GENERATION']`, `costToIbis: 'ZERO_COST_TO_IBIS'`, but `enabled: false`
because there is no real, callable adapter yet: `schedule()`/`play()`/`exportWav()` are tightly
bound to `/riddim/fire/`'s own DOM element ids, not a portable function another node or IBIS surface
could call. **Recommendation, not built this pass:** extract the procedural engine into a shared,
callable module (the same pattern `js/charts.js`'s `trendGlyph()` already proved for a smaller
case) so `attemptInOrder('INSTRUMENTAL_GENERATION', ...)` could genuinely select it. Until then,
Fire is correctly a **specialized workspace with its own real local capability**, not yet a
capability the shared fabric can route to — a combination of the two options the directive posed,
not a full "separate execution product" nor a full "IBIS creative mask."

### FTN DAW (`/riddim/daw/`, `js/ftn-daw.js` + `js/daw-arrangement.js`, ~58 lines total)

Real browser audio processing: EQ (highpass/lowshelf/peaking×2/highshelf/lowpass biquad chain),
gain, tempo (`playbackRate`), a real analyser-driven spectrum/meter, WAV export via
`OfflineAudioContext`, and a real local MP3 encoder path (`lamejs`). No AI capability of any kind —
purely deterministic signal processing, entirely local. **IBIS relationship**: DAW is a strong
future consumer of `ibis-local-dsp` (BPM detection could auto-populate DAW's tempo field instead of
requiring manual entry) — not built this pass (§0.10/§0.11: the file is dense, page-specific,
tightly DOM-coupled, judged too risky to modify blind under this pass's time budget). Flagged as
the concrete next integration step for `ibis-local-dsp`, same as before.

### FTN Radio (`/radio/`, `js/radio-workspace.js`, real code read this pass)

A real production workspace: shared `MediaDiscovery`/`dj-tube-discovery` media discovery, a real
Turnstile-gated creator-submission intake (`IntegrationAdapter.submit`), and a real, reusable FTN
EPK builder (bio/credits/links/local photo preview — metadata only, never the image bytes). No AI
generation of any kind exists on this page today. **IBIS relationship**: a real, plausible future
consumer of `TEXT_GENERATION` (drafting EPK bio copy from creator-supplied facts) — not built, since
no such capability is registered/eligible yet (see the taxonomy: `TEXT_GENERATION` has no zero-cost
enabled provider today).

### FTN TV (`/tv/`, `js/tv-guide.js`, real code read this pass)

A real Atlantic-time-zone scheduling guide over the same shared `MediaDiscovery` engine, resolving
embeddable YouTube sources per programme block. No AI capability exists on this page today.
**IBIS relationship**: a real, plausible future consumer of `VIDEO_CAPTIONING`/`VIDEO_TRANSCRIPTION`
for clip preparation — not built, since neither capability has a registered provider yet.

### Every other real, routable node

Derived directly from `js/product-registry-data.js` — 20 further real public products (Events,
Screen, FTN Live, Kaiso, Riddim, DJ Tube, EPK, Opportunities, Display Network, Invest, Account,
Top Picks, Govern, Parliament, Face The Nation, Scenario Workspace, and the platform home) — none
guessed, all confirmed via `NodeRegistry.all()` against the live product registry. Run
`FTN.NodeRegistry.all()` (or read `js/product-registry-data.js` directly) for the full, current
list rather than trusting a frozen copy in this file, which would drift.
