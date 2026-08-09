# FTN Opportunities — Production Phase 1

## Purpose
Turn FTN Opportunities from a static category/preference page into a useful opportunity-discovery foundation without representing nonexistent live listings, alerts or application services.

## Operational now
- Search the FTN opportunity taxonomy across jobs, grants, procurement, business support, scholarships/training and sponsorships.
- Build a structured Opportunity Profile covering preferred categories, territory, sector, career/business stage, work mode, target value, timing and matching context.
- Save Opportunity Profiles in the visitor's browser through the shared FTN Integration Adapter.
- Review recent locally saved profiles.
- Carry the current FTN country preference into the profile as context.

## Not yet operational
- Live job, grant, tender or sponsorship feeds.
- Employer/funder accounts or verified listing publication.
- Eligibility determination.
- Automated alerts or notifications.
- Applications, CV submission or procurement responses.
- Deadline monitoring.
- Cloud profile synchronization.

## Future listing data standard
Before an opportunity is represented as active, a canonical record should support at minimum: source/provenance, source URL or publisher identifier, territory, category, eligibility, opening date, deadline/expiry, last-verified timestamp, status and canonical FTN identifier. FTN should own the normalized record even when a third-party feed supplies the source data.

## Product Mnemonic Layer
The FTN Opportunities mnemonic is the **Rising Path / Signal Beacon**: a rising route through milestone nodes toward a cyan beacon. It represents movement from intent to opportunity. Ambiently it provides identity; after a successful Opportunity Profile save, the path, nodes and beacon pulse as positive completion feedback. Reduced-motion preferences disable animation.

## Ecosystem seam
The Opportunity Profile is useful future structured data for ibis.ai matching and FTN Opportunities personalization, but no cross-product sharing is activated in this phase. Any future reuse must respect user permission and purpose limitation.

## Ownership / architecture
- Reuses Product Registry, Workspace Shell, Search Foundation, Country Registry, shared storage and Integration Adapter.
- No listing vendor, proprietary identifier or external credential is introduced.
- Future providers should map into FTN-owned canonical opportunity records rather than becoming the system of record.

## Merge gate
Browser visual/interactivity review is required before merge.
