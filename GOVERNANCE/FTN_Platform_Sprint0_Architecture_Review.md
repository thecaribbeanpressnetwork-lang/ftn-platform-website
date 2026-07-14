# FTN Platform — Sprint 0 Architecture Review

**Program:** Architecture Optimization & Sprint Planning (Sprint 0)
**Date:** 2026-07-14
**Status:** Read-only analysis — zero implementation shipped. Founder-reviewed and approved.
**Scope:** All 13 founder-approved FTN products. Product vision, branding, product identities, the
homepage ecosystem board, and Caribbean-first strategy were not touched or reconsidered — this is
engineering architecture only, per the founder's own explicit boundary for this task.

## Founder Decisions (2026-07-14)

1. **The Track A / Track B distinction (below) is approved as the correct framing.**
2. **The 40–60% engineering-reduction objective applies to the FTN ecosystem as a whole, not
   solely this website repository.** See the amendment under Finding 00 — read at the ecosystem
   level, this strengthens rather than weakens the case for designing shared engines now.
3. **A hand-run generator script is approved**, conditional on all four of: static, committed
   output · no runtime dependency · no production build step · generated output committed to the
   repository. This resolves the build-tooling risk this report originally flagged as High (see
   Risks, below) — Sprint 1's `/tools/generate-product-page.js` is designed to meet all four
   conditions exactly.

## 00 — Is 40–60% the right estimate?

**No, not as a claim about existing duplicated code — and the reason matters more than the
number.** The estimate conflates two different bodies of work:

- **Track A — this repository (the FTN Platform Website).** A real, live, 27-page static site
  (~4,500 lines of JavaScript, ~5,100 lines of CSS) with genuine, measurable duplication (see the
  Duplication Audit below). Consolidating this is realistic, scoped, and achievable in Sprint 1.
- **Track B — the future FTN Platform engines** (Upload, Media, Playback, Identity, AI
  Orchestration, Notification, Workflow, Export, Search, Publishing). **None of these exist in any
  FTN codebase today** — not in this website repo, not in Community Connect (the one product with
  a real backend, in a separate repository this website has no access to), not in Mission Control
  (explicitly, deliberately demonstration data), not anywhere for ibis.ai, Riddim, Kaiso, Radio,
  Screen, Opportunities, Love, Events, or Display Network, each currently a single honest "In
  Development" marketing page.

You cannot reduce duplicated engineering effort for an engine that was never built. Read strictly
against Track A alone, the realistic figure is **30–40%**, not 40–60%, and it applies to future
page/product-scaffolding work, not "all remaining engineering effort."

### Amendment — read at the ecosystem level (per Founder Decision 2)

At ecosystem scope, the original instinct holds up better. If Identity, Media, Notification, and
Workflow each get built *independently* by whichever product needs them first — Community
Connect's next version rolls its own session handling, Riddim rolls its own upload flow, Events
rolls its own workflow engine — that's not zero duplication, it's **duplication that hasn't
happened yet**. Counted against that realistic counterfactual (eight-plus products each eventually
building their own version of the same handful of engines) rather than against code that exists
today, a 40–60% reduction in *total ecosystem engineering effort* is a defensible target — the
difference between one Identity Engine and eight. Track A's 30–40% figure is unchanged for this
repository's own near-term work; the ecosystem-level 40–60% figure is the right frame for Track B,
captured by Sprints 2–6's contract-first, build-nothing-speculatively approach below.

### Also flagged: the homepage does not currently fit on one desktop screen

The brief lists "fits on one desktop screen, no scrolling" among locked founder-vision principles
already assumed true. Verified against production (2026-07-14): the live homepage is **~2,670px
tall at 1440×900** — roughly three screens of scrolling. Every other "locked" principle checked
true; this one didn't, so it's recorded here rather than silently treated as already satisfied.
Three concrete resolution options (denser grid, viewport-relative sizing, or redefining "one
screen" as true at a reference size only) are laid out in the Sprint 1 spec below — this report
does not pick one; that's a founder decision Sprint 1 is gated on.

## 01 — Platform Architecture

Four layers. The bottom two are real and working today; the top two are mostly aspirational.

```
Layer 4 — Product Surfaces (what users see)
  EXISTS      FTN Platform Website (this repo)
  EXISTS      Community Connect (separate repo, real app)
  PARTIAL     Mission Control (demo only)
  FUTURE      ibis.ai / Riddim / Kaiso / Radio / Screen / Opportunities / Love / Events /
              Display Network (marketing pages only)

Layer 3 — Shared Platform Engines (the target)
  PARTIAL     Country Registry, Relationship/Analytics Engine, Trust/Evidence Engine
  FUTURE      Identity, AI Orchestration, Media/Upload/Playback, Workflow,
              Notification, Search, Publishing/Export

Layer 2 — Shared Design & Content System (mature — the model to replicate for Layer 3)
  EXISTS      Design tokens (css/tokens.css), component library, content governance

Layer 1 — Infrastructure (per-product, independently hosted)
  EXISTS      Cloudflare Pages (this repo), Community Connect's own hosting/backend
  FUTURE      Per-product infra, provisioned as each engine gets a first real consumer
```

**The one governing rule this architecture depends on:** product source code stays in product
repositories; shared engines are consumed as versioned services or packages, never merged into a
single monolith. This generalizes the repo's own standing rule for Community Connect ("never
modify Community Connect source code... by the same logic, Mission Control") to every future
product.

## 02 — Shared Engine Map

| Engine | Status | What exists today | Who needs it |
|---|---|---|---|
| Design Token & Component Engine | **Exists** | `css/tokens.css` + shared component library, reused across all 13 product identities | Every product |
| Trust / Evidence Engine | Partial | `js/trust-card.js` + `js/source-registry.js` — real, working, currently scoped to indicator data only | Kaiso, Riddim, Mission Control |
| Relationship / Analytics Engine | Partial | `js/relationships-data.js` — real registry shared between Mission Control and FTN Live, 100% demo data | Mission Control, FTN Live, Opportunities, Kaiso |
| Country Registry | Partial | `js/country.js` — real persisted-preference flag, 6 countries (v1.6). UI preference, not a localization service | Every product |
| Identity Engine | **Future** | Nothing. v1.8.0's "Sign In" is a documented seam (`data-sign-in-entry`), not an engine | Every product, eventually |
| AI Orchestration Engine | **Future** | Nothing, anywhere. This is ibis.ai's entire product | ibis.ai; Events, Opportunities, Riddim as consumers |
| Media / Upload / Playback Engine | **Future** | Nothing here. Community Connect solved uploads independently, in its own repo | Riddim, Radio, Screen |
| Search Engine | **Future** | Observatory's search is an in-memory array filter over ~70 objects — not a real search engine | Opportunities, Kaiso, Riddim |
| Notification Engine | **Future** | Nothing | Almost every product |
| Session Engine | **Future** | `localStorage` preference flags exist; no auth, no server state, no expiry — a real, worth-naming distinction | Every product, once Identity Engine exists |
| Workflow Engine | **Future** | Nothing. Core to Events ("one prompt, one plan") and Opportunities | Events, Opportunities |
| Export Engine | **Future** | Nothing | Events, Mission Control |
| Metadata Engine | **Future** | Static JS data files are the closest analog, not a real service | Riddim |
| Publishing Engine | **Future** | Nothing | Kaiso, Screen, Riddim |
| Page / Template Generation Tooling | Partial | Built all 9 v1.8.0 product pages this pass — generator lived in a temp scratchpad, never committed | Every future product page |

## 03 — Product Dependency Map (target state)

Full 13-product × 11-engine matrix is in the companion artifact (linked below) — most cells marked
"exists" reflect the *website marketing page's* dependency, not a built product. Only Community
Connect and, partially, Mission Control have real product implementations today. Design Tokens is
the only engine every one of the 13 products already fully depends on and gets from a working
system.

## 04 — Duplication Audit (Track A only — Track B has no code yet to audit)

| Finding | Where | Scale | Fix |
|---|---|---|---|
| Header/footer markup duplicated verbatim | All 27 HTML pages | ~100 lines × 27 ≈ 2,700 duplicated lines | Committed generator tool (approved, see Founder Decision 3) |
| Product-page generator never committed | The v1.8.0 page-builder script lived in a scratchpad, not the repo | 9 pages, fully hand-editable duplicates | Promote to `/tools/generate-product-page.js` + versioned config |
| Five parallel "clickable tile" components | `.eco-card`, `.module-card`, `.feature-card`, `.principle-card`, `.product-feature-card` | 5 implementations of one concept | One `card.css` with modifiers — RC3 already proved this pattern (trend-glyph, classification-badge) |
| Status/badge styling re-duplicated after RC3 | `.module-card__status--live`, `.ecosystem__status--live`, `.product-status` | 3 separate implementations of "a colored status pill" | One badge component — would have caught the 3 v1.8.0 contrast bugs in one place instead of three |
| Two hand-built "persisted flag" systems | `js/platform-mode.js` (77 lines), `js/country.js` (84 lines) — structurally identical | ~160 lines that could be ~20 + 2 call sites | Extract `createPersistedFlag(key, options)` factory |
| 17 CSS files loaded regardless of page relevance | e.g. `mission-control-demo.css` on the Privacy Policy page | Unnecessary payload, not a correctness risk | Not urgent — future performance pass |

**Realistic Track A savings:** ~30–40% of future page/product-scaffolding work. See the Amendment
under Finding 00 for the ecosystem-level (Track B) framing of the founder's original 40–60% figure.

## 05 — Repository Structure

Minimal, additive changes only — no existing working file moves, nothing merges another product's
source into this repository.

```
FTN PLATFORM SITE/
├── index.html, about/, contact/, ...   (unchanged)
├── events/, ibis-ai/, riddim/, ...     (unchanged, now generated FROM /tools/)
├── css/components/card.css             NEW — consolidates 5 card systems
├── js/persisted-flag.js                NEW — shared factory
│   platform-mode.js, country.js        become thin wrappers around it
├── tools/                              NEW — repo-tracked build tooling
│   ├── generate-product-page.js        the generator, formalized
│   ├── products.config.json            one source of truth per product
│   └── sync-nav-footer.js              formalizes this session's repeated manual scripts
├── GOVERNANCE/ , CLAUDE.md             (unchanged)
```

`/tools/` is a hand-run, output-committed script only — approved per Founder Decision 3, never a
commit-time or request-time build process.

## 06 — Six-Sprint Delivery Plan

Sprint 1 completes the public FTN Platform experience. Every sprint after that is deliberately
scoped as **interface and contract design, not implementation** — building a real Upload Engine
before any product needs to upload a file would be exactly the "designing for hypothetical future
requirements" this codebase's own engineering principles already warn against.

| Sprint | Objective | Status |
|---|---|---|
| **1 — Complete the Public FTN Platform Experience** | Resolve the one-screen homepage gap, consolidate Track A duplication, formalize the page-generator tool | Build |
| **2 — Identity Engine, Contract Design** | Define the auth/session interface every product will eventually call | Design only |
| **3 — Country Registry v2 + Relationship Engine Extraction** | Promote the two most mature partial-engines to real, documented, versioned services | Extend existing |
| **4 — AI Orchestration Engine, Architecture Design** | Design ibis.ai's core architecture as an interface before any implementation | Design only |
| **5 — Media / Upload / Playback Engine, Contract Design** | One shared contract, designed against Riddim/Radio/Screen's needs and Community Connect's already-solved upload flow as reference | Design only |
| **6 — Workflow, Notification & Publishing Engines, Contract Design** | Close out the remaining named engines at the same design-only depth as Sprints 2, 4, 5 | Design only |

Full per-sprint Objective / Deliverables / Dependencies / Definition of Done breakdown is in the
companion artifact.

## 07 — Sprint 1 Engineering Specification (summary)

1. **Homepage one-screen decision (blocking on a founder choice)** — three concrete options
   (denser grid + minimal hero; viewport-relative `vh` sizing; redefine "one screen" as true at a
   reference desktop size only). Not pre-selected here.
2. **Card component consolidation** — new `css/components/card.css`, migrated one call site at a
   time with screenshot-diff verification before removing each old class.
3. **Persisted-flag factory** — `js/persisted-flag.js`, `platform-mode.js`/`country.js` become
   thin wrappers; public API unchanged.
4. **Product-page generator, formalized** — `/tools/generate-product-page.js` +
   `/tools/products.config.json`, hand-run, static output committed — meets all four Founder
   Decision 3 conditions.

**Acceptance criteria:** full regression (all pages × 5 breakpoints, 0 console errors/overflow/
broken images) · axe-core WCAG 2.2 AA clean · visual-parity screenshot diff per migrated
component/page · zero change to any page's public URL, content, or product identity.

## 08 — Engineering Risks & Recommendations

| Risk | Severity | Status |
|---|---|---|
| Vanilla-only mandate vs. build tooling | ~~High~~ | **Resolved 2026-07-14** — see Founder Decision 3 |
| Speculative over-engineering in Sprints 2–6 | High | Mitigated by design-only scoping + no-real-consumer-required Definition of Done for every future sprint |
| Community Connect boundary erosion | Medium | Any engine Community Connect would use must be consumed as a versioned package/API from outside its repository — study its solution, never absorb its code |
| Success-green and other unresolved brand tokens | Low | No action needed now; flagged so it doesn't surprise a future sprint touching Workflow/Notification UI |
| Partial-engine rollout inconsistency | Medium | Country Registry / country-scope messaging only wired into 2 of 13 products today — track adoption per-product explicitly (Section 03's matrix is the starting tracker) rather than assuming engine-exists means engine-adopted |
| Unnecessary CSS payload sitewide | Low | 17 stylesheets load regardless of page relevance — not urgent, future performance pass |

## Companion artifact

The full interactive version of this review — including the complete 13×11 product/engine
dependency matrix, the four-layer architecture diagram, and the full per-sprint breakdown — was
published as a Claude Artifact for the founder review that produced the decisions recorded above.
This document is the permanent, repository-tracked record of that review and its outcome.
