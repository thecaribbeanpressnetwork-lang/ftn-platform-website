# FTN Platform Website — Version Record

This is an internal release record, not a public-facing UI element. The site itself deliberately
shows no visible version/build badge (a founder-consistent choice recorded in CLAUDE.md — this is a
marketing/institutional site, not versioned software end users need to identify by number). This
file exists so the release procedure has one authoritative place to check version/build/commit
consistency, per the FTN Release Procedure (first applied 2026-07-11).

| Field | Value |
|---|---|
| Platform version | 1.0.0 |
| Canonical release marker | git tag `v1.0.0` — authoritative; resolve it (`git rev-parse v1.0.0`) rather than trusting a hardcoded hash in this file, which necessarily can't name its own commit |
| Last functional (code) commit | `97d091d` — RC3, Architecture & Excellence Pass |
| Release date | 2026-07-11 |
| Branch | `main` |
| Remote / deployment | None configured at this release — see release report |

Note on build number: a commit-count "build number" was considered and dropped from this table —
it can't stay accurate inside the file whose own commit it would need to count, and a wrong number
here is worse than no number. Use `git rev-list --count v1.0.0` if a build number is needed.

## History

| Version | Date | Tag | Notes |
|---|---|---|---|
| 1.0.0 | 2026-07-11 | `v1.0.0` | First official release. Includes Phases 1–4, RC1 (cleanup/deployment readiness), RC2 (product journey/real screenshots), RC3 (Reality Engine consolidation/Presentation Engine groundwork), plus this version record. |

## Versioning policy

- Semantic versioning (`Major.Minor.Patch`) starting at `1.0.0` for the first official release.
- Build number is the `git rev-list --count HEAD` value on `main` at release time — monotonic, not
  reset per version.
- Update this file as part of every official release commit, before tagging.
