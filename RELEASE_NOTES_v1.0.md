# FTN Platform Website — Release Notes

## Version 1.0 — "Website Completion Program"

**Release date:** 12 July 2026
**Git tag:** `v1.3.0` (see the Versioning Note below — read this before assuming a mismatch)
**Engineering certification reference:** `GOVERNANCE/FTN_Platform_Website_v1.0_Engineering_Release_Certification.md`

---

## Versioning Note — why the tag says v1.3.0

"Version 1.0" in this document's title and throughout the Website Completion Program is the
**program's own name for this milestone** — the first point at which the FTN Platform Website is
considered complete, certified, and ready to meet the public. It is not a literal semantic-versioning
claim. This repository's git history already contains a tag `v1.0.0` (2026-07-11, the first
official release covering Phases 1–4 and Release Candidates 1–3) and has progressed through
`v1.2.0` and `v1.2.1` since. Re-using `v1.0.0` for this release would mean moving an existing,
already-referenced tag — a destructive, history-rewriting action this program does not take
lightly or without explicit authorization. The correct, non-destructive semantic version for this
body of work is **`v1.3.0`**, consistent with how `CLAUDE.md` itself has already been labeling the
Presentation Mode / Live Mode infrastructure work ("## 7.8 Version 1.3 — Presentation Mode / Live
Mode Infrastructure") since before this release was cut. The release archive and this document use
"v1.0" branding because that is what the Founder specified for this milestone's public identity;
the git tag uses the technically correct, non-colliding version number.

---

## Overview

This release closes the Website Completion Program: a sequence of Founder-issued engineering
passes that took the FTN Platform public website from an engineering-complete but content-thin
build through full product journeys, a global Presentation Mode / Live Mode architecture, complete
legal content, and an independent engineering audit. It is the first version of this website
considered ready for public deployment.

## Major Platform Capabilities

- **The Reality Engine** — a shared Indicator Engine, Relationship Engine, Trust Card evidence
  system, and Source Registry, all reading from one dataset so every platform (FTN Live, Mission
  Control, News, Insights) shows a consistent, sourced, classified picture of the same underlying
  information. No indicator, relationship, or statistic on the site is fabricated — everything
  carries an honest classification (Official / Sourced / FTN Derived / FTN Estimated / FTN
  Modelled / Demonstration) and, where a real source exists, a real source link.
- **Presentation Mode / Live Mode** — a single global platform-mode flag, persisted per browser,
  entered only through a deliberate `?mode=presentation` URL parameter, with a movable, dismissible
  floating control and a datasource seam (`js/data-source.js`) ready for a future production data
  engine to plug into without any rendering code changing shape.
- **Complete legal framework** — Privacy Policy, Terms of Service, Cookie Policy, and Data
  Retention Policy, drafted by the Founder and grounded against a full technical compliance audit
  of what the site actually collects, stores, and transmits (answer: no cookies, seven
  `localStorage` keys that are all UI preferences with zero personal data, an honestly-inert
  contact form, no analytics or tracking, a fully static site).
- **Mission Control Interactive Demonstration** — 8 fully working panels (Executive Dashboard,
  Correlation Engine, Reality Graph, Scenario Studio, Evidence Explorer, Strategic Advisor,
  Timeline & Memory, External Influence), explicitly and consistently disclosed as a public
  demonstration built on demonstration data, not the secure production application.
- **FTN Live (National Observatory)** — a live-feeling indicator wall with search, discovery
  (Random Indicator, Random Relationship, Did You Know), a Display Config system for kiosk/venue
  deployment, and a substantive six-tier commercial capability structure (FTN Display Network) for
  managed-screen deployments.
- **Integrated News and Insights** — built from real platform milestones and the same shared
  Reality Engine data, answering "what's happening" and "why it matters" as one connected
  experience rather than duplicated content.
- **A relationship-first Contact experience** — eight named pathways (General Enquiries,
  Government & Public Sector, Commercial Partnerships, Investors, Media & Press, Artist & Creative
  Services, Technical Support, Careers) instead of a generic contact form.

## Supported Flagship Platforms (as marketed/represented on this website)

| Platform | Status on this website |
|---|---|
| Community Connect | Marketed with real reference screenshots; app itself is a separate application/repository |
| Mission Control | Marketed, plus a full public Interactive Demonstration built on this site |
| FTN Live (Observatory) | Fully implemented on this website |
| Insights | Fully implemented on this website |
| News & Stories | Fully implemented on this website |
| FTN Display Network | A real commercial-packaging section on FTN Live; no dedicated top-level page yet |
| Media Network | Not implemented anywhere on this website — reserved as a brand name in the legal pages only, since it is not yet a real, live product |

## Architecture Summary

Vanilla HTML/CSS/JavaScript, no framework, no build step, no server-side code — a fully static
site (17 pages) deployed via Cloudflare Pages to `ftnplatform.org`. Every shared engine
(Indicators, Relationships, Trust Cards, Sources, Charts, Storage, Platform Mode, Data Source) is a
plain script loaded directly by `<script src>` tags in a documented, consistent order across all
17 pages, with header and footer markup kept byte-identical across every page. Design tokens
(color, type, spacing, radius, shadow, breakpoints) are centralized in `css/tokens.css`; every
component stylesheet is linked directly (not bundled) so the browser fetches them in parallel.

## Major Engineering Milestones (this program)

1. FTN Live — executive audit, product refinement, and a final completion pass.
2. Contact Experience — rebuilt around relationship pathways, not communication channels.
3. FTN Public Information — News and Insights, built as one integrated experience.
4. Executive Polish — full-site consistency pass; visual experience locked.
5. Presentation Mode / Live Mode — global platform-mode infrastructure.
6. Legal & Compliance Integration — full legal content across all four legal pages.
7. Engineering Release Certification — independent audit; zero release blockers found.
8. Release Closeout — a repository-hygiene finding (internal strategy/governance material was
   publicly servable) discovered and fixed during final audit; see `CLAUDE.md` §7.10.

## Known Version 1.1 Candidates

Real, deliberately deferred — not blockers:

1. A Trust Card "why it matters" text mismatch on the Recorded Murders indicator (shows generic
   category boilerplate instead of indicator-specific text).
2. A harmless script-load-order inconsistency on the Observatory page.
3. The footer "English" link reads as a language switcher but is a static homepage link.
4. FTN Display Network has real content but no dedicated top-level marketing page yet.

## Engineering Limitations (outside engineering scope)

No attorney review of the legal content has occurred yet; RealityArtTV Media's exact legal/
registered business name has not been independently confirmed; no operational contact channel
exists (the Contact form and legal pages disclose this honestly); Cloudflare account-level
settings were not and cannot be audited from this repository; the Google Fonts retain/self-host/
remove decision has not been made; Community Connect's own legal documents do not exist yet and
are required before that application's app-store release; no formal assistive-technology
certification has been performed against the site's WCAG 2.2 AA target.

## Reference Documents

- `GOVERNANCE/FTN_Platform_Website_v1.0_Technical_Compliance_Audit.md`
- `GOVERNANCE/FTN_Platform_Website_v1.0_Governance_and_Legal_Framework.md`
- `GOVERNANCE/FTN_Platform_Website_v1.0_Engineering_Release_Certification.md`
- `CLAUDE.md` — living engineering charter, §7.1–§7.10 cover this program in full
- `VERSION.md` — canonical version/tag/commit record
