# FTN Platform Website v1.9.0 — Engineering Release Report

**Program:** Sprint 0 (Architecture Optimization & Sprint Planning) + Sprint 1 (Shared Platform
Architecture)
**Release date:** 2026-07-14
**Prior release:** v1.8.0 (Ecosystem Completion Pass, 2026-07-13)

---

## 1. Summary

Sprint 0 was a read-only architecture review — full record in
`GOVERNANCE/FTN_Platform_Sprint0_Architecture_Review.md`. It answered the founder's central
question (is the 40–60% engineering-reduction estimate correct?) by distinguishing this
repository's own real, measurable duplication (~30–40%, "Track A") from the FTN ecosystem-wide
target once every pillar shares one engine instead of independently building its own ("Track B",
40–60%) — both figures correct, describing different scopes. The founder approved this framing,
approved a narrow generator-script exception to the vanilla-only mandate, and set Sprint 1's
philosophy explicitly: no more documentation-only sprints — every sprint designs, builds, and
integrates a real, working, honest capability into real products in the same sprint.

Sprint 1 executed that mandate in three waves: nine shared platform capabilities (Wave 1), all 9
flagship product pages rebuilt from static brochures into real working experiences on those
capabilities (Wave 2), and platform integration — a real internal deduplication, dead-code
removal, existing-product reconciliation, and full verification (Wave 3).

Every new capability was built with a real, verified consumer in the same wave it was built —
never speculative infrastructure. Every new product experience does real, deterministic,
client-side work on real user input and produces a real, non-fabricated output — never a
simulated AI response, a fake network call, or invented data.

## 2. Wave 1 — Shared Platform Capabilities

| Capability | File(s) | Scope shipped |
|---|---|---|
| Product Registry | `js/product-registry-data.js`, `js/product-registry.js` | Single source of truth per product (id, route, status, panel asset, atmosphere, keywords, capabilities). `homepagePanels()` feeds the homepage; `search()` powers the Intent Router. |
| Workspace Shell | `css/components/workspace-shell.css`, `js/workspace-shell.js` | Standard chrome (header/identity/notification/toolbar/content/footer) for every flagship workspace; atmosphere applied automatically from Registry data; reuses the existing heritage-layer motion vocabulary for 7 motion profiles. |
| Generator Engine | `js/generator-engine.js` | `run(generatorDef, input)` → validate then generate. Deliberately not an orchestration engine. |
| Entity Metadata Engine | `js/entity-metadata-engine.js` | Reusable schema/record architecture; only `music-release` and `screen-submission` registered (the founder's explicit refinement); 5 more entity types documented as extension points, not pre-built. |
| Export Framework | `js/export-framework.js` | Registered-handler map; `txt`/`json`/`print` shipped. |
| Search Foundation | `js/search-foundation.js` | `query(items, {filters, textQuery, groupBy, sortBy, limit})` → `{results, groups, total}`. |
| Media Intake/Playback | `js/media-intake.js` | Real client-side-only file attach + HTML5 preview; consistent "stays in your browser" disclosure. |
| Integration Adapter Layer | `js/integration-adapter.js` | One `submit(toolId, payload)` convention: save locally, honest confirmation. |
| Intent Router | `js/intent-router.js` | ibis.ai's real capability — transparent keyword matching against the Product Registry, explained back to the user. |

**Real bug found and fixed during Wave 1/2**: while building the Intent Router, `ProductRegistry.
search()`'s original substring-matching implementation let short/common query words match almost
anything ("to" inside "story", "a" inside "article"), returning noisy, misleading results (13
matches, including irrelevant products, for a pothole-report query). Rewrote to stopword-filtered,
whole-word matching. Same query now returns exactly 1 match, correctly explained.

**Homepage** rebuilt on the real founder-approved PNG panels (`assets/panels/`, 12 files) as the
actual clickable buttons — not recreated HTML cards. The panel grid is hand-authored static HTML
kept in sync with `product-registry-data.js` (the same convention already used for nav/footer
sitewide) rather than JS-rendered, preserving the site's progressive-enhancement mandate. Layout
tuned to fit the full 12-panel board on one screen at 1440×900 and 1920×1080 without scrolling —
verified by measuring the grid's actual bounding box against the viewport (813px content height
at both reference sizes, both well under 900px/1080px), not eyeballed. A `max-height: 800px`
compact mode handles shorter laptop displays (verified fitting at 1366×768 and 1280×720).

## 3. Wave 2 — Nine Product Workspaces

All 9 flagship product pages (previously static "In Development" brochure pages) rebuilt on the
Workspace Shell with a real first working experience:

| Product | Capabilities used | What's real |
|---|---|---|
| FTN Events | Generator Engine, Export Framework | 6-section event-planning checklist, genuinely conditional on venue type, guest count, budget tier, event type |
| FTN Riddim | Entity Metadata (`music-release`), Media Intake/Playback, Export | Release-sheet builder with real audio attach/preview |
| FTN Screen | Entity Metadata (`screen-submission`), Media Intake/Playback, Export | Submission-record builder with real video attach/preview |
| ibis.ai | Intent Router | Real transparent goal-to-product matching, no LLM |
| FTN Kaiso | Search Foundation | Live filter over 14 real coverage-beat categories; tip intake via existing `/contact/#general` |
| FTN Opportunities | Search Foundation, Integration Adapter | Live filter over 6 real category types; preference save |
| FTN Radio | Media Intake/Playback, Integration Adapter | Segment-idea intake with real audio attach/preview (plain fields, not a pre-built schema) |
| FTN Love | Integration Adapter | Values/goal preference intake, capped at 3 selections by real UI logic |
| Display Network | Integration Adapter | Deployment-interest intake; existing `/contact/#commercial` pathway for real follow-up |

Every workspace was verified end-to-end with real Playwright interaction — filling forms,
submitting, downloading exports, confirming saves — not just a visual screenshot check. Every
export download was opened and its content verified (JSON parses, contains the real submitted
data; TXT contains the real generated content).

## 4. Wave 3 — Platform Integration

- **`js/persisted-flag.js`** (new): extracted the storage/attribute/event plumbing
  `js/platform-mode.js` and `js/country.js` independently duplicated. Both rewritten as thin
  wrappers preserving their exact public API and event-detail shapes (`detail.mode`,
  `detail.code`). Verified via Playwright that `presentation-control.js`'s live event listener
  still fires correctly through the new factory — not just that persistence still works. New
  script tag added to all 28 pages that load `platform-mode.js`.
- **Card consolidation**: investigated before building anything new. Found the base card-box
  treatment (`.feature-card`, `.principle-card`, `.module-card`, `.workflow-step`, `.preview-card`,
  `.platform-flow__node`) was already unified into one shared rule in the v1.5.0 Executive Design
  System pass — confirmed by reading each variant's own rule, which carries only its deltas. No
  further consolidation needed; building a second layer over already-consolidated CSS would have
  been pure churn. What Wave 2 *did* leave dead: `css/components/product-page.css` — zero HTML
  files reference it once every dynamic product page moved to `workspace-shell.css`. Verified
  unreferenced, deleted.
- **Generator tooling formalization**: deliberately not built. It was scoped to formalize a script
  for stamping out static, templated pages — Wave 2 changed what the 9 product pages are (bespoke
  interactive workspaces, not shared template content), eliminating that use case.
- **Existing-product reconciliation** (Community Connect, Mission Control, Face the Nation, FTN
  Live): verified, not rebuilt, per explicit scope. Nav and footer confirmed consistent with every
  other page; zero broken links found.

## 5. Verification

- **Full-site crawl, all 26 pages**: HTTP 200, 0 console errors, 0 failed asset requests, 0
  horizontal overflow at 1440×900.
- **Internal link crawl**: 27 unique link targets discovered across all pages; 0 broken (all
  resolve 200).
- **Multi-breakpoint regression**: homepage + 9 rebuilt product pages × 5 breakpoints (375/768/
  1024/1440/1920) = 50 combinations, 0 overflow, 0 console errors.
- **axe-core WCAG 2.2 AA sweep, all 26 pages**: 2 violations total, both the pre-existing,
  founder-reserved success-green contrast gap already on record in CLAUDE.md §5
  (`indicator-card__change--up` / `mc-kpi-card__trend--up`) — not a new regression. **Zero new
  violations anywhere in the rebuilt homepage or any of the 9 rebuilt product workspaces.**
- **Shared-capability consumer counts**, checked explicitly:
  - Export Framework: 3 (Events, Riddim, Screen)
  - Search Foundation: 2 (Kaiso, Opportunities)
  - Media Intake/Playback: 3 (Riddim, Screen, Radio)
  - Entity Metadata Engine: 2 (Riddim, Screen)
  - Integration Adapter Layer: 7 (every workspace with a real local-save action — ibis.ai and
    Kaiso correctly have none, since neither has anything to save locally)
  - Workspace Shell: 9 (all flagship product workspaces)
  - Product Registry: 10 (9 JS consumers + the homepage's hand-synced static markup)
- **Homepage one-screen fit**: content height measured at 813px at both 1440×900 and 1920×1080
  (viewport heights 900/1080), confirmed fitting with margin at both founder-specified reference
  sizes, plus 1366×768 and 1280×720 via the compact-mode fallback.

## 6. What was deliberately not built

- No fabricated news articles, job listings, deployment schedules, or venue lists anywhere — every
  static dataset (Kaiso's coverage beats, Opportunities' categories) is honestly framed as
  category structure, not real live content.
- No simulated AI/LLM behavior anywhere — ibis.ai's matching is real, inspectable keyword overlap,
  shown transparently to the user.
- No Entity Metadata schemas beyond the two real Sprint 1 consumers — `event`, `news-story`,
  `opportunity`, `community-report`, and `radio-segment` remain documented extension points.
- No generator tooling formalization — the use case it was scoped for no longer exists after
  Wave 2's shift to bespoke interactive workspaces.
- No rebuild of Community Connect, Mission Control, Face the Nation, or FTN Live — reconciliation
  only, per explicit scope.

## 7. Release readiness

This report was written from real, observed tool output (Playwright interaction tests, axe-core
results, link crawls) — not asserted from memory. No step in this list was claimed successful
without being directly checked.

- [x] Repository audit: no stray temp/cache/duplicate files introduced this sprint.
- [x] Full verification pass: console/overflow/broken-links/responsive/accessibility, all above.
- [x] Version info updated: `VERSION.md` (1.9.0) and `CLAUDE.md` §7.16, internally consistent.
- [ ] Release commit — pending founder confirmation.
- [ ] Push to remote — pending founder confirmation.
- [ ] Source archive to `website version archive\` — pending founder confirmation.
- [ ] Production smoke test — not applicable until pushed/deployed.
