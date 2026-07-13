# FTN Platform Website — Release Notes

## Version 1.4.0 — "Operational Phase 1"

**Release date:** 13 July 2026
**Git tag:** `v1.4.0`
**Reference:** `CLAUDE.md` §7.11 (Community Connect Public Beta Integration) and §7.12 (Face the Nation Platform Integration)

---

## Overview

The first two live operational platforms beyond the website itself, added in two sequential
sub-phases on top of the "Website Version 1.0" baseline (`v1.3.0`): Community Connect, the
citizen-reporting application, and Face the Nation, FTN's flagship public affairs programme.

## Phase 1A — Community Connect Public Beta Integration

- Discovered and verified Community Connect's real, existing application source (a separate
  repository, `github.com/thecaribbeanpressnetwork-lang/ftn-platform`) — vanilla HTML/CSS/JS +
  Supabase + PWA + Capacitor, "v1.0.6 Build 7 — Release Candidate Final."
- Deployment architecture: `community.ftnplatform.org`, a dedicated subdomain (not a path under
  this site) — the PWA's own service-worker scope and offline storage, plus native app deep-linking,
  are the deciding factors; this is the precedent for every future FTN product's deployment.
- New `/applications/` — the permanent home for FTN software products.
- `/community-connect/` upgraded into the official product page: Public Beta badge, version,
  beta disclaimer, supported devices, privacy reminder, a single "Launch Community Connect" exit
  point, and a "Beta Feedback" route into Contact's new ninth category.
- Every sitewide "Download App" CTA renamed to "Launch App"/"Launch Community Connect" and routed
  through the product page — one journey, no scattered entry points.
- The one sanctioned edit to Community Connect's own repository: `config.js`'s `WEBSITE_URL` field,
  set to `https://ftnplatform.org` (committed there, not pushed — that repository's remote is
  managed separately).

## Phase 1B — Face the Nation Platform Integration

- **Supersedes the 2026-07-11 Founder Decision** that kept Face the Nation out of navigation and
  the 404 page until it became a real, live product. The Founder confirmed it now is one — a
  production season in progress, with real approved brand assets and photography — so the
  restriction no longer applies to Face the Nation specifically (it still governs Display Network
  and Media Network, which remain non-clickable "Coming Soon" tiles).
- **Applications renamed to Platforms** sitewide (nav, footer, the hub page's own title) — the
  Founder's own judgment that this better reflects the long-term ecosystem (Community Connect,
  Mission Control, FTN Live, Face the Nation, Display Network, Media Network).
- **New `/facethenation`** (no trailing slash, by explicit design — verified to resolve correctly
  as a clean URL the same way Cloudflare Pages serves any `directory/index.html`). Built from the
  approved visual concept and the full production asset library (24 images reviewed): a clean,
  watermark-free master production photograph as the hero background, the approved circular badge
  logo, confirmed brand typography (Bebas Neue headlines, Montserrat/Inter body), and the show's
  own real tagline ("Every constituency. Every candidate. Every voice. Truth.").
- **A bounded dark "broadcast" treatment, not a site-wide theme change** — `<main class="ftn-show">`
  carries Face the Nation's own approved black/white/red identity; the shared header, footer, and
  navigation are completely unchanged. Same pattern already established by Observatory and Mission
  Control Demo.
- Sections built exactly to brief: hero (Follow Face the Nation / Season One Coming Soon), the
  Community Connect → Community Intelligence → Face the Nation → Public Discussion → Decision
  Makers → Better Communities flow diagram, a Season One "Coming Soon" panel, Follow the
  Conversation (five platforms, all honestly marked "Coming Soon" — no confirmed live URL was
  supplied for any of them), Be Part of the Conversation (Suggest a Topic / Become a Guest, both
  routed through the existing Contact mechanism), Programming (six planned segments, presented as
  planned, not unavailable), and a closing Community Connect band with a prominent Launch CTA.
- Production-quality Open Graph card composed from the real hero photograph
  (`assets/social/og-face-the-nation.jpg`, 1200×630) — verified against the actual tag set every
  major sharing surface (WhatsApp, Facebook, LinkedIn, X, Discord, Slack, iMessage) reads.

## Regression Fixes Found During This Release

Two real, verified defects were found and fixed during this release's own regression testing —
neither was assumed away:

1. **A composition collision in the Face the Nation hero** — the source photograph's own embedded
   "Face the Nation" signboard visually collided with the foreground headline repeating the same
   wordmark. Fixed with a left-weighted gradient so the text sits on a clean field while the
   photo's detail remains visible.
2. **A sitewide 8px horizontal overflow at the 1024px breakpoint**, introduced by adding a tenth
   top-level navigation item (Face the Nation) to an already-tight desktop nav bar. Fixed with a
   small, sitewide spacing reduction (nav item gap and padding) — verified back to zero overflow
   across all 19 pages × 5 breakpoints (95 combinations). A related CSS Grid bug on the new page's
   own social-platform cards (the same `1fr`-track-doesn't-shrink pattern already fixed once this
   program on FTN Live's hero grid) was found and fixed the same way (`minmax(0, 1fr)`).

## Known Limitation Carried Forward

At exactly 1024px width, the ten-item primary navigation wraps across two or three lines instead
of one — a density/capacity issue, not a functional break (every link and dropdown still works).
Fixing this fully would mean restructuring the nav itself, out of scope for an integration-only
pass; flagged for a dedicated pass if the Founder wants it addressed.

## Reference Documents

- `CLAUDE.md` §7.11 (Community Connect), §7.12 (Face the Nation)
- `VERSION.md` — canonical version/tag/commit record
