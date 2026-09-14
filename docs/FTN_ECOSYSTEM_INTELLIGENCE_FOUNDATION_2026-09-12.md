# FTN Ecosystem Intelligence foundation

Status: deployed foundation, public Tobago retrieval verified on 2026-09-12.

## Decision

EcoMap is a strategic reference, not a dependency or product to copy. FTN extends its existing Index, Source Gateway and `ftn-opportunities` route. The stable public contract is `ftn.ecosystem-resource/v1`; no third-party EcoMap runtime or data lock-in is introduced.

## Reused FTN capability

- `ftn_index_entities`, sources, fields, relationships, verification and Scout ingestion
- first-party `ftn-opportunities` Edge Function and Connection Fabric route
- existing authenticated saved-items boundary
- authoritative CARICOM and Caribbean Development Bank adapters

## Added now

- A normalized resource extension with provider, territory, delivery, eligibility, cost, payout-access, deadline, provenance, freshness, confidence and ownership/IP fields.
- Reviewed-only public RLS, owner-scoped feedback RLS, and server-only privacy-minimized analytics.
- Deterministic opportunity ranking with explicit Trinidad-and-Tobago uncertainty.
- HTTPS publisher allowlisting, retrieved-text sanitization, expiry filtering and canonical deduplication.
- A best-match pathway plus alternatives; ranking is relevance, never predicted acceptance.

## Public proof

Query: `Trinidad Tobago business support`, territory `Trinidad and Tobago`.

The live API returned five records with no source warnings. The first was the CDB notice “Building a Quality Culture in Trinidad And Tobago – Implementation of The National Quality Policy.” Its source named Trinidad and Tobago, while the API still required the applicant to verify eligibility. Cost and payout accessibility remained `unknown`.

## Deliberately deferred

- Referral case sharing, provider workspaces and sensitive client records
- Automated applications or outcome/success claims
- Broad UI redesign or a new card surface
- Paid data/platform dependency
- Unverified community submissions entering public results

These require separate product, consent, moderation and security decisions. The schema and API provide a stable FTN-owned base without prematurely exposing those surfaces.
