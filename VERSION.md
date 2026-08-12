# FTN Platform Website — Version Record

This internal record tracks the website release state. The public website does not display build/version badges.

## Current production release — Full Public Release v2.1.0

| Field | Value |
|---|---|
| Release state | **Verified production release** |
| Production branch | `main` |
| Release code commit | `39d18022101877e35f26f6a3bee9620013bcff3d` |
| Release date | 2026-08-12 |
| Production workflow | `.github/workflows/static-pages.yml` |
| Production domain | `ftnplatform.org` |
| Community Connect | Separate application/repository; linked but excluded from this website release pass |

### Release scope

This release reconstructs the lost full public build on the current `main` baseline:

- FTN Govern is a first-class, independently attributed civic gateway to ttconnect and Parliament of Trinidad and Tobago sources.
- Mission Control is private; the public evidence tool is FTN Scenario Workspace. Legacy public URLs redirect to the new route.
- FTN Parliament exposes six official record categories and FTN TV links to official ParlView coverage.
- FTN Kaiso accepts CARICOM institutional releases and local publisher headlines only from Guardian and Trinidad Express, with independent browser-side trust filtering before anything is rendered.
- FTN InvestIn combines transparent support, sponsorship and partnership paths with official-source market learning. It makes no public securities offering or invented raise/return claim.
- FTN Radio uses rights-aware creator delivery and no longer exposes the Programming Desk.
- Applications is a static, grouped, progressively enhanced directory. Public product states are `LIVE`, `AVAILABLE`, `PRIVATE` and `PHASE 2`.
- Homepage duplication, mobile constellation targets, custom-header support placement, Radio mobile CTA collision, Observatory wording and shared accessibility defects are corrected.
- The public service-worker cache namespace is `ftn-public-v2.1.0`.

### Release validation

Fresh verification on the release code commit established:

- **36 / 36 functional browser scenarios passed.**
- **11 / 11 shared-foundation scenarios passed.**
- **13 / 13 critical mobile surfaces passed** at 390×844.
- **39 / 39 indexed public routes passed**, including stale-state and overflow checks.
- **12 / 12 representative routes stayed inside owned performance budgets.**
- **12 / 12 Edge Functions passed** the Git ownership/secret audit.
- **23 / 23 required registry products passed** metadata and visibility rules.
- **70 / 70 visual assets passed** the generated manifest audit.
- **2,287 local HTML references resolved** across 54 HTML files.
- Ten release-critical routes passed an axe-core WCAG 2 A/AA sweep with no serious or critical violations.
- Turnstile client/server contracts and Screen/Face The Nation moderation gates passed.
- Production `ftn-news-sources` is active at version 9 and the exact deployed source is versioned in both Git source and deployed snapshots.

### Supersession

This record supersedes the v2.0.0 release-candidate description and the prior functional ecosystem production record. Git history remains authoritative for older releases. Current runtime truth is the Product Registry, this record, the platform constitution and the code/tests shipped in the release code commit above.
