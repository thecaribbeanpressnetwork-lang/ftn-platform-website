# FTN Platform Website — Version Record

This is an internal release record, not a public-facing UI element. The site itself deliberately
shows no visible version/build badge (a founder-consistent choice recorded in CLAUDE.md — this is a
marketing/institutional site, not versioned software end users need to identify by number). This
file exists so the release procedure has one authoritative place to check version/build/commit
consistency, per the FTN Release Procedure (first applied 2026-07-11).

| Field | Value |
|---|---|
| Platform version | 1.0.0 |
| Build number | 10 (commit count on `main` at release) |
| Commit hash (full) | `97d091de81f96e28976badbd20a62b62bcd880e9` |
| Commit hash (short) | `97d091d` |
| Release date | 2026-07-11 |
| Branch | `main` |
| Remote / deployment | None configured at this release — see release report |

## History

| Version | Date | Commit | Notes |
|---|---|---|---|
| 1.0.0 | 2026-07-11 | `97d091d` | First official release. Includes Phases 1–4, RC1 (cleanup/deployment readiness), RC2 (product journey/real screenshots), RC3 (Reality Engine consolidation/Presentation Engine groundwork). |

## Versioning policy

- Semantic versioning (`Major.Minor.Patch`) starting at `1.0.0` for the first official release.
- Build number is the `git rev-list --count HEAD` value on `main` at release time — monotonic, not
  reset per version.
- Update this file as part of every official release commit, before tagging.
