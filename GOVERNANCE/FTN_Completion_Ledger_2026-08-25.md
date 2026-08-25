# FTN Platform — Production Completion Ledger

**Durable checkpoint for the founder-authorized "FTN Final Production Completion Pass" +
continuous-execution addendum.** Update this file after every pushed cycle so a future session can
resume without chat history. Do not delete prior cycle records — append.

**Verified production SHA at start of this pass:** `eb51ab2` (Phase 5B).

---

## Cycle 1 (2026-08-25) — Priority 1: Fire audit

**Finding: Fire is already FUNCTIONAL, not deferred work.** Full real end-to-end Playwright
verification (desktop 1366×900 and mobile 390×844, `channel:'chrome'` workaround):
- Prompt → generate → real `LOCAL DRAFT READY` status: works, zero console errors.
- Play/Pause toggle (PLAY DRAFT ⇄ PAUSE ⇄ RESUME): works, real `AudioContext.suspend()/resume()`.
- Real WAV export: real download captured (`ftn-fire-soca-105bpm.wav`).
- Real 4-stem ZIP export: real download captured (`ftn-fire-stems-reggae-86bpm.zip`).
- Zero horizontal overflow at either viewport, before or after generation.
- Honest labelling already correct: "not a Stability AI model. It runs on your device," explicit
  `LOCAL_DRAFT_READY`/`FTN local browser engine` status, managed-generation path fails closed with
  an honest message ("not enabled yet. No provider was called and no credits were reserved.").

**Real finding, documented not fixed:** `js/ftn-fire.js` contains three genuinely unreachable
functions (`requestManaged`, `checkManagedJob`, `askIbis`) — their target DOM ids
(`fire-managed-status`, `fire-managed-check`, `fire-ibis-output`) do not exist anywhere in
`riddim/fire/index.html`, and `init()` never wires them to any control. This is the explicitly
authorized "retain useful code privately when a public control is nonfunctional" pattern, not a
defect — the backend they'd call (`ftn-fire-generate`) is genuinely disabled platform-wide
(`FTN_CREATIVE_GENERATION_ENABLED`/`FTN_FIRE_GENERATION_ENABLED` both false per `IBIS-MAP.md`), so
exposing a control that would always say "not enabled" would be a UX regression, not an
improvement. **Left as-is. Not a blocker.**

**Provider-registry reconciliation finding:** `ftn-fire-local-procedural` (Fire's real, working
engine) and `ibis-local-music-engine` (a separate, simpler, IBIS-orchestrable 4-style engine) are
BOTH real `INSTRUMENTAL_GENERATION` capability entries in `js/ibis-provider-registry.js`. This is
not a routing bug — `ftn-fire-local-procedural` stays `enabled:false` (accurately: it remains
page-bound, not portable), so `js/ibis-eligibility.js`'s `find()` never selects it; only
`ibis-local-music-engine` is ever eligible for a real orchestrated `INSTRUMENTAL_GENERATION` call.
Merging the two into one implementation would be a nontrivial refactor of a fully-working, tested
page for zero user-facing benefit — explicitly out of scope per "no speculative redesign." **Not
consolidated. Documented, not a blocker.**

**Status: Priority 1 (Fire) — FUNCTIONAL. No code changes required. Moving to Priority 2.**

---

## Next executable task (update this line every cycle)

Priority 2: audit DJ Tube, DAW, Radio, EPK for blocking defects (dead controls, upload/playback
failures, missing feedback, mobile overflow, broken export, dishonest success states, dead links).

## Remaining defects (ranked, update as found)

(none logged yet this pass beyond the Fire findings above, which are not blockers)

## Blockers

(none yet — Supabase credential availability not yet checked this pass)

## Tests run this pass

- Manual real-browser Playwright verification of Fire generate/play/pause/export (desktop + mobile,
  zero console errors, zero overflow) — not yet captured as a permanent regression test file.

## Decisions made this pass

- Fire's dormant managed-generation/ibis-notes code is retained, not removed or wired up (see
  Cycle 1 finding above).
- Fire's provider-registry duplication (two INSTRUMENTAL_GENERATION entries) is accepted as
  intentional, non-conflicting, and not worth a risky merge this pass.

## Files/architecture touched this pass

(none yet — Cycle 1 was inspection-only, no code changes needed for Fire)
