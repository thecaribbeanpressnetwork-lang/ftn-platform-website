# Scarlett V1 — investor-readiness evidence pack

Date: 2026-09-19 (updated same day: V1 gap-closure pass ahead of the V2 branch)
Branch: `feature/scarlett-adaptive-interface-v1`
Companion documents: `SCARLETT_V1_AUDIT_AND_BUILD_PLAN_2026-09-19.md`,
`SCARLETT_ARCHITECTURE_AND_SECURITY_2026-09-19.md`

This pack states plainly what is proven, what is scaffolded, and what remains. It is not a
marketing document — every claim below points at either a real test, a real live-browser run, or
is explicitly labelled as not yet verified.

## 0. V1 gap-closure pass (before branching to V2)

Performed as a dedicated pass before cutting `feature/scarlett-consumer-v2`, per the explicit
instruction not to branch away from an unverified V1 foundation:

- **Broader visual QA**: three additional real, live sites exercised with the real unpacked
  extension via Playwright — Hacker News (sparse/minimal chrome), BBC News (dense real-world news
  homepage), Stripe.com (high-brand-color, mixed light/dark sections). Zero console errors on any.
  The panel stayed fully within the viewport on all three (no clipping on dense layouts). Full
  restore verified on all three. Stripe.com correctly triggered `HIGH` risk / Assist-only — its
  homepage genuinely discusses credit-card/payment-processing content at length, so this is the
  sensitive-surface policy working as intended, not a false positive.
- **Authenticated Google Docs/Sheets/Gmail/Calendar QA**: confirmed, not assumed, that no safe
  authenticated session is available. Checked two separate browser contexts — a fresh Playwright
  profile and this session's own built-in browser pane — and both landed on Google's real sign-in
  page (`accounts.google.com`) when navigating to `docs.google.com/document/create`. No credentials
  were entered in either case (this session does not have and will not enter real Google account
  credentials). **This remains an explicit, unresolved human QA item**: a person with their own
  Google account needs to load the unpacked extension and verify the Assist panel/selection handoff
  next to a real open Doc/Sheet, and Gmail/Calendar smoke QA, before any investor-ready claim covers
  those four surfaces.
- **Product Registry entry**: still deferred. The reasoning from the original pass still holds —
  there is no truthful public Scarlett destination page to route a registry entry's `route` field
  to, and forcing a `principal:true` entry would require unrelated sitewide integration work
  (sitemap/nav/footer/ecosystem-group) gated by a large, tightly-coupled regression suite. This is
  revisited once V2 ships a real installable/marketing destination.
- **Site-wide regression gates**: not run in full this pass either (same reasoning as the original
  V1 pass — nothing outside `apps/ftn-scarlett-browser-extension/`, its test, and `docs/` changed).

## 1. What Scarlett is (one line)

Scarlett is FTN's adaptive interface layer: it changes how an existing site is presented and
interacted with, based on page type, task and risk — it does not reason (that is ibis) and it does
not host complex multi-step work (that is Headspace).

## 2. Product proof

| Demo surface | Status | Evidence |
|---|---|---|
| Article page | **Live-verified this session** | Playwright QA against `en.wikipedia.org/wiki/Caribbean` with the real unpacked extension — see the completion report's "browser QA" section for the recorded pageType, mode transitions, console errors and restore result. |
| Government/public-information page | **Live-verified this session** | Playwright QA against `gov.uk` — same recorded evidence. |
| Commercial/listing page | **Verified against a local fixture, not a live commerce site** | A locally-served HTML fixture with real schema.org `Product`/`Offer` markup, a price, a deadline phrase and eligibility language was used deliberately instead of automating a real retail/property site, to avoid bot-detection/ToS risk to a third party — this is disclosed, not hidden. The extension's LISTING detection, price/deadline/eligibility extraction and Adapt behavior were exercised for real against it. |
| Google Docs | **Code-verified, not live-authenticated** | `knownApp()`'s host+path match for `docs.google.com/document/` is asserted by `tests/scarlett-v1-audit.mjs`; an unauthenticated Playwright probe confirmed the extension does not error when Google redirects to its own login page. Full authenticated editor behavior (Assist panel next to a real open document) was **not** exercised live this session — doing so would require entering a real Google account's credentials, which is out of scope under this session's safety rules. |
| Google Sheets | **Code-verified only** | Same reasoning as Docs — `docs.google.com/spreadsheets/` match is asserted by the test suite; no live authenticated run this session. |

**Mode behavior**: Original/Assist/Adapt, sensitive-surface downgrade, and complex-app downgrade
are enforced by `transformation-policy.js` and asserted by `tests/scarlett-v1-audit.mjs`; the
Playwright runs additionally exercised the real downgrade path live.

**Restore behavior**: verified both by the reversible-ledger design (see the architecture doc's
"Transformation engine" section) and, in the Playwright runs, by confirming
`document.documentElement` carries no `data-ftn-scarlett-*` attribute and the panel/control/style
elements are gone after switching back to Original.

**ibis/Headspace handoff**: verified structurally (review-before-send bridge, 15-minute session
storage TTL, nothing sent until an explicit click, Discard clears with zero network activity) by
both code inspection and the test suite. The Playwright run additionally exercised the storage
write and background-worker tab-open wiring; it did not click "Insert" against a live ibis session
(that would create real, non-reversible activity in FTN's production ibis product for no QA value).

## 3. Technical proof

- **Architecture**: `SCARLETT_ARCHITECTURE_AND_SECURITY_2026-09-19.md`.
- **Tests**: `tests/scarlett-v1-audit.mjs` — permissions, host-permission scope, no-network-call
  invariant (checked across every source file), page-model field presence, policy-contract shape,
  ledger metadata, accessibility layer, intent capture, Headspace escalation wiring, no
  Transform/Compare/Blend leakage. Exact run command and result are in the completion report.
- **Permissions**: `activeTab`, `scripting`, `storage`; host permissions limited to four exact
  `ftnplatform.org` paths (see the architecture doc's security section for the documented
  justification of the `ibis-headspace-preview` addition).
- **Privacy**: see the architecture doc's privacy section — local-only by default, a single
  minimized, reviewed, user-triggered handoff is the only path data can leave the browser.
- **Performance**: measured end-to-end (including extension-messaging overhead, not just algorithm
  time) during the Playwright runs — see the completion report for actual millisecond figures from
  this session's run, not estimates.
- **Regression status**: `tests/scarlett-v1-audit.mjs` passes; this branch's other pre-existing
  tests were not modified by this pass and were not re-run in full (out of scope — this pass
  touched only `apps/ftn-scarlett-browser-extension/`, `tests/scarlett-v1-audit.mjs` and `docs/`).

## 4. Strategic proof

**User value**: the same site becomes easier to use — clearer hierarchy, less peripheral clutter,
surfaced deadlines/prices/eligibility language, genuinely reversible accessibility improvements
(larger text, more spacing/wider targets, stronger focus outline) — without learning a new
interface or losing the original site's own controls and muscle memory.

**Ecosystem value**: Scarlett is the presentation layer that makes the rest of the FTN stack usable
in place, on any site, not just FTN's own products — it is the thing that turns "ibis can reason
about this" into "and here is where that reasoning shows up while you're actually doing the task."

**Ownership**: the transformation engine, page model, risk classifier and policy layer are 100%
FTN-authored, dependency-free (no third-party UI/animation/overlay library), and the only network
egress is to FTN's own domain. Nothing about Scarlett's core logic is vendor-locked.

**Data value**: none collected in V1 beyond what's already disclosed above (a locally-stored
accessibility preference, and a session-scoped, user-reviewed handoff payload that is deleted after
15 minutes or on first use). No aggregate telemetry, no friction/UX analytics — deliberately absent
per the product boundary (see §20 of the build-plan doc); a future privacy-preserving analytics
lane is a documented option, not something this pass implements.

**Revenue/economic value**: not scoped by this pass — Scarlett V1 is a proof product, not a priced
one. The natural lanes (consumer accessibility/productivity, business/enterprise workflow
augmentation and legacy-system overlays) are named in the product-definition doc; none are built.

**Execution cost**: the V1 extension is ~10 small, dependency-free JS files plus a manifest — no
build step, no bundler, no server component of its own. The marginal cost of maintaining it is low
relative to the rest of the FTN stack it depends on (ibis, Headspace).

**Future optionality**: the transformation-policy contract (`allowedOperations`/`blockedOperations`)
and the ledger's operation-typed structure are explicitly designed as extension points for
Transform/Compare/Blend later, without requiring a rewrite — see the architecture doc.

## 5. Defensibility (stated plainly, no overclaiming)

- An FTN-owned, reversible, ledgered transformation engine — not a wrapper around a third-party
  "reader mode" or content-extraction library.
- An FTN-owned local page model tuned to the same product boundary as the rest of the stack
  (deterministic, bounded, no model call), so Scarlett's behavior is auditable and free.
- A policy/risk layer that is data, not prose — testable, and already caught (in this pass's own
  test suite) the specific failure mode of a sensitive or complex-app page being over-adapted.
- Privacy model: nothing leaves the device without an explicit, reviewed, single click; this is a
  structural property of the code (no `fetch` anywhere in the extension), not a promise.
- Explicit, disclosed integration with ibis and Headspace rather than a competing reasoning layer.
- **No patent, exclusivity or "proprietary AI breakthrough" claim is made here, because none is
  true.** The defensibility is architectural discipline and integration, not a technical moat that
  would be hard for a competent team to replicate — that is a fair characterization, not
  undersold.

## 6. What is explicitly NOT done (read this before calling it investor-ready)

- **Product Registry entry** (build-plan/product-definition §27): deliberately deferred this pass.
  Adding Scarlett to `js/product-registry-data.js` as a principal public product would trigger a
  large, tightly cross-referenced regression suite (`tests/product-registry-audit.mjs`) that
  requires sitemap/nav/footer/ecosystem-group integration — real site-wide work, not an extension
  change, and out of this pass's bounded scope. Scarlett has no public marketing page yet, so there
  is nothing honest to route a registry entry's `route` field to without either fabricating a page
  or misrepresenting an existing one. This is a scope decision, not an oversight — it should be a
  dedicated follow-up pass once a real Scarlett landing/download page exists.
- **Transform / Compare / Blend**: not implemented, per explicit V1 scope instruction. Extension
  points exist (policy contract, ledger) but are not exercised.
- **Full Headspace escalation**: the escalation button and review-before-send bridge are real and
  live-testable; there is no dedicated Scarlett-aware view inside Headspace itself consuming the
  handoff context beyond what the generic bridge already inserts as text.
- **Live authenticated Google Docs/Sheets/Gmail/Calendar QA**: not performed (credentials
  out of scope). Code-level coverage exists; live proof does not yet.
- **Visual QA across dark/light/dense/sparse/high-brand-color sites**: extended in the V1 gap-
  closure pass (§0) to six real sites total (Wikipedia, gov.uk, Hacker News, BBC News, Stripe.com,
  plus the local listing fixture). Still not exhaustive — no genuinely dark-themed site (dark by
  default, not via a toggle) or a right-to-left-language site has been exercised yet.
- **Chrome Web Store / Opera Add-ons submission**: unpacked-load only, as stated in the extension's
  own README; no store listing work was done.
