# FTN Platform Website — Version Record

This is an internal release record, not a public-facing UI element. The site itself deliberately
shows no visible version/build badge (a founder-consistent choice recorded in CLAUDE.md — this is a
marketing/institutional site, not versioned software end users need to identify by number). This
file exists so the release procedure has one authoritative place to check version/build/commit
consistency, per the FTN Release Procedure (first applied 2026-07-11).

| Field | Value |
|---|---|
| Platform version | 1.3.0 |
| Program milestone name | "Website Version 1.0" — the Founder-facing name for the Website Completion Program's completion; see the Versioning Note in `RELEASE_NOTES_v1.0.md` for why the git tag is `v1.3.0`, not `v1.0.0` (that tag already exists, pointing to an earlier, different release) |
| Canonical release marker | git tag `v1.3.0` — authoritative; resolve it (`git rev-parse v1.3.0`) rather than trusting a hardcoded hash in this file, which necessarily can't name its own commit |
| Release date | 2026-07-12 |
| Branch | `main` |
| Remote / deployment | `origin` = `https://github.com/thecaribbeanpressnetwork-lang/ftn-platform-website.git`; Cloudflare Pages, custom domain `ftnplatform.org` |

Note on build number: a commit-count "build number" was considered and dropped from this table —
it can't stay accurate inside the file whose own commit it would need to count, and a wrong number
here is worse than no number. Use `git rev-list --count v1.2.1` if a build number is needed.

## History

| Version | Date | Tag | Notes |
|---|---|---|---|
| 1.3.0 | 2026-07-12 | `v1.3.0` | Website Completion Program ("Website Version 1.0") — FTN Live/Contact/News/Insights product journeys, Executive Polish (visual experience locked), Presentation Mode / Live Mode global infrastructure, complete legal content across all four legal pages, an independent Engineering Release Certification (zero release blockers found), and a release-closeout repository-hygiene fix (internal strategy/governance material removed from the public repo — see `CLAUDE.md` §7.10). See `RELEASE_NOTES_v1.0.md` and `GOVERNANCE/FTN_Platform_Website_v1.0_Engineering_Release_Certification.md`. |
| 1.2.1 | 2026-07-12 | `v1.2.1` | Design Language Completion — extends the v1.2.0 design language to every interior page (new page-hero panel family, platform ecosystem diagram, redesigned Coming Soon pages, categorized sitemap, legal-page in-page indexes) and adds one restrained, fully progressive scroll-reveal moment. Mission Control Demo and Observatory deliberately left unchanged. See commit `60bed92` and the CLAUDE.md notes it added. |
| 1.2.0 | 2026-07-11 | `v1.2.0` | Institutional Identity Release — first major creative release. FTN design language established (hero-scale type, node-motif hero, scale-band narrative device, editorial split); homepage narrative and hero fully redesigned (no placeholder); 404 and footer redesigned; nav hover treatment refined; homepage brand-hierarchy fix (h1 no longer borrows Community Connect's tagline); domain/robots.txt/sitemap housekeeping. See §7.4 of CLAUDE.md. |
| 1.1 (unreleased/no tag) | 2026-07-11 | — | Governance Baseline v1.0 (`07d27ab`) and documentation-architecture lock (`cbdc6d0`) — founder decisions, Design Constitution, and Implementation Roadmap recorded. Explicitly not tagged or deployed as its own release per founder instruction; folded into the 1.2.0 release. |
| 1.0.0 | 2026-07-11 | `v1.0.0` | First official release. Includes Phases 1–4, RC1 (cleanup/deployment readiness), RC2 (product journey/real screenshots), RC3 (Reality Engine consolidation/Presentation Engine groundwork), plus this version record. |

## Versioning policy

- Semantic versioning (`Major.Minor.Patch`) starting at `1.0.0` for the first official release.
- Build number is the `git rev-list --count HEAD` value on `main` at release time — monotonic, not
  reset per version.
- Update this file as part of every official release commit, before tagging.
