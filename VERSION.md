# FTN Platform Website — Version Record

This internal record separates verified production state from work that is prepared but not yet deployed. The public website does not display build/version badges.

## Verified production baseline

| Field | Value |
|---|---|
| Production branch | `main` |
| Verified code commit | `e2157ad898b421281de42f5c687bbcf46620cfbe` |
| Production verification date | 2026-08-18 |
| Production workflow | `.github/workflows/static-pages.yml` |
| Production domain | `ftnplatform.org` |
| Production shell namespace | `ftn-public-v2.2.0` |
| Community Connect | Separate application and repository |

The homepage, Directory, Account, ibis, God Mode, Kaiso, Community Connect gateway, Love, Health and sitemap responses sampled on 2026-08-18 matched this commit. Protected account, founder and database journeys still require owner-authenticated production validation.

## Prepared release candidate — v2.2.1

| Field | Value |
|---|---|
| Release state | **Local release candidate — not deployed** |
| Working branch | `codex/ftn-now-gate1-release-truth` |
| Baseline | `e2157ad898b421281de42f5c687bbcf46620cfbe` |
| Prepared date | 2026-08-18 |
| Candidate shell namespace | `ftn-public-v2.2.1` |

### Candidate scope

- Adds the explicit `VAULTED` lifecycle to the Product Registry, God Mode source and database-control migration.
- Vaults FTN Love and FTN Health without deleting their FTN-owned product records or future source work.
- Removes both products from public directory/discovery surfaces, promotional links and `sitemap.xml`.
- Replaces their direct routes with honest `noindex` unavailable pages; the FTN Love route no longer loads authentication or private Love runtime code.
- Corrects release tests so they fail if Love, Health or another vaulted product leaks into public discovery.
- Advances the service-worker cache namespace for changed public shell and registry assets.

### Candidate verification status

- Static Product Registry, backend ownership/secret and asset-manifest audits pass locally.
- Browser, mobile, accessibility and performance suites remain required before approval to push or deploy.
- The new database migration and changed `ftn-owner-control` source are versioned candidates only. They are not evidence of a production database/function change.

## Release rule

Git history, the verified production response and the deployed Supabase function manifest are the final evidence for a live release. Source presence or a passing static audit alone must never be described as deployed functionality.
