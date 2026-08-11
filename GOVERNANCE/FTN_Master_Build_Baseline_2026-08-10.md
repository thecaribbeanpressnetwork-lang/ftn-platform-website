# FTN Platform master-build baseline — 2026-08-10

This is the protected execution baseline for the master-build release. It records what was verified before implementation; it is not a completion certificate.

## Recovery point and ownership

- Baseline commit: `9ee081bd678fb5ec21e4325090f22b9b8737dfbd` on `main`.
- Remote recovery branch: `backup/master-build-baseline-20260810-9ee081b` at the exact baseline commit.
- Release-candidate branch: `codex/master-build-v1`.
- Repository: public GitHub repository owned by `thecaribbeanpressnetwork-lang`; the connected GitHub identity has push/admin access.
- Live origin checked independently: `https://ftnplatform.org/`; `https://www.ftnplatform.org/` currently serves the same application instead of redirecting to the apex.
- Supabase project: `jshmidfpqrajxtukzges`, active in `us-west-2`, PostgreSQL 17.6. Public runtime values are publishable identifiers, not secrets.
- Community Connect is a separate protected application and is outside this repository's implementation scope. Its website handoff and owned release download remain in scope.

## Architecture inventory

The baseline is a dependency-free static HTML/CSS/JavaScript website with route directories, a shared product registry, shared browser storage helpers, and seven deployed Supabase Edge Functions. CI installs Playwright transiently and runs functional, mobile, route, Turnstile, backend-source and performance gates. Both GitHub Pages and a Cloudflare-served production origin are present, so deployment ownership must be resolved before production release.

Tracked baseline: 284 files; 34 route indexes plus `404.html`; no package manifest or dependency lockfile; no service worker or web-app manifest; no unified account; no private owner console. Exact live function source and version metadata are preserved under `supabase/deployed/`. Candidate source remains under `supabase/functions/`.

## Product release matrix

Status below describes the protected baseline, not the target registry status.

| Product | Route | Baseline outcome | Missing work / dependency | Release acceptance |
|---|---|---|---|---|
| FTN Platform Home | `/` | Strong responsive ecosystem landing page; country choice is forced; 13-panel wall | Registry-driven discovery, truthful statuses, account/PWA/return path, unforced country choice | Search opens every public product; no forced country; install/account/last-task paths work |
| Community Connect | `/community-connect/` | Protected-app handoff and FTN-controlled Android release | Reverify checksum/version/deep links and point-of-use policy links; do not change app/data boundary | APK hash matches copy; browser and Android handoffs pass; unavailable stores stay hidden |
| Mission Control | `/mission-control/` | Public calculated demonstration with transparent sample inputs | Must remain explicitly a demo until permissioned institutional sources exist | Change/correlation/scenario calculations respond and never claim operational government data |
| ibis.ai | `/ibis-ai/` | Deterministic local router, local FTN-data analysis and real canvas visual export | Authenticated server AI function is not connected; function requires a real user JWT | Guest local modes work; signed-in server mode sends JWT; failures fall back explicitly |
| FTN Parliament | `/parliament/` | Missing | Official source directory/search/save/share/correction using Parliament of Trinidad and Tobago sources | Filters and source links work; jurisdiction/date/verification and non-affiliation notice visible |
| Face The Nation | `/facethenation` | Source-backed programme discovery and moderated local participation draft | Add Parliament/Community boundaries and shared submission status | Authorized episode or honest empty state; source/status/share; consent-aware submission |
| FTN Events | `/events/` | Real event-planning, provider discovery and RFQ workspace | Required public event discovery/submission is absent | Approved-source event directory, calendar/share/directions, and moderated submission path work |
| FTN Screen | `/screen/` | Source-backed permitted embeds plus festival-package workspace | Add rights-status clarity and shared save/share | Catalogue or honest outage, rights/source state, creator package and lawful destination work |
| FTN TV | `/tv/` | Schedule-resolved YouTube-backed current/next programme player | Add explicit rights/verification/failure labelling | Server-time guide selects authorized source and shows off-air/provider failure honestly |
| FTN Live | `/observatory/` | NOAA/public-source satellite and indicator context with source fallbacks | Rename/registry consistency and operator failure control | Current/upcoming/replay or transparent no-content state; sources and checked time visible |
| FTN Radio | `/radio/` | Source-backed Caribbean discovery player, creator/programming tools, protected submission | Add shared save/recent/share and deterministic Turnstile CI | Player/failure state, source ownership, submission gate and email fallback pass |
| FTN Riddim | `/riddim/` | Music workflow hub with rights-aware intake and DAW/DJ handoffs | Add registry hierarchy, source/rights/save consistency | A user can enter rights-aware track metadata and continue to DAW or DJ |
| FTN Kaiso | `/kaiso/` | Source-backed newsroom/culture radar and local story-lead drafts | Clarify culture/music archive boundary, corrections/claims | Search/source discovery, provenance, verification state and correction intake work |
| FTN DJ Tube | `/riddim/dj/` and `/dj-tube-prototype/` | Real two-deck local-audio controls plus permitted YouTube reference discovery | Account project persistence; stem provider intentionally unavailable without spend approval | Local licensed audio controls work; embeds remain reference-only; unsupported/provider states clear |
| FTN DAW | `/riddim/daw/` | Real Web Audio import/play/gain/fades/export foundation | Complete multitrack project recipe, undo/redo and ownership record | Owned audio imports, edits, restores and exports a real mix; limits and rights are visible |
| FTN Opportunities | `/opportunities/` | Source-backed discovery, filters, local saves and status | Add calendar export, eligibility/expiry/correction metadata | Current records show issuer/source/deadline/checked time; save/calendar/report work |
| FTN Love | `/love/` | Private local compatibility brief only | Full matching cannot be public safely until account, RLS, moderation, age and consent controls pass | Required private consent journey passes cross-user isolation, or route is PRIVATE—not a public promise |
| FTN Display Network | `/display-network/` | Real local playlist builder/preview and deployment brief | Campaign intake/moderation/status backend is absent | Honest campaign request and preview works; no fake checkout/live claim; approval states server-backed |
| FTN Invest | `/invest/` | Route is currently FTN fundraising/investor room, conflicting with required product boundary | Preserve room at `/investor-room/`; create official-source education/watchlist product | Educational sources, risk/conflict disclosure and local watchlist work; no advice/trade/returns claim |
| FTN Account | `/account/` | Missing; nav sign-in points to Community Connect | Unified Supabase Auth, return URL, sessions, consent/export/delete; OAuth provider config unverified | Email auth/session restoration works; private saves use stable user ID/RLS; logout and expiry pass |
| FTN Health | `/health/` | Missing | Sole allowed Phase 2 preview; must collect no health data | Every mention says PHASE 2; preview has no symptom/diagnosis/clinical input or medical claim |

## Verified release defects and risks

1. Relative canonicals resolve to the `www` host when opened there, and `www` does not redirect to apex. This produces a duplicate canonical surface.
2. Production includes Cloudflare Web Analytics while privacy/cookie copy says there is no analytics. Browser-local forms also retain personal/work data while retention copy says personal information is not retained.
3. Public “Sign In” links route to Community Connect even though it is a separate identity/data boundary.
4. Product status vocabulary and public portfolio are incomplete and inconsistent with the required `LIVE`, `BETA`, `MAINTENANCE`, `PRIVATE`, `PHASE 2` model.
5. Three Supabase public views are reported as `SECURITY DEFINER`; one `issues` RLS policy has a per-row auth-function performance warning. A versioned migration is required and must be staged.
6. `ibis-query` and `dj-tube-stems` require a user JWT. The website does not have a shared authenticated session, and the stem provider credential is not configured. No paid provider will be enabled without spend controls and authorization.
7. A Supabase preview branch is billable (`$0.01344/hour` at time checked). The release mandate forbids incurring cost without owner approval; production will not be used as a staging substitute.
8. DNS/Cloudflare account ownership, Google OAuth configuration/recovery, analytics controls and production deployment authority are not exposed through the connected tools. These are release-verification gates, not reasons to stop unblocked implementation.

## Preserved strengths

- Existing premium black/red visual system, panel art, responsive workspaces, keyboard-friendly navigation and reduced-motion rules.
- Community Connect release functionality and protected application boundary.
- Real browser-audio DJ/DAW flows, source-backed media/opportunity functions, FTN Live source fallbacks, deterministic ibis tools and current Playwright coverage.
- Existing data provenance language where it accurately distinguishes source, FTN context, draft, preview and local-only work.

## Execution ledger

| Workstream | State | Evidence / next gate |
|---|---|---|
| Protected code backup | DONE | Remote baseline branch at exact SHA |
| Deployed backend source capture | DONE | `supabase/deployed/manifest.json` and exact function trees |
| Product and promise baseline | DONE | This matrix and automated route/control inventory |
| Product Registry + shared shell | IN PROGRESS | Registry schema/consumers and route tests |
| Account and private authorization | IN PROGRESS | Auth client, RLS migrations, owner RPC denial tests |
| Product golden paths | IN PROGRESS | Functional Playwright scenarios per route |
| Legal/trust/SEO/PWA | IN PROGRESS | Disclosure audit, private route exclusions, offline tests |
| Backend staging/restore | BLOCKED | Requires explicit approval for billable Supabase preview branch or supplied no-cost staging project |
| Cloudflare/DNS release verification | BLOCKED | Requires connected Cloudflare account/configuration authority |
| Production release | BLOCKED | Requires prior staging/restore/security acceptance and exact-host deployment authority |
