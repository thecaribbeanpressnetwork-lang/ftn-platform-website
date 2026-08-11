# FTN Platform Master Build — execution ledger

Date: 2026-08-10
Repository: `thecaribbeanpressnetwork-lang/ftn-platform-website`
Working branch: `codex/master-build-v1`
Protected baseline: `9ee081bd678fb5ec21e4325090f22b9b8737dfbd`
Remote backup: `backup/master-build-baseline-20260810-9ee081b`

`DONE` means the corresponding deterministic acceptance test passed. `PREPARED` means Git-owned implementation exists but needs isolated staging. `BLOCKED` names an external authorization, legal, financial or credential gate; it is not represented as released.

| Workstream | State | Evidence / release boundary |
|---|---|---|
| Protected repository baseline and backup | DONE | Clean `origin/main` baseline recorded and remote backup branch created before material work. |
| Product Registry and hierarchy | DONE | 21/21 required products; FTN Fire is a supporting product under Riddim; Health alone is PHASE 2; Love and God Mode remain private. |
| Shared public foundation | DONE | Navigation/status foundation, account return paths, canonical normalization, public directory, Trust Centre, glossary, PWA shell and offline truthfulness pass automated release tests. |
| Community Connect boundary | DONE | Existing website handoffs/assets preserved; separate application source and private reports were not modified or joined to website data. |
| FTN Account source | PREPARED | Auth UI and server functions use verified Supabase Auth identity; preferences/export/deletion source and RLS are Git-owned. Requires staging migration/isolation proof. |
| God Mode source | PREPARED | Owner-only server authorization, journal/control source and fail-closed client exist. No public navigation, sitemap, manifest or cache advertisement. Requires owner identity, MFA/passkey and staging emergency simulations. |
| ibis Creative Studio | DONE / PREPARED | Provider-transparent image/video planning is usable locally; paid generation is locked. Provider registry, private projects and atomic credits are prepared for staging. No adapter, credential, affiliate ID or paid call is enabled. |
| FTN Fire | DONE | Real on-device Caribbean instrumental draft, seeded recipe, WAV and four-stem ZIP export pass browser tests. No lyrics/vocal imitation or external paid call. |
| FTN DAW | DONE | Multi-track import/record arrangement, trim/position, gain/pan, fades, undo/redo, local autosave recipe and real OfflineAudioContext WAV mix pass. |
| FTN DJ | DONE | Rights-gated local two-deck mode performs real decode, waveform and BPM-confidence analysis, cues, loops, tempo, gain and crossfade. Streamed YouTube remains separately labelled reference mode. |
| Parliament / Invest / Events / Opportunities | DONE | Source, owner, checked date, save/share/calendar/report/fraud boundaries covered by release tests. Invest is education only. |
| Radio / Screen / TV / Face The Nation / Live / Kaiso | DONE | Authorized-source discovery and failure states pass deterministic provider-adapter tests. Radio save/share/recent and Screen source records are covered. Screen and Face participation are protected moderation transactions. |
| Display Network | DONE / PREPARED | Local playlist and campaign creative validation work; campaign request is authenticated, Turnstile-bound and moderation-only. No placement or publishing claim. |
| FTN Love | PREPARED, PRIVATE | Consent/adult/private tables and functions are Git-owned and guest access fails closed. Production remains private pending legal review and cross-user staging tests. |
| FTN Health | DONE, PHASE 2 | No intake, symptom checker, diagnosis, upload or clinical claim exists. |
| Visual asset inventory | DONE / BLOCKED | 58/58 repository media assets are hashed and registered. 56 existing assets still require owner provenance/licence confirmation before production promotion. |
| Production Supabase audit | DONE, READ-ONLY | Project is `ACTIVE_HEALTHY`; production has seven migrations through `20260810081201`. Three legacy security-definer view advisor errors are fixed by candidate migration but not changed in production. |
| Isolated Supabase staging | BLOCKED | A development branch costs **US$0.01344/hour**. No paid branch may be created without explicit owner confirmation. |
| Website staging / DNS / security headers | BLOCKED | Repository deploy workflow targets GitHub Pages only on `main`; no isolated public website staging target is configured. Cloudflare/DNS access is unavailable, so apex/`www` redirect and response headers cannot be verified or changed. |
| Provider/affiliate production activation | BLOCKED | Requires provider terms, data/retention/output-rights review, FTN credentials/affiliate IDs, exact cost and customer pricing approval. All provider calls remain disabled. |
| Production release | BLOCKED | No merge/deploy until isolated database tests, owner asset/legal review, DNS/header access and release approval are complete. |

## Current deterministic evidence

- Backend source audit: 11/11 Edge Functions.
- Product registry audit: 21/21 required products.
- Shared foundation: 11/11 scenarios.
- Full functional suite: 33 scenarios.
- ibis/Fire/DAW/DJ: 5 scenarios.
- Critical mobile suite: 12 surfaces.
- Indexed public routes: 40 routes.
- Visual asset manifest: 58/58 files.
- Turnstile: server/client readiness plus deterministic Radio, Screen and Face moderation gates.
- Owned performance budgets: 12/12 representative routes.
- Static release integrity: no broken local references, duplicate static IDs or JavaScript syntax failures.

Live provider and production smoke tests are separate release gates; deterministic fixtures never stand in for those staging/production checks.
