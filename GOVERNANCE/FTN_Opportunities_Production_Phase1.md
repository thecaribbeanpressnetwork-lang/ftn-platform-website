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
- Provider-specific configuration must remain outside core Opportunities logic so future FTN-native, FTN-hosted, connected-provider and external-provider capabilities can be routed independently.
- Secrets and provider credentials must never be committed to this repository.

## Deferred architecture item — FTN Autonomous Opportunity & Provider Engine
**Status: DEFER. Do not build during the website completion pass.**

Preserve a future path toward:

**FTN Capability Registry → Provider Registry → Opportunity Registry → Relationship Registry → Provider Router → Opportunity Scout → Creative Engine → ibis.ai orchestration**

The current Opportunities page contributes only the pieces that naturally belong here today: structured demand/preferences, canonical future opportunity metadata expectations, provenance requirements, shared adapter usage and vendor independence. It does not introduce speculative registries, provider routing, scheduled scouts, autonomous applications or affiliate logic.

When the website completion/deployment foundation is mature enough, evaluate this deferred system through the FTN Nexus Decision Gate before implementation. At that stage explicitly classify components as BUILD NOW / PREPARE NOW / BUILD LATER / EXPERIMENT / DEFER / REJECT.

External services such as vidIQ may eventually be evaluated as discoverable/recommended providers where relevant, but no provider is privileged, registered or integrated in this phase. Recommendation quality and user value must remain independent of any future affiliate/referral relationship.

## Merge gate
Browser visual/interactivity review is required before merge.
