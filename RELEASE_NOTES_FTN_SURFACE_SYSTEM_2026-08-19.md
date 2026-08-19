# FTN Surface System and Caribbean Ecosystem Front Door

Release candidate: v2.3.0  
Prepared: 2026-08-19  
Baseline: `481effc3c2f8a75b77aa0f4c64f15dd71601444d`

## Public changes

- A black, atmospheric homepage now leads with “THE CARIBBEAN ECOSYSTEM.” and the two approved actions.
- The regional atmosphere uses a local SVG derived from Natural Earth public-domain map geometry.
- “EXPLORE THE ECOSYSTEM” reveals six purpose groups generated from Product Registry data, with direct product links and FTN Account separated as a shared utility.
- The shared product shell no longer turns directory panels into stretched heroes. Products without an approved production scene use a compact interface-led opening.
- The ibis workspace no longer enlarges its low-resolution directory panel.

## Governance and provenance

- `data/ftn-surface-assets.json` records approved production assets, focal points and intentional no-image fallbacks.
- The Natural Earth map is recorded in the governed visual asset manifest with source, licence and hash.
- Approved homepage and page-reference boards remain reference-only and are not committed as production artwork.
- No authentication, Supabase, God Mode, Mission Control or protected Community Connect application logic changed.

## Release gates

- Static Product Registry, asset-manifest, CSP, backend-source, JavaScript syntax and local-reference checks pass locally.
- The GitHub release workflow now gates the front door at desktop, 390px and 320px, keyboard operation, reduced motion and representative product shells before merge.
