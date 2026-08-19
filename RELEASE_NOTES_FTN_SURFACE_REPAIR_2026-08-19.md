# FTN Surface Repair

Release: v2.3.1
Deployed and verified: 2026-08-19
Baseline: `232aab56baff5cb99182587cc3245088d61c3134`
Production pull request: `#44`
Production commit: `3b5394c4012fbabbf7d9e5c1984a09e676263896`

## Public repair

- Restores the founder-approved Caribbean ecosystem visual to the homepage without recreating the surrounding design frame as content.
- Removes the flat grey map-mask treatment and synthetic inline SVG bird introduced in v2.3.0.
- Keeps the approved black institutional header, “THE CARIBBEAN ECOSYSTEM.” message, two hero actions and supporting line.
- Uses only the purple FTN ibis contained in the approved visual.
- Preserves the Product Registry ecosystem reveal and Community Connect destination.

## Product-surface repair

- Approved product imagery is no longer forced into a cropped 16:9 banner.
- The shared shell now keeps intrinsic proportions with `object-fit: contain`, removes the 230px height clamp, and allows approved art to remain visible on mobile.
- Low-resolution reference boards remain reference-only until production-quality parent scenes are available; the repair does not silently regenerate or stretch them.

## Release controls

- Cache namespace advanced to `ftn-public-v2.3.1` and the approved homepage asset is included in the public shell.
- Static source, registry, asset provenance and local-reference gates pass locally.
- CI captures the rendered homepage at desktop and mobile widths for blocking visual review before merge.

## Production verification

- Functional release gate run `157` passed.
- Final desktop/mobile design QA passed and is recorded in `design-qa.md`.
- `ftnplatform.org` served the v2.3.1 HTML and CSS after merge.
- The live homepage asset SHA-256 matches the founder-approved source: `3a9c5a50846084d2a5bcf851b55ab21873b869666a98dcfdc7279705d12db324`.
