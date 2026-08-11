# FTN Platform Master Build v2.0.0-rc.1 — verification record

Date: 2026-08-10
Branch: `codex/master-build-v1`
Protected baseline: `9ee081bd678fb5ec21e4325090f22b9b8737dfbd`
Recovery branch: `backup/master-build-baseline-20260810-9ee081b`

This record certifies the locally verified release-candidate scope. It is not a production-release claim and does not authorize billable staging, a production database migration, DNS changes, provider spend, a merge to `main`, or a production deployment.

## Verified automated gates

| Gate | Result |
|---|---|
| Git-owned Edge Function ownership/security audit | 11/11 functions passed |
| Product Registry contract | 21/21 products passed |
| Shared platform foundation | 11/11 scenarios passed |
| Functional product journeys | 33/33 scenarios passed |
| ibis Creative Studio, FTN Fire, DAW and DJ | 5/5 scenarios passed |
| Critical mobile surfaces at 390×844 | 12/12 passed |
| Indexed non-Community-Connect public routes | 40/40 passed |
| Owned performance budgets | 12/12 representative routes passed |
| Turnstile readiness/client contract | Radio, Screen and three Face The Nation forms passed |
| Visual asset manifest | 58/58 repository assets covered |
| Static local references | No broken local `href`/`src` references |
| Static document IDs | No duplicate IDs found |
| JavaScript syntax and patch whitespace | Passed |

Provider discovery was made deterministic for the owned release gates. Live provider, staging isolation, production smoke and real-user monitoring are deliberately separate gates.

## Product truths verified

- FTN Fire is an instrument-only Caribbean beatmaker under Riddim, not a lyric or vocal-imitation product. It produces a real local Web Audio draft, recipe, WAV and four-stem ZIP without a paid provider call.
- FTN DAW imports or records authorized source audio, performs real multitrack arrangement and renders a real stereo WAV locally. Source media is not silently persisted.
- FTN DJ provides rights-gated local two-deck audio controls, waveform and BPM-confidence analysis. YouTube remains clearly separated as streamed reference media and cannot be ripped or exported.
- ibis Creative Studio presents provider, estimated-credit, rights and status boundaries. Paid image/video/music provider execution remains disabled until the specific provider gate is approved.
- Account, Love and God Mode fail closed for guests. Health remains the sole Phase 2 product and collects no health data.
- Parliament, Events, Opportunities, Radio, Screen, Live, Kaiso, TV and Face The Nation expose source/failure/moderation boundaries without fabricating publication or live-network state.
- Community Connect remains a separate release stream. Its existing website handoff and release assets were preserved.

## Read-only production audit

- Supabase project `jshmidfpqrajxtukzges` reported `ACTIVE_HEALTHY`.
- Production migrations were left at the pre-candidate state through `20260810081201`.
- Three legacy security-definer view advisor errors remain in production. Candidate migration `20260810130000_master_build_shared_identity_controls.sql` prepares `security_invoker` replacements, but was not applied without staging proof.
- Production website, DNS and provider settings were not changed.

## Promotion blockers and smallest owner decisions

1. Authorize or decline a disposable Supabase development branch at the quoted **US$0.01344/hour**, including a maximum lifetime/budget. A supplied no-cost isolated project is also acceptable.
2. Select/connect an isolated website staging host.
3. Confirm the immutable owner and break-glass identities, then complete MFA/passkey validation.
4. Resolve the asset-manifest provenance rows and complete legal review for FTN Love, privacy/retention, provider output rights and affiliate disclosures.
5. Approve each provider independently with contract, retention, output-rights, cost cap, customer pricing, refund path and kill-switch evidence.
6. Provide Cloudflare/DNS authority to enforce the apex canonical redirect and verify response security headers.

After those gates pass, follow `GOVERNANCE/FTN_Release_Operations_Runbook_2026-08-10.md` for isolated staging, restore proof, reviewed promotion and rollback.
