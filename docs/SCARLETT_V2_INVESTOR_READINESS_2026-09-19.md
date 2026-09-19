# Scarlett V2 — consumer investor-readiness evidence pack

Date: 2026-09-19
Branch: `feature/scarlett-consumer-v2`
Companion: `SCARLETT_V2_ARCHITECTURE_2026-09-19.md` (technical detail behind every claim below),
V1's three docs (the Original/Assist/Adapt foundation this branch extends).

Every claim below is tagged WORKING / TESTED / AVAILABLE / EXPERIMENTAL / PLANNED, per the required
taxonomy. **WORKING** = real code, exercised live this session. **PLANNED** = data model or UI
exists, not connected to real infrastructure. Nothing here is exaggerated past what was proven.

## 1. Feature status

| Capability | Status | Evidence |
|---|---|---|
| Original / Assist / Adapt | WORKING (carried from V1) | V1 evidence pack + this session's fresh Playwright runs |
| Transform (Scarlett Deck) | **WORKING** | Live-verified for LISTING and FORM_SERVICE fixtures: real grounded decks, correct tab sets matching the product definition's own examples, main region hidden then fully restored, zero console errors |
| Compare (Scarlett Reveal) | **WORKING**, capture path partially untestable in automation | The mode-switch/overlay/graceful-degradation logic is live-verified; the actual screenshot succeeding requires a real user's toolbar-icon click (a Chrome platform constraint, not a code gap) — verified the failure path is honest, not verified the success path pixel-for-pixel outside a real user session |
| Blend (staged 0–100 slider) | **WORKING** | All six stops live-swept with correct mode mapping; risk cap to 20% verified on a sensitive fixture |
| Signature transformation animation | **WORKING** | ~460ms scan sweep before deck mount; collapses under reduced-motion (code-verified; the collapse itself wasn't separately timed live) |
| Data Faucet (observation) | **WORKING** | Real `webRequest` observation, real categorization, real tally — live-verified against a fixture making real tracker-shaped requests |
| Shield (blocking) | **WORKING** | Real `declarativeNetRequest` rules; 4 known trackers actually blocked at the network layer, 1 payment domain correctly left unblocked, exact expected rule count |
| Site exception ("Site broken?") | **WORKING** | Live-verified: exception regenerates the rule set with the correct exclusion |
| Shield consent flow itself (native permission dialog) | **AVAILABLE, not live-tested** | The dialog is browser-chrome UI no automation tool can drive; the code path (`chrome.permissions.request`) is correct and standard, verified via the underlying engine with permissions pre-granted |
| Search with Scarlett | **WORKING** | Live round trip against the real, production `ftn-ibis-mcp` endpoint returned a real result, correctly rendered |
| Find with Scarlett | **WORKING** (scope: presentation adapts to intent; retrieval is the same `search`/`opportunity_scout` tools, not a separate planning pipeline) | Live-verified: correct empty-state handling (no fabricated results) for queries outside the curated registry |
| Entitlement data model | AVAILABLE (data model + UI, not gating anything) | Live-verified popup plan line and in-deck preview note both render from the live data model |
| Real payment/checkout | **PLANNED — not built** | No processor integrated; "See FTN plans" opens a real FTN pricing page, nothing more |
| Local analytics instrumentation | **WORKING** | Live-verified: a real usage sequence logged all 6 expected events in order (after fixing a write race found live), zero page-content/URL leakage confirmed |
| Real founder-facing cross-user analytics | **PLANNED — not built** | The dashboard is local-device-only; no backend exists to aggregate real users |
| Google Docs/Sheets/Gmail/Calendar (authenticated) | **NOT TESTED** (unchanged from V1) | Would require entering real Google credentials — out of scope for this session |
| Broader visual QA (many more real sites) | **PARTIALLY TESTED** | V1's gap-closure pass covered 6 real sites; V2's new modes were tested on fixtures plus the sites already covered for Original/Assist/Adapt, not re-run across all 6 for Transform/Compare/Blend specifically |

## 2. Investor demo runbook (repeatable, uses the actual product)

1. **Article**: open a real article, popup → Adapt, then Transform (real deck, OUTLINE/KEY FACTS/
   SOURCES), Compare slider back to Original, Original restores exactly.
2. **Government/service page**: same flow on a FORM_SERVICE-shaped page — deck shows WHAT THIS IS /
   WHO QUALIFIES / WHAT YOU NEED / DEADLINE / HOW TO APPLY.
3. **Listing/property**: Transform's OVERVIEW/PRICE/ACTIONS/DOCUMENTS deck; "Ask ibis about this
   page" opens the real review-before-send handoff.
4. **Data Faucet**: open the popup, "Turn on Data Faucet Protection" (real Chrome consent dialog —
   walk through what it actually asks for), visit an ordinary site, open the in-page Data Faucet
   panel, show the real tally, "Close the Faucet", reload to show trackers now blocked.
5. **Search vs Find**: type a plain query → Search; type an objective ("find me a grant I could
   apply for") → Find, showing the representation label change.
6. **Blend**: drag the slider live across all six stops on one page, narrating what's structurally
   different at each stop (not just a fade).
7. **Google Docs**: Assist only, select text, "Ask ibis about this page" — native editing
   untouched. (Requires the presenter's own Google account; not scripted by this session.)
8. **Plan/paywall**: show the popup's plan line and the in-deck preview note, be explicit that
   nothing is actually paywalled yet — this is deliberate, not missing.

## 3. Strategic proof (extends V1 §4)

**User value, sharpened**: V2 proves the "search with Scarlett, browse with Scarlett" proposition
concretely — Transform turns a cluttered page into a task deck grounded in real content, Data
Faucet answers "who is this page talking to?" with real numbers instead of a vague privacy promise,
and Blend makes the intervention level tangible and controllable rather than binary.

**Ecosystem value**: Search/Find routes through the exact same canonical ibis endpoint the
company's own shipped extension uses — proving Scarlett strengthens the ibis surface area rather
than duplicating it, and incidentally surfaced a real production bug in that shared path.

**Ownership**: every V2 module (representation engine, deck renderer, tracker registry, Shield
engine, entitlement model, analytics) is FTN-authored and dependency-free. The one new network
destination (`ftn-ibis-mcp`) is FTN's own.

**Data value**: honestly limited in this pass — see §1's PLANNED rows. The real, demonstrable asset
is the *event schema and privacy boundary*, which is what a future real analytics pipeline would
need regardless of when it's built.

**Economic value**: still not priced for real (see entitlements section) — the pricing hypotheses
are documented and structurally ready to attach to a real entitlement check the moment that
decision is made.

**Execution cost**: still low — no new backend service, no new build step. Shield's blocking
engine adds no server cost (rules evaluate client-side via Chrome's own `declarativeNetRequest`).

**Future optionality**: the entitlement model and Blend's operation-set structure are explicit
extension points for exactly the gating a real paid tier would need, without a rewrite.

## 4. What is explicitly NOT done (unchanged posture from V1 — read before calling this ready)

- Real payment processing — deliberately not built; a founder-level, consequential decision.
- Real cross-user founder analytics backend — deliberately not built, same reasoning.
- Product Registry entry — still deferred (no truthful public destination page yet).
- Authenticated Google Docs/Sheets/Gmail/Calendar QA — not performed, credentials out of scope.
- A dedicated Scarlett browser, mobile browser, VPN, or device-wide tracking firewall — explicitly
  out of scope per the product definition's own "prepare, don't overbuild" guidance.
- Exhaustive visual QA across every representative site type for the new modes specifically.
- The native Shield consent dialog's actual click-through — browser-chrome UI, untestable by any
  automation tool; the underlying permission engine is verified instead.

## 5. Consumer install instructions (as they exist today)

Unpacked-load only — no Chrome Web Store listing yet (unchanged from V1). Load
`apps/ftn-scarlett-browser-extension/` as an unpacked extension in a Chromium browser's
`chrome://extensions` (Developer mode → Load unpacked). This remains the honest, current answer to
"anything preventing a real user from installing and paying today": installing requires developer
mode today, and paying is not possible — no checkout exists.
