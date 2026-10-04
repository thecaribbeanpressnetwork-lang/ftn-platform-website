# FTN Platform Website — Version Record

This internal record separates verified production state from prepared work. The public website does not display build/version badges.

## Amari audio metadata servicing — 2026-10-04

Tracks 01, 02, 03, and 05–10 now use the verified 320 kbps, 48 kHz stereo DJ-pack derivatives of the canonical 24-bit WAV masters. Their encoded audio payloads are unchanged from that pack. Embedded tags consistently identify Amari Inniss, Doh Study Me. Study De Music., the track sequence, 2027 campaign branding, the canonical ISRCs, ℗ 2027 Boss Entertainment TT, Boss Entertainment Publishing and the current website cover art. Track 05's ISRC is TT-AJ2-26-00040. Versioned audio URLs refresh cached copies.

De Whole Road (04) is excluded from this update: the owner confirmed a takeover near 03:05 in the canonical source. A new stem-based audition requires listening approval before replacing its delivery copies. This servicing change does not certify that unresolved track. Original delivery files are archived outside the website repository.

Validation: all eighteen replacement WAV/MP3 delivery files decode fully, carry the expected tags/artwork and preserve their original audio payloads. All nine previous website files match the canonical master duration and correlate above 0.995. The repository-wide visual-asset manifest audit currently fails on an unchanged, already-published approved-v3 cover missing from its ledger; no cover asset was added or modified by this audio update. Production verification is recorded in the task QC report after publication.

## Deployment path (reconciled 2026-08-24)

`ftnplatform.org` is served by **Cloudflare Pages, via its native GitHub integration** — not by
the `.github/workflows/static-pages.yml` (GitHub Pages) workflow alone. Evidence: `curl -I
https://ftnplatform.org/` returns `Server: cloudflare` plus a `CF-RAY` header, and every response
header (CSP, Permissions-Policy, X-Frame-Options, the full set) matches this repo's root
`_headers` file character-for-character — `_headers` is a Cloudflare Pages convention with no
GitHub Pages equivalent, so GitHub Pages cannot be the header source for the live domain. A
`Cloudflare Pages` GitHub check also runs and reports success on every push to `main`, alongside
the separate `deploy` (GitHub Pages) check.

Both deploy in parallel from the same `main` branch push — GitHub Pages is not disabled or
superseded, it simply isn't what `ftnplatform.org` itself resolves to. This record previously
named the GitHub Pages workflow as *the* production path; that undercounted what actually serves
the custom domain. No deployment configuration was changed to produce this correction — it is a
documentation fix, verified by direct inspection of the live response, not a reconfiguration.

## Verified production baseline

| Field | Value |
|---|---|
| Production branch | `main` |
| Verified code commit | `3b5394c4012fbabbf7d9e5c1984a09e676263896` |
| Production verification date | 2026-08-19 |
| Production deploy path (custom domain) | Cloudflare Pages, native GitHub integration (no committed workflow file — see "Deployment path" above) |
| Parallel deploy path | `.github/workflows/static-pages.yml` (GitHub Pages) |
| Production domain | `ftnplatform.org` |
| Production shell namespace | `ftn-public-v2.3.1` |
| Community Connect | Separate protected application and repository |

## Production release — v2.3.0

| Field | Value |
|---|---|
| Release state | **Deployed and verified** |
| Release pull request | `#42` |
| Baseline | `481effc3c2f8a75b77aa0f4c64f15dd71601444d` |
| Production commit | `0577a72947a83f6dcc7638c760cc67351c4ff55f` |
| Released date | 2026-08-19 |
| Production shell namespace | `ftn-public-v2.3.0` |

### Candidate scope

- Replaces the catalogue-first homepage with the approved FTN Caribbean Ecosystem front door and exact two-action hierarchy.
- Uses locally generated, public-domain Natural Earth geometry for the Caribbean map atmosphere.
- Adds the registry-driven ecosystem reveal and keeps FTN Account in shared-utility status.
- Stops the shared workspace shell from promoting low-resolution directory panels into product heroes.
- Introduces an explicit approved-image versus interface-led surface contract, provenance records and release gates for desktop, mobile, keyboard and reduced-motion behavior.

### Verification status

- Product Registry, CSP, backend source, asset-manifest, local-reference and JavaScript syntax audits passed.
- Browser, mobile, accessibility, performance and FTN Surface System gates passed on the pull request and merged commit.
- GitHub Pages deployment run `32210654253` completed successfully.
- The apex-domain homepage and registry reveal, plus the interface-led FTN Screen product surface, were verified after deployment.

## Production repair — v2.3.1

| Field | Value |
|---|---|
| Release state | **Deployed and verified** |
| Release pull request | `#44` |
| Baseline | `232aab56baff5cb99182587cc3245088d61c3134` |
| Production commit | `3b5394c4012fbabbf7d9e5c1984a09e676263896` |
| Released date | 2026-08-19 |
| Production shell namespace | `ftn-public-v2.3.1` |

### Candidate scope

- Replaces the v2.3.0 flat map mask and hand-built bird with the exact founder-approved Caribbean ecosystem visual.
- Preserves the black institutional header, two-action hierarchy and purple-only FTN ibis direction.
- Adds restrained asynchronous signal glimmer with a no-motion alternative.
- Removes the shared product shell’s forced `cover` crop, 16:9 frame, 230px clamp, perspective tilt and mobile image suppression.
- Adds cache-safe asset URLs, governed provenance and CI-captured desktop/mobile visual evidence.

### Verification status

- Full functional release gate run `157` passed after merge preparation.
- Desktop and mobile visual QA passed against the founder-approved board; the evidence is recorded in `design-qa.md` and GitHub Actions artifact `9352180083`.
- The apex-domain homepage served the v2.3.1 HTML and stylesheet, the exact approved asset hash, the two-action contract and the restored lower living-network section after merge.

## Release rule

Git history and the verified production response are the final evidence for a live release. Source presence or a passing static audit alone must never be described as deployed functionality.
