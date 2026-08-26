# FTN Index — Founder Operations Runbook

Status: production v1 operating guide
Owner: FTN Platform

## What FTN Index is
FTN Index is the shared Caribbean entity, provenance, freshness and trust layer used by FTN products and future external APIs. Scout discovers candidates. The Index stores canonical entities and source history. Businesses may confirm/correct their public information free. Confirmation is not an FTN endorsement.

## What runs automatically
- `ftn-index-scout` runs daily at 09:17 UTC / 05:17 Trinidad & Tobago time.
- The first controlled lane is Trinidad & Tobago accommodation.
- Scout uses approved public discovery sources and stores discovered fields internally.
- Every candidate receives a deterministic quality state: PASS, REVIEW or REJECT.
- Only PASS candidates with a usable public business email are eligible for the outreach queue.
- Outreach transport is currently unconfigured, so no email is sent automatically.
- A completed same-day Scout run is skipped if called again.

## Quality states
### PASS
The candidate has enough corroborating public fields to enter the contactable queue. It is still provisional and not public.

### REVIEW
The candidate may be real but lacks enough corroborating fields. It stays internal. No outreach.

### REJECT
The candidate has a hard quality conflict such as an unusable name or a clear vertical mismatch. It stays internal. No outreach.

`do-not-contact` is reserved for a genuine business/person opt-out. Machine quality quarantine uses a separate non-send state so future Scout runs can rescore candidates without overriding a real opt-out.

## Public status
Provisional Scout discoveries are never exposed through the public Index. A record becomes public only after first-party confirmation or another explicitly approved provenance gate.

## FTN red confirmation
The FTN red confirmation mark means the organization recently confirmed its indexed public information. It does not mean FTN endorses, guarantees, licenses, rates, insures or recommends the organization.

Verification freshness is calculated from the last confirmation date and the entity confirmation window. Freshness and evidence confidence are separate concepts.

## Claim flow
1. Scout discovers a candidate.
2. Candidate passes quality gate.
3. A public business contact may be queued for outreach.
4. FTN generates a cryptographically random, single-use, expiring invitation.
5. The business opens its pre-populated FTN record.
6. The business confirms/corrects relevant fields only.
7. Previous values remain in history.
8. Confirmed fields receive first-party provenance and become public.
9. The entity receives current confirmation freshness.

## Cost Guard
FTN Index must not intentionally cross a free provider threshold without founder approval.

Tracked services include Supabase database, storage, egress, Edge Function invocations and the future email transport.

Operating rule:
- under 70%: normal
- 70%+: informational warning
- 85%+: founder warning
- 95%+: throttle noncritical autonomous work where practical
- free limit: hard stop unless founder-approved paid use is recorded

The email transport remains `unconfigured` until an approved free transport is intentionally connected.

## Data ownership rules
- FTN canonical IDs must not depend permanently on a third-party directory ID.
- Third-party discovery is an observation, not truth.
- Source provenance, timestamps and historical values are retained.
- First-party corrections never erase the previous observation history.
- Private account/security data must not be exposed through public Index/API responses.
- Public discovery data, account data and operational telemetry remain separate.
- Do not persist unnecessary click fingerprinting, IP history or unrelated personal data.

## Current production controls
Backend: existing FTN Supabase project.
Public site: existing FTN Cloudflare Pages deployment.
No physical server is required.
No separate paid database is required.
No paid email service is currently connected.

## Safe founder actions
Safe without changing architecture:
- review Index public pages
- inspect PASS/REVIEW/REJECT totals
- inspect provisional records and source provenance
- approve a future outreach transport after free-tier/cost review
- pause Scout scheduling
- change the active territory/vertical only through a reviewed release
- mark a real opt-out as do-not-contact

## Changes that require a release review
- adding a new discovery source
- adding a new business vertical schema
- changing the quality threshold or hard-reject rules
- changing verification freshness windows
- enabling outbound email
- exposing a new API surface
- changing public/provisional RLS boundaries
- changing canonical entity resolution rules

## v1 release gate
The release is acceptable only when:
- FTN Index CI gate passes
- full FTN functional release gate passes
- provisional data is unreadable to anon
- quality gating is active
- outreach remains blocked without an approved transport
- Cost Guard remains hard-stop/free-first
- claim/correction flow completes end-to-end
- public Index works on desktop and mobile

## Next controlled operating step after release
Do not expand Scout immediately. First inspect the PASS cohort, connect an approved free email transport, send a very small controlled invitation batch, measure completed confirmations per invitation, and only then increase acquisition volume.
