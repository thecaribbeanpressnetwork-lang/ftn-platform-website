# FTN Platform Website — Version Record

This internal record tracks the website release state. The public website does not display build/version badges.

## Current production release — Functional Ecosystem Release

| Field | Value |
|---|---|
| Release state | **Production functional ecosystem release** |
| Production branch | `main` |
| Release commit | `7429fa70695c33e1928239eb31f05196b47073ca` |
| Release pull request | `#16` — Functional release: make FTN products operate as tools |
| Production host | Cloudflare Pages |
| Production domain | `ftnplatform.org` |
| Release date | 2026-08-10 |
| Community Connect | Separate application/repository; explicitly excluded from this website release pass |
| Architecture record | `GOVERNANCE/FTN_Functional_Ecosystem_Architecture_2026-08-10.md` |

### Release validation

PR #16 was squash-merged only after the exact head passed the automated **FTN Functional Release Gate**:

- **25 / 25 functional scenarios passed.**
- **12 / 12 critical mobile surfaces passed** at a 390×844 phone viewport, including the actual mobile FTN DJ and FTN DAW controls.
- **31 / 31 indexed non-Community-Connect public routes passed.**
- **Static local href/src scan passed** with no broken FTN references.
- Supabase Edge Function logs confirmed successful `200` responses for FTN media discovery, FTN Live source retrieval, Opportunities and Kaiso source retrieval during release testing.

### What the website is now

The repository is no longer only a marketing/informational shell. It remains FTN's canonical public entrance and trust layer, but it also contains **bounded, working public tools and demonstrations** where that capability genuinely belongs on the public web surface.

Current principal public products/capabilities represented by the Product Registry include:

- Community Connect — separate application, linked from this site.
- Mission Control — working public decision-support demonstration; not the secure institutional operations product.
- FTN Events — event brief, operational plan, provider discovery, RFQ preparation, local save/export.
- Face The Nation — programme/video hub and public participation desks.
- ibis.ai — shared FTN intelligence/task interface with FTN-data analysis, media discovery, cross-product handoff and downloadable visual generation where supported.
- FTN Riddim — music/creator workspace containing FTN DAW and FTN DJ.
- FTN Kaiso — Caribbean newsroom source radar and story-lead/verification desk.
- FTN Radio — source-backed Caribbean discovery/player plus programming, creator package and FTN EPK workflows.
- FTN Screen — Caribbean viewing/discovery plus filmmaker metadata and festival-readiness/matching tools.
- FTN Opportunities — source-backed official Caribbean opportunity discovery and application tracking.
- FTN Love — deliberately limited private/local compatibility brief; no claim of a live matching network.
- FTN Display Network — preparation-stage deployment/playlist/preview tools; no claim of a deployed remote screen network.
- FTN Live — public current-information surface; Observatory is the underlying monitoring capability.
- FTN TV — scheduled television subproduct with source-backed playback and tuneable guide.
- FTN Top Picks — supporting editorial/recommendation service with relationship disclosure.

### Shared infrastructure shipped in this release

- Shared Product Registry and truthful capability/status metadata.
- Shared Workspace Shell with corrected landmark semantics.
- Shared FTN media-discovery client and Supabase Edge Function; YouTube provider secrets remain server-side and a bounded public-search fallback prevents one missing API credential from taking down all media products.
- FTN Live source function using current NOAA/NESDIS/STAR GOES-19 Caribbean imagery.
- Source-backed Opportunities function using official CARICOM and Caribbean Development Bank pages.
- Kaiso source function for current institutional-release discovery.
- Consequential-transaction foundation using `ftn_platform_transactions`, RLS, server-side Turnstile verification and founder-review status boundaries.
- Automated Chromium functional, mobile, route-integrity and local-link release gates.

### Security and ownership work completed

- Provider/API secrets are not placed in browser code.
- Public Edge Functions are origin-restricted and require the FTN Supabase publishable client key.
- `ftn_platform_transactions` is RLS-protected with no anon/auth direct-write policy; consequential writes go through the server-side transaction function.
- Legacy anonymous execution of the DJ `SECURITY DEFINER` view-counter RPC was removed; service-role access only.
- DJ ownership RLS predicates were tightened and missing user-ID indexes added.
- Relevant trigger helper search paths were fixed.
- Community Connect security-definer view advisories were intentionally not changed because that product/app was outside this release scope.

### Founder/credential follow-ups

These are not reasons to misrepresent the released tools; they are the remaining external integration steps that require an FTN credential or founder-controlled authorization:

1. **Cloudflare Turnstile production widget/site key** on consequential public web forms. FTN does not bypass verification. Radio currently presents a safe user-controlled email fallback when the secure widget is absent.
2. **Founder-review Gmail draft automation** for POE/transaction escrow. The durable transaction record/status model exists; secure Gmail OAuth/backend draft creation still requires the FTN account authorization decision. Nothing is auto-sent.
3. **Optional YouTube Data API credential.** Current source discovery works through the server-side public-search fallback; the official API can be added later for stronger metadata and provider stability.
4. **Community Connect final website/app-store handoff** remains a separate release stream.

### Architecture supersession notice

This release materially supersedes older repository statements that described this project as a five-pillar, marketing-only website or treated Events, Riddim, Kaiso, Radio, Screen, Opportunities, Love and Display Network only as future modules. Those historical decisions remain useful context, but **current runtime truth is the Product Registry, this VERSION record, the 2026-08-10 functional architecture record, and the code/tests shipped in release commit `7429fa7…`**.

Do not remove working public capabilities merely to make the code match an older architecture note. If a historical document conflicts with the verified release state, reconcile the documentation to the current founder-approved ecosystem rather than regressing the product.

## Prior release candidate — Consolidation

The previous consolidation release candidate was tracked on `agent/site-consolidation-release` / PR #15. Its visual, registry and workspace consolidation work became part of the foundation for the functional ecosystem release above.

## Prior tagged history

The repository's existing tagged releases remain authoritative for historical versions. Use Git tags and Git history for prior release details.
