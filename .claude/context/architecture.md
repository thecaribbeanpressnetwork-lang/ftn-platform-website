# Architecture & engineering standards

## Stack

Vanilla HTML/CSS/JS. No framework, bundler, CSS preprocessor, or JS library without explicit
founder approval first (see decisions.md's "architectural exception" entry for the one narrow,
already-approved exception: a hand-run, output-committed Node generator script with no runtime
dependency and no build step). This is a marketing/product-discovery site with real client-side
product workspaces layered on top — not an SPA framework application.

## Real current scale (2026-08-23 count, not the old ~17-page/~70-file narrative)

- **40 top-level page routes** (`*/index.html`) — see products.md for which are registry products
  versus supporting pages (legal, resources, sitemap, etc.).
- **141 files under `js/`** — far more than release-history.md's earlier phase counts describe.
  Grep before assuming a file does or doesn't exist; don't trust an old file inventory.
- **29 audit scripts under `tests/`** (`*.mjs`) covering routes, asset manifest, backend source,
  CSP, mobile, performance budget, Product Registry, surface system, Turnstile, and one
  `*-audit.mjs` per major FTN ibis capability.
- **3 GitHub Actions workflows**: `functional-release.yml` (release gate), `open-source-scout.yml`
  (weekly FTN Scout Problem Scout run), `static-pages.yml` (the actual production deploy).

## Folder structure (current, high-level)

```
/                        # 40 page routes, one folder per product/section, index.html each
/assets/                 # logos, icons, panels, heroes, social, community, mission-control, ...
/css/
  tokens.css              # design tokens
  base.css / utilities.css
  components/             # one file per component family (workspace-shell.css is the shared
                           # chrome for flagship product workspaces — see intelligence.md)
/js/                      # 141 files — product-registry-data.js is the product source of truth;
                           # see intelligence.md for the shared-engine files
/tests/                   # 29 *.mjs audit scripts — the release gates
/.github/workflows/       # functional-release.yml, open-source-scout.yml, static-pages.yml
/GOVERNANCE/               # FTN_Platform_Constitution_v1.0.md is highest authority where it and
                           # this file overlap; see current-state.md for which GOVERNANCE files
                           # are believed to cover the current v2.x architecture in more depth
/FTN_Master_Asset_Library_v1.0/   # reference source boards — never referenced live, never edited
/.claude/context/          # this directory — on-demand specialized context, see CLAUDE.md's
                           # routing table
VERSION.md                 # internal verified-production record — see current-state.md
```

**Never referenced live, never edited as part of a feature commit:**
`FTN_Master_Asset_Library_v1.0/` (raw reference boards) and anything under the removed
`DESIGN/`/`FOUNDATIONS/`/`KNOWLEDGE/`/`STANDARDS/`/`STRATEGY/`/`FTN_Strategic_Foundation_v1.0/`
directories — those were git-rm'd from the public repo (kept privately elsewhere) because this repo
has no build step and no routing config, so anything tracked here is directly servable at its
literal public path; internal/commercial strategy material must never live here again.

## Repository scope (unchanged principle)

- **Never modify Community Connect or Mission Control source code**, move files inside either
  application, or rename their assets — both are separate applications/repositories.
- Shared assets are always **copied** into this repo's own `/assets/` tree, never referenced in
  place from `FTN_Master_Asset_Library_v1.0/`.
- Don't redesign approved logos, invent new branding, or change approved colors (see
  design-system.md for what's locked vs. still open).

## HTML standards

- Semantic HTML5 landmarks (`header`, `nav`, `main`, `footer`, `section`, `article`) on every page.
- One `<h1>` per page; heading order must not skip levels.
- No inline `style` beyond a genuinely one-off value; no inline event-handler attributes — attach
  listeners from JS.
- Prefer composing pages from the existing content-block vocabulary (hero, feature, stats, CTA,
  testimonial, partner-logo, and the newer workspace-shell pattern) before inventing a new block
  type.

## CSS standards

- Author against design tokens (color/type/spacing/radius/shadow/breakpoints) — no magic numbers
  duplicating a token.
- Mobile-first media queries; breakpoints 375 / 768 / 1024 / 1260 / 1820px.
- Every component needs its documented states (default/hover/active/disabled/loading as
  applicable) — don't ship one missing a state that's on the design system.
- No CSS framework without approval. Avoid `!important` and deep selector nesting; flat,
  component-scoped class naming (BEM-ish).

## JavaScript standards

- Vanilla JS, no framework. Progressive enhancement: nav/forms/content work with JS disabled; JS
  adds behavior on top of working HTML, never gates core content.
- No inline scripts beyond a minimal bootstrap. Module pattern or `type="module"` to avoid global
  namespace pollution.

## Accessibility

- WCAG 2.2 AA floor.
- Every icon-only control needs an accessible name; every meaningful image needs real `alt`
  (`alt=""` if purely decorative).
- Color is never the only signal — pair with icon and/or text.
- Full keyboard operability for nav (including mobile menu), forms, and any interactive
  card/tab/accordion component.
- Verify actual contrast ratio for FTN red on both light and dark surfaces — don't assume it
  passes AA at small sizes (see design-system.md for the `--color-red-on-dark` token this
  produced).

## Performance

Core Web Vitals bar for every shipped page: **LCP ≤ 2.5s, INP ≤ 200ms, CLS ≤ 0.1.** Serve
WEBP/AVIF with fallback, size hero imagery deliberately, set explicit width/height or
`aspect-ratio` on images, keep JS minimal so INP stays low without a framework's hydration budget.
`tests/performance-budget.mjs` is the repo's own enforcement of this.

## SEO

Unique `<title>`/meta description per page; JSON-LD for `Organization`/`WebSite` at minimum;
Open Graph + Twitter Card tags using approved brand imagery (never a raw asset-library board);
canonical URLs; `sitemap.xml` kept in sync as pages are added; `robots.txt` present.

## Git workflow

- Conventional, descriptive commits (`feat:`, `fix:`, `docs:`, `style:`, `refactor:`, `chore:`) —
  message focuses on *why*.
- Never edit/delete files inside `FTN_Master_Asset_Library_v1.0/` as part of a feature commit.
- Don't commit unoptimized/raw exports — only optimized SVG/PNG/WEBP/AVIF outputs belong in
  `/assets/`.
- No secrets/API keys/credentials in any commit (note: a Supabase *publishable* key is not a
  secret by design — see current-state.md before flagging one as a leak).
- **Never force-push. Never skip hooks (`--no-verify`) or bypass signing without explicit request.**
  If a step can't be verified (no remote, no deploy target), say so explicitly rather than
  assuming success — this repo's own `VERSION.md` states the same rule for release claims:
  *"Git history and the verified production response are the final evidence for a live release."*

## Official release procedure

In order, stop-and-report rather than assume success on any unverifiable step: repository audit
(clean tree, no stray files) → full verification pass (the `tests/*.mjs` gates, responsive,
accessibility, regression) → `VERSION.md` updated → release commit → push → deployment
verification (only claim what was actually observed) → smoke test → release report. Never report a
push/deploy/cache state as successful without having actually checked it.
