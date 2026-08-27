# FTN Release Verification — 2026-08-27

Purpose: establish a human-authored verification checkpoint after the one-time `ibis-ai` canonical naming migration completed and retired itself.

## Source state entering this checkpoint

- Canonical intelligence product ID: `ibis-ai`
- Canonical product name: `ibis-ai`
- Canonical short name: `ibis-ai`
- Route preserved: `/ibis-ai/`
- One-time naming migration removed from the repository after successful execution.
- Product Registry audit updated to enforce the canonical `ibis-ai` identity.
- Generated footer surfaces synchronized from the Product Registry.

## Release rule

This checkpoint does not itself certify production. The normal FTN Index, Functional, Production Identity, browser link-click, and deployment workflows must pass against the commit containing this file before the release is considered verified.
