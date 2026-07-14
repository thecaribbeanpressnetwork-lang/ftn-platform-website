# FTN Platform Website v1.9.0 — Founder Certification

**Date:** 2026-07-14
**Scope:** Independent, first-time-user-perspective re-verification of Sprint 1, performed after
the engineering report was already written — per the founder's explicit instruction not to treat
that report as sufficient on its own.

This pass found and fixed **4 real defects** that the original engineering verification missed.
All fixes below are already applied, re-tested, and re-verified as of this document. Nothing in
this report is asserted from memory — every claim was produced by a Playwright test, an axe-core
run, or a direct code read during this pass.

---

## Defects found and fixed during this certification

### 1. Country storage backward-compatibility break — **Critical**
`js/persisted-flag.js`'s consolidation of `country.js` silently changed the JSON envelope stored
in `localStorage` from `{ code: 'TT' }` to `{ value: 'TT' }`. Any real visitor who had already
selected a country under a prior release would have that selection silently stop being read —
`hasExplicitSelection()` would incorrectly return `false`, and the first-visit "Choose your home"
modal would reappear for a returning visitor.
**Fix:** added a configurable `storageValueKey` option to the factory; `country.js` now specifies
`storageValueKey: 'code'`, preserving its exact original storage contract.
**Verified:** simulated a returning visitor with the old-format value pre-seeded; confirmed it now
reads correctly and the modal does not reappear.

### 2. Layout shift on all 9 workspace pages — **Major**
Real Cumulative Layout Shift measurement (Layout Instability API, not estimated) found CLS scores
of **0.46–0.72 ("poor")** on every rebuilt product page. Root cause: `#workspace-root` is empty at
first paint by design (`js/workspace-shell.js` mounts everything via JS on `DOMContentLoaded`), so
the browser had nothing to reserve space for — when content appeared, the footer visibly jumped.
**Fix:** `#workspace-root:empty { min-height: 100vh; }` reserves space before mount.
**Verified:** re-measured CLS on all 9 workspace pages post-fix: **0.0002–0.02 ("good")** on every
one, homepage unaffected (0.0013, unchanged).

### 3. Duplicated `escapeHtml()` — **Major** (duplicate code)
Independently copy-pasted into all 9 workspace scripts plus `export-framework.js` — 10 copies of
the same function.
**Fix:** single implementation in `js/workspace-shell.js`, exposed as
`FTN.WorkspaceShell.escapeHtml`; all 9 workspace scripts now reference it.

### 4. Duplicated validation-error and export-row rendering — **Major** (duplicate code)
The "Fix the following" error panel was byte-identical across Events/Riddim/Screen and
functionally the same pattern in Radio/Love/Display Network (6 files). The TXT/JSON/Print
export-button row and its click-wiring logic was byte-identical across Events/Riddim/Screen.
**Fix:** both consolidated into `FTN.WorkspaceShell.renderErrorsHTML()` and
`exportRowHTML()`/`wireExportButtons()`; all 6 (errors) / 3 (export row) consumers updated.

**Also removed while checking for orphaned CSS:** `.workspace__header-actions` and
`.workspace__settings` — styled in `workspace-shell.css` but no element in `workspace-shell.js`
ever rendered them. Confirmed orphaned, deleted.

**Re-verification after all 4 fixes:** all 9 workspaces re-tested end-to-end (form fill → submit →
export download → save confirmation); full 26-page regression (0 console errors, 0 failed
requests, 0 overflow); 10-page × 5-breakpoint sweep; axe-core WCAG 2.2 AA sweep — all still clean,
same 2 pre-existing violations as before (see below), zero new ones introduced by these fixes.

---

## Certification checklist results

### Homepage
- All 12 panel images verified: correct native aspect ratio at render time (0.00–0.01% drift, i.e.
  none — pixel rounding only), zero broken image loads, correct route on every `href` (checked
  against `product-registry-data.js` directly, not assumed).
- Hover state confirmed via computed styles: `translateY(-3px)`, red border-color, drop shadow,
  all on a 0.15s transition. Press state: `translateY(-1px) scale(0.98)`, 0.12s. Both confirmed
  present and functioning, not just declared in CSS.
- `prefers-reduced-motion: reduce` correctly strips the transform transition while keeping
  border-color — verified via computed style in a reduced-motion browser context.
- One-screen fit re-confirmed: content height 813px at both 1440×900 and 1920×1080 (both viewports
  taller), compact mode verified at 1366×768 and 1280×720.
- Tablet (768px) and mobile (375px) both clean: no horizontal overflow, natural wrap to 4-then-1
  and 2-column grids respectively.

### Workspaces
- All 9 confirmed built on the Workspace Shell (same header/identity/notification/footer DOM
  shape, same atmosphere-application code path).
- Atmosphere confirmed unique per product by reading `product-registry-data.js`: 9 distinct accent
  colors, 6 distinct background treatments, 7 distinct motion profiles — no two products share an
  identical combination.
- Layout regressions/overflow: none, re-confirmed post-fix across all breakpoints.
- Duplicate styling: the 2 orphaned rules above were the only instance found; removed.
- Navigation: identical 6-item nav + footer across every page, confirmed via direct comparison,
  not assumed.

### Shared capabilities — consumer counts checked directly against the file system, not assumed
| Capability | Real consumers |
|---|---|
| Product Registry | 9 JS consumers + homepage's hand-synced static markup |
| Workspace Shell | 9 (all flagship workspaces) |
| Generator Engine | 1 (Events) |
| Entity Metadata Engine | 2 (Riddim, Screen) |
| Export Framework | 3 (Events, Riddim, Screen) |
| Search Foundation | 2 (Kaiso, Opportunities) |
| Media Intake/Playback | 3 (Riddim, Screen, Radio) |
| Integration Adapter Layer | 7 (every workspace with a real local-save action) |
| Intent Router | 1 (ibis.ai) |

No capability found to be reimplemented ad hoc anywhere it should have been shared, after the
fixes in items 3–4 above.

### User experience
- Keyboard navigation: full tab order verified through a live form (Events) including the
  visually-hidden Media Intake file input (confirmed focusable, confirmed visible 2px focus
  outline on its label) — Tab through every field, Enter submits.
- Focus states: visible on every interactive element checked (2px solid accent-color outline).
- Empty states: Kaiso and Opportunities both verified to show honest "nothing matched" messaging
  (not a blank panel) for a zero-result search.
- Validation messaging: verified on Events, Screen, Radio, Love, Display Network — real,
  field-specific messages, not generic "error" text.
- Success messaging: identical `notify()` mechanism confirmed across every workspace with a save
  action (by construction, since it's one shared function).
- Loading states: not applicable — every capability is synchronous/client-side, no network call
  exists to show a loading state for.

### Engineering
- Console errors: 0 across all 26 pages (re-checked after every fix in this pass).
- Broken links: 0 (27 unique internal targets crawled, all resolve 200).
- Missing assets: 0 (checked via response-status monitoring across every page load).
- Duplicate code introduced: 3 real instances found and fixed (items 3–4 above); none remaining
  found after a further pass over remaining shared patterns.
- Dead code: `css/components/product-page.css` (already removed pre-certification) plus the 2
  orphaned CSS rules found and removed during this pass.
- Placeholder content: none found on any of the 9 rebuilt pages or the homepage (checked for
  "Lorem ipsum," "Coming Soon," "TODO," "FIXME," stale "In Development" badges — one unrelated,
  pre-existing "Coming Soon" string exists in `js/display-mode.js`, a Phase 3.5 file untouched by
  Sprint 1 and out of this certification's scope).

### Performance
- Images: real dimensions, no upscaling, correct `width`/`height` attributes on every image
  (prevents layout shift by declaration, confirmed separately by the CLS measurement above).
  Panel PNGs are **not** available as WEBP/AVIF — this environment has no WEBP encoder (verified
  earlier in this program), so PNG is the only option available; file sizes are reasonable for the
  content (80–155KB each, ~1.3MB for all 12) but not optimal.
- No unnecessary JS execution: checked every new file for `setInterval`/`setTimeout` — the only
  instance is a legitimate one-shot blob-URL cleanup in the Export Framework, not a polling loop.
- Layout shift: see item 2 above — was a real, serious defect, now fixed and verified good.
- Load performance: homepage loads in ~900ms against the local dev server (50 requests, ~1.5MB
  total transfer, dominated by the 12 panel images). This number is **not representative of
  production** — no CDN, no HTTP/2 multiplexing benefit, no cache warm state — and should not be
  quoted as a production guarantee; it only confirms nothing is pathologically slow locally.

---

## Founder deliverables

### Would I personally certify this build for production?

**Yes, with the two Minor items below disclosed rather than hidden.** This pass found real defects
— one of them (the storage backward-compatibility break) would have caused a genuine, if minor,
bad experience for real returning visitors, and the CLS regression was a real, measurable
performance defect, not a nitpick. Both are now fixed and re-verified, not just found. Everything
else that surfaced was either already-known and founder-reserved (the success-green contrast gap)
or a documented, precedented architectural tradeoff (JS-required rendering, consistent with
Observatory and Mission Control Demo, which this site already ships and has already accepted).

### Full remaining issue list

| # | Issue | Severity | Status |
|---|---|---|---|
| 1 | Success-green contrast (`indicator-card__change--up` / `mc-kpi-card__trend--up`) | Minor | Pre-existing, founder-reserved (CLAUDE.md §5) — not a Sprint 1 defect, not touched |
| 2 | Panel images are PNG-only, no WEBP/AVIF | Minor | Environment limitation (no WEBP encoder available); file sizes still reasonable |
| 3 | Workspace pages render 100% via JS — no static fallback content if JS fails to load | Minor | Documented architectural tradeoff, consistent with existing Observatory/Mission Control Demo precedent; not a Sprint 1-specific regression |
| 4 | Local dev-server load timing isn't representative of production | Cosmetic | Informational only — will be re-measured post-deploy if/when pushed |

No Critical or Major issues remain open. The 4 defects found during this pass that *were*
Critical/Major (items 1–4 in the "Defects found and fixed" section above) are already fixed and
re-verified.

### Recommendation

**Release immediately** — no short list to fix first. Everything found during this certification
that rose above Minor severity has already been fixed and re-verified in this same pass, not
deferred. The 4 remaining items are honestly disclosed above so they aren't silently forgotten,
but none of them block a production release: two are pre-existing/out-of-scope, one is a real
environment limitation, and one is informational.
