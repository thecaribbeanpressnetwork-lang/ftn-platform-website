# FTN Open-Source Adoption Policy

## Purpose

FTN uses open source to accelerate Caribbean-owned capability, not to outsource product ownership. A discovered project is never imported automatically and a public report is not an approval. FTN does not contact maintainers, make offers, or discuss compensation through this process.

## Default gate

| Licence / evidence | Default treatment |
|---|---|
| MIT, Apache-2.0, BSD, ISC, CC0 | Review candidate |
| MPL, EPL, LGPL | Legal and architecture review before any use |
| GPL, AGPL, SSPL, BUSL or equivalent | Exclude from public-site adoption unless the founder approves a separate architecture and legal path |
| Missing, custom or unclear licence; unclear model/data provenance | Manual review only |

## Adoption checklist

1. Verify the licence, release tag and upstream repository/model card directly.
2. Confirm the project solves a defined FTN need better than existing FTN code.
3. Review maintainer activity, dependencies, security posture and browser/mobile performance.
4. For models and datasets, record training/data provenance, commercial-output terms, retention, geographic relevance and any bias/privacy risks.
5. Integrate in an isolated branch; test public behaviour, accessibility and failure states.
6. Keep FTN interfaces and user data portable. Do not expose provider tokens or upload creator/citizen data by default.
7. Record version, attribution, notices and a removal/upgrade route before release.

## Non-negotiables

- No silent installation, download or code execution from scout results.
- Public availability is not permission to ignore the licence. Attribution is important, but it does not replace the specific licence, notice, source-disclosure or model/data conditions attached to a project.
- No model is described as FTN-owned merely because FTN can call it.
- No third-party music, video or user data is repurposed without documented permission.
- FTN retains ownership of its product design, integrations, data schema, user relationships and compiled deployment.
