# FTN Release Verification — 2026-08-27

Purpose: establish the final human-authored verification checkpoint after the `ibis-ai` canonical naming work, public-surface corrections, and Events interaction repair completed and their one-time migration workflows retired.

## Source state entering this checkpoint

- Canonical intelligence product ID, product name and short name: `ibis-ai`.
- Route preserved: `/ibis-ai/`.
- Public `/ibis-ai/` title, metadata and hand-authored Intelligence footer use the canonical `ibis-ai` identity.
- Events hand-authored footer residue corrected from `FTN ibis` to `ibis-ai`.
- FTN Events no longer renders an empty `mailto:` before an RFQ exists. The Email RFQ control starts as an in-page disabled-state action and becomes a populated `mailto:` only after RFQ content is generated.
- Browser link-click audit now applies interaction semantics correctly: every rendered anchor definition is validated; actionable FTN-owned destinations are exercised; skip links are keyboard-activated; local resources are requested; external link contracts are validated without treating third-party anti-bot/network behavior as an FTN defect.
- Product Registry audit enforces the canonical `ibis-ai` identity.
- Generated footer surfaces remain synchronized from the Product Registry.
- One-time naming, public-surface and Events repair workflows removed after successful execution.
- Community Connect Android acceptance build, browser interaction audit and production dependency audit passed on app commit `5a529bb2fac7a0796bf15631e0381a210e1c0512`.

## Release rule

The release is certified only when the normal FTN Index, Functional, Production Identity, browser link-click and deployment workflows all pass against the commit containing this checkpoint.
