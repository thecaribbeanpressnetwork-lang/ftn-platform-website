# FTN Platform Website — Version Record

This internal record separates verified production state from prepared work. The public website does not display build/version badges.

## Verified production baseline

| Field | Value |
|---|---|
| Production branch | `main` |
| Baseline code commit | `481effc3c2f8a75b77aa0f4c64f15dd71601444d` |
| Baseline observed | 2026-08-19 |
| Production workflow | `.github/workflows/static-pages.yml` |
| Production domain | `ftnplatform.org` |
| Community Connect | Separate protected application and repository |

## Prepared release candidate — v2.3.0

| Field | Value |
|---|---|
| Release state | **Branch release candidate — not deployed until merged and production-verified** |
| Working branch | `agent/ftn-surface-system` |
| Baseline | `481effc3c2f8a75b77aa0f4c64f15dd71601444d` |
| Prepared date | 2026-08-19 |
| Candidate shell namespace | `ftn-public-v2.3.0` |

### Candidate scope

- Replaces the catalogue-first homepage with the approved FTN Caribbean Ecosystem front door and exact two-action hierarchy.
- Uses locally generated, public-domain Natural Earth geometry for the Caribbean map atmosphere.
- Adds the registry-driven ecosystem reveal and keeps FTN Account in shared-utility status.
- Stops the shared workspace shell from promoting low-resolution directory panels into product heroes.
- Introduces an explicit approved-image versus interface-led surface contract, provenance records and release gates for desktop, mobile, keyboard and reduced-motion behavior.

### Candidate verification status

- Product Registry, CSP, backend source, asset-manifest, local-reference and JavaScript syntax audits pass locally.
- Browser, mobile, accessibility and performance gates run in the GitHub release workflow before merge.
- Production is not considered released until the merged commit, Pages deployment and apex-domain response are verified.

## Release rule

Git history and the verified production response are the final evidence for a live release. Source presence or a passing static audit alone must never be described as deployed functionality.
