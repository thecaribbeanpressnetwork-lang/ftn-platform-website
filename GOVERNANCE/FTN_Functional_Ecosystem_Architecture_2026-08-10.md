# FTN Functional Ecosystem Architecture — 2026-08-10

**Status:** Current architecture decision record  
**Scope:** `thecaribbeanpressnetwork-lang/ftn-platform-website`  
**Production release:** `7429fa70695c33e1928239eb31f05196b47073ca`  
**Supersedes where conflicting:** older repository language describing FTN Platform Website as only a five-pillar marketing/informational shell or treating the current product set solely as future modules.

---

## 1. Decision

FTN Platform Website is the **canonical public entrance, trust layer and public-capability surface for the FTN ecosystem**.

It is not a monolithic replacement for every FTN application. It may, however, host bounded working tools, public demonstrations and shared services when those capabilities are appropriate for the public web and create genuine user value.

This resolves the false choice between "marketing website" and "application platform":

- the site **markets/explains** FTN;
- the site **operates real public tools** where appropriate;
- secure/private/institutional applications remain separate when their security, identity or deployment model requires it;
- shared interfaces/services are reused rather than rebuilding isolated applications.

## 2. Current product architecture

The current Product Registry and working routes are the runtime source of truth.

### Principal FTN products / public capability surfaces

| Product | Public role now | Boundary |
|---|---|---|
| Community Connect | Flagship citizen/community product page and handoff | Application is separate and was outside the 2026-08-10 website release pass |
| Mission Control | Interactive public decision-support demonstration with calculated analysis | Not the secure institutional operations environment |
| FTN Events | Working event brief, operational plan, provider discovery, RFQ and save/export workspace | No automatic vendor appointment/payment |
| Face The Nation | Programme/video hub plus Topic, Guest and Location participation desks | Editorial selection remains human-controlled |
| ibis.ai | Shared FTN intelligence/task interface, FTN-data analysis, media discovery, cross-product handoff, downloadable visual creation where supported | Never pretend deterministic routing is AI; external action remains user/founder controlled |
| FTN Riddim | Caribbean music workspace and parent for FTN DAW / FTN DJ | Rights-aware; no implied rights transfer or third-party registration |
| FTN Kaiso | Caribbean newsroom source radar and story-lead/verification desk | Sources/leads are not automatically facts or publications |
| FTN Radio | Caribbean discovery/player, programming briefs, creator package and FTN EPK workflows | Consequential creator submission uses verified/founder-review path |
| FTN Screen | Caribbean film/video discovery, filmmaker metadata and festival-readiness/matching | Festival submission/payment remains user-controlled |
| FTN Opportunities | Official-source Caribbean opportunity discovery, save/reminder/application tracker | User verifies final official eligibility/deadline/application instructions |
| FTN Love | Private local compatibility brief | Full matching network deferred until identity, privacy, moderation and safety infrastructure exists |
| FTN Display Network | Deployment brief plus local playlist builder/preview/export | No claim of deployed remote screens/proof-of-play yet |
| FTN Live | Public current-information surface including current Caribbean satellite imagery and change/relationship exploration | Observatory is the underlying monitoring capability; official warning authorities remain authoritative |

### Supporting/subproduct surfaces

- **FTN TV** — scheduled television subproduct with Atlantic-time guide and source-backed playback.
- **FTN Top Picks** — supporting recommendation/editorial service with relationship disclosure.
- **FTN DAW** — browser-local audio workstation within Riddim.
- **FTN DJ** — two-deck performance workspace within Riddim.

## 3. Shared architecture rules

### 3.1 Product Registry first

Before adding a product, route or capability, check whether it belongs in or extends the shared Product Registry. The registry defines public identity, route, capability truth, hierarchy and product status.

Do not create a second public product merely because a feature needs a page.

### 3.2 Shared services over isolated integrations

Capabilities used by several products should have one FTN-owned seam where practical.

Examples in the 2026-08-10 release:

- media discovery shared by Radio, DJ, Screen, TV, Face The Nation, Kaiso and ibis;
- Workspace Shell shared by public workspaces;
- Integration Adapter shared by local saves and consequential transactions;
- Product Registry shared by discovery/navigation/product truth;
- FTN Live/indicator/relationship datasets shared with Mission Control and ibis where appropriate.

### 3.3 Public web vs secure application

A capability belongs in this repository when it can be safely and usefully delivered as a public/static-web or bounded Edge-Function workflow.

A capability should remain a separate secure product when it requires, for example:

- institutional identity/role-based authorization;
- protected operational data;
- privileged agency workflows;
- private citizen records;
- secrets that cannot be safely exposed to the public browser;
- high-risk or legally consequential automation.

Mission Control's public demo and Community Connect's separate app demonstrate this boundary.

## 4. Data, provenance and ibis

Structured FTN data is a strategic asset, but collection must be purpose-limited.

Every new dataset/interface should answer:

1. What user or institutional value does this data create now?
2. Who produced it and from what source?
3. What is its classification/confidence/freshness?
4. What permissions govern its use?
5. Can ibis consume it later without scraping or guessing?
6. Does collection create unnecessary privacy or security risk?

Do not collect passwords, unrelated identity data, third-party credentials or personal information merely because it may be useful someday.

Deterministic calculations/routing remain labelled as deterministic functionality. ibis may orchestrate or explain them without falsely representing them as machine-learned intelligence.

## 5. Media discovery architecture

Public media products use the FTN-owned server-side discovery seam rather than embedding provider secrets in the browser.

Current architecture:

`browser FTN product → js/ftn-media-discovery.js → Supabase Edge Function dj-tube-discovery → provider`

Provider strategy:

1. YouTube Data API when a valid server-side credential is configured.
2. Bounded server-side public YouTube search parsing as a fallback.

Music-mode discovery excludes obvious mixes/compilations and very long tracks where duration metadata is available.

The original source/channel remains attributed. Discovery does not transfer ownership to FTN.

## 6. FTN Live architecture

FTN Live is the public live-information surface. "Observatory" is an underlying capability name, not a competing public product.

Current source-backed live layer includes NOAA/NESDIS/STAR GOES-19 Caribbean GeoColor imagery through an FTN Edge Function.

Mission Control and FTN Live may calculate changes/relationships over loaded indicator histories, but the calculation result must not increase the authority of the underlying data. Classification/source limits remain visible.

## 7. Opportunities and Kaiso source model

Source discovery should prefer official/authoritative publishers and retain a direct source URL.

### Opportunities

Current source-backed providers include CARICOM and Caribbean Development Bank pages. FTN indexes metadata for discovery and workflow support; applicants must use the official publisher for final eligibility, deadline and application instructions.

### Kaiso

Institutional releases and public video are source material/leads, not automatically verified reporting. Publication requires editorial verification, attribution and correction discipline.

## 8. Consequential transaction / POE boundary

The transaction architecture follows the FTN Submission & Draft Escrow Policy.

### Core rule

**Nothing external is automatically sent merely because a user completes a consequential FTN form.**

Qualifying transactions:

1. validate required metadata and authority declaration;
2. require human verification;
3. receive an FTN transaction ID/timestamp;
4. create a durable structured record;
5. enter founder review;
6. may later create founder-review correspondence/drafts through an authorized backend;
7. require explicit approval before external action.

Current durable store: `public.ftn_platform_transactions` with RLS and service-role server-side writes.

Current status boundary includes `FOUNDER_REVIEW`; future Gmail draft/sent IDs and POE suggestions remain linked to the same transaction record.

## 9. Security rules

- Provider secrets never belong in browser JS or the public repository.
- Supabase publishable keys are not secrets and may be used client-side only for endpoints designed for public clients.
- Public Edge Functions must still validate origin/purpose/input and bound workload; a publishable key is not authentication.
- Consequential writes require server-side verification and do not rely on client declarations alone.
- RLS protects direct database access.
- Avoid anonymous `SECURITY DEFINER` RPCs unless explicitly designed, bounded and rate-controlled for public use.
- Do not weaken security simply to make a demo appear functional.

## 10. Mobile and accessibility release rules

Every principal public tool must be usable on phone and desktop.

The automated release gate currently checks:

- 390×844 critical mobile surfaces;
- horizontal overflow;
- actual DJ/DAW mobile controls/touch targets;
- one valid `<main>` landmark per route;
- functional user scenarios;
- indexed-route integrity;
- broken local href/src references.

A hidden desktop control is not a mobile failure if a deliberate working mobile replacement exists. Tests must exercise the interface the user actually receives.

## 11. Release discipline

Consequential releases should use a branch/PR and objective gate before `main`.

The 2026-08-10 functional release established the baseline gate:

- functional scenarios;
- critical mobile scenarios;
- all indexed public routes;
- static local-link integrity.

Prefer a squash merge for a large repair pass so production has a single clean revert point.

Do not treat "page renders" as proof of functionality. Tests should perform the promised user journey and confirm meaningful output/state change.

## 12. Product claims

Public copy must describe what the product actually does now.

Use capability states such as working MVP, working demonstration, working foundation, limited tool or deferred when accurate. Do not use "AI", "live", "real-time", "automatic", "secure", "official", "submitted", "registered" or similar terms unless the implementation/source supports the claim.

When a dependency is missing, provide a truthful degraded path rather than a fake success state.

## 13. Revenue and trust

Revenue mechanisms must not undermine civic/editorial trust.

- Opportunity discovery should not become pay-to-access essential public opportunities.
- News verification must not be influenced by advertisers.
- Affiliate relationships require disclosure.
- Creator/festival/music services must not imply rights transfer, guaranteed placement or third-party acceptance.
- Display Network advertising remains bounded by public-information/editorial rules and future screen-owner controls.

## 14. Current external follow-ups

The functional release intentionally leaves these as founder/credential-controlled integrations rather than bypassing them:

1. production Cloudflare Turnstile site widget/site key for consequential forms;
2. secure founder-review Gmail draft automation for transaction escrow;
3. optional YouTube Data API credential for stronger provider metadata/stability;
4. Community Connect final app/web/store release, handled in its separate release stream.

## 15. Conflict rule for older documentation

Historical architecture records remain valuable evidence of how FTN evolved. They must not silently override a later founder decision and verified production release.

When this record, `VERSION.md`, the current Product Registry and tested production code agree, and an older repository paragraph conflicts with them, treat the older paragraph as historical/superseded and update it when practical rather than regressing the working product.

The future is not predicted. It is engineered through present decisions.
