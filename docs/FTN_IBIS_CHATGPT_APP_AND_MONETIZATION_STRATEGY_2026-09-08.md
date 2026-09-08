# FTN ibis ChatGPT App and monetization strategy

**Decision:** BUILD NOW as a private/developer-mode MCP App proof; PREPARE NOW for public plugin submission; do not make GPT Store usage payouts the business model.

## The product

**FTN ibis** is a Caribbean-specific intelligence and opportunity layer that can sit inside ChatGPT and other compatible hosts. It should answer locally relevant questions with source attribution, route users to FTN capabilities, find Caribbean opportunities, help prepare applications and reports, and connect to authenticated FTN services when the user explicitly authorizes it.

The app should be more than a prompt wrapper. Its defensibility is the FTN-owned source registry, provenance, Caribbean opportunity graph, capability routing, Founder Cognitive Layer boundaries and useful workflows that generic chat does not provide.

## Will the language-model provider pay FTN for usage?

Do not assume so. Current official guidance confirms that publishing and sharing depend on account/workspace eligibility and policy review. It does not establish a guaranteed per-use payment stream for builders. The GPT Store may provide discovery, but it is not a dependable revenue forecast.

The plugin/App route is stronger because FTN controls the backend, product relationship and checkout. OpenAI’s current plugin monetization guidance recommends external checkout on the developer’s own domain for generally available commerce flows; embedded payment is limited to selected beta/marketplace cases and physical-goods scenarios.

## Revenue model

### Free discovery layer

- Caribbean public-information search with sources.
- Basic FTN product navigation.
- Limited opportunity discovery.
- Public project and funding brief.
- Clear invitation to use FTN-owned paid services.

Purpose: distribution, trust and useful first contact.

### Individual paid plans

Potential offers, validated before pricing:

- **FTN ibis Pro:** higher opportunity-search limits, saved research, application preparation, reports and alerts.
- **Creator/SME plan:** business discoverability, content and opportunity workflows, local funding and procurement intelligence.
- **Diaspora plan:** Caribbean market, property, business and service intelligence.

Charge through FTN’s own account/checkout system. Keep a free tier so the product can earn trust and reach.

### Institutional revenue

- Caribbean SME and business-intelligence subscriptions.
- Tourism, cultural, media and creator-sector intelligence.
- NGO, university and development-agency research workspaces.
- Municipal/public-interest deployments with strict data and editorial boundaries.
- White-label or API access for institutions that need Caribbean context inside their existing systems.

Institutional contracts are likely to be more valuable than consumer subscriptions in the early stage.

### Data and intelligence products

- Paid source-backed regional reports.
- Opportunity and funding alert feeds.
- Caribbean business/entity data services through FTN Index.
- API access to selected public, licensed and provenance-tagged records.

Never sell private user conversations or infer sensitive personal traits for commercial targeting. Monetize tools, reports, licensed data and outcomes—not hidden surveillance.

### Funded/public-interest lane

Use the app as a demonstrable public-interest technology product for grants, research collaborations, challenge prizes and development-agency contracts. Funding should accelerate source coverage, multilingual/voice access, independent safety review and regional infrastructure—not replace a path to earned revenue.

## Adoption signals for funders and investors

Usage can become credible traction evidence when it is measured as a small, auditable funnel:

- discovery: qualified visits, search impressions, referral sources and verified-domain conversions;
- activation: first source-backed answer, first opportunity brief, saved workspace or explicit FTN route;
- value: repeat users, completed briefs, alerts requested, applications prepared and source-citation opens;
- trust: correction rate, source freshness, opt-outs, support resolution and privacy incidents;
- conversion: paid checkout starts, completed purchases, pilot renewals, institutional conversations and grant referrals.

Report monthly aggregates, cohort retention and anonymized geography/sector bands. Do not claim that a view identifies a funder, proves copying or predicts an investment. Any private usage signal should remain server-side, consent-aware, retention-limited and excluded from public ranking. The strongest investor evidence is a chain from discovery to repeated value to a paid or contracted outcome.

## What people would pay for

Users will not pay simply for “an AI that knows the Caribbean.” They may pay for outcomes that are difficult to obtain elsewhere:

- a verified opportunity they can actually apply for;
- a funding or procurement shortlist matched to their eligibility and payout constraints;
- a source-backed Trinidad and Tobago or Caribbean briefing;
- a prepared grant, business or creator submission;
- a business profile that becomes easier for search systems and customers to discover;
- a private workspace that remembers authorized projects and decisions;
- an institutional intelligence feed with freshness, provenance and export controls.

## App architecture

Use the ChatGPT Apps/MCP pattern rather than a GPT-only prompt:

1. `search` — find public FTN/Caribbean records and opportunities.
2. `fetch` — retrieve a specific source-backed record.
3. `route_intent` — map a user goal to an FTN capability.
4. `prepare_opportunity` — produce a source-backed application/action brief without submitting it.
5. `get_entity_profile` — return an FTN Index/Caribbean business record with provenance.
6. `get_user_workspace` — authenticated, permissioned saved work only.
7. `start_paid_service` — link to FTN-owned checkout; never charge silently inside a read-only tool.

Read-only tools should be the default. Mutating tools must require explicit confirmation, accurate annotations and a privacy policy. The public app should not request broad conversation history or unnecessary personal data.

## Distribution strategy

- Canonical public page: `https://ftnplatform.org/ibis/`
- Verified builder/domain identity: FTN Platform / FTN ibis.
- Public plugin/app name: **FTN ibis — Caribbean Intelligence**.
- Description: “Source-backed Caribbean intelligence, opportunities and FTN workflows with clear provenance and permission boundaries.”
- Use the FTN ibis public brief, machine record, provenance manifest, privacy policy and support contact in the submission package.
- Keep `/ibis-ai/` as the legacy compatibility surface while the app points to the connected organism.

## Strategic judgment

**BUILD NOW:** a narrow, useful developer-mode app around opportunity intelligence, source-backed Caribbean research and FTN routing.

**PREPARE NOW:** privacy policy, verified domain/builder profile, MCP server, search/fetch tools, paid-service links and evaluation set.

**BUILD LATER:** paid plans, institutional API, WhatsApp/voice access and white-label deployments after usage evidence.

**DEFER:** relying on GPT Store popularity, advertising against private conversations, selling raw chat data or building a generic Caribbean chatbot with no proprietary source/workflow advantage.

## Official references

- OpenAI [Plugin guidelines](https://developers.openai.com/plugins/app-guidelines)
- OpenAI [Plugin monetization / Checkout API](https://developers.openai.com/plugins/build/monetization)
- OpenAI [Sharing and publishing GPTs](https://help.openai.com/en/articles/8798878-sharing-and-publishing-gpts)
