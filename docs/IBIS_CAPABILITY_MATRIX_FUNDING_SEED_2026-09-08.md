# ibis Capability Matrix — Funding Seed

Date: 2026-09-08
Branch: `feature/ibis-1-interface`
Status rule: **never present a candidate as live.**

## Product thesis

**ibis is the Caribbean intelligence, intent and execution network.**

The funding story is not “we have more models.” The defensible seed is a layered system that combines Caribbean context, persistent intent, model/tool routing, connected apps, permissioned action, autonomous multi-agent execution, field/device intelligence and a distinctive Headspace interface.

## Status legend

- **WORKING + GATED** — implementation exists and is covered by automated tests/CI.
- **FOUNDATION WORKING** — primitive exists; production breadth or adapters remain incomplete.
- **ORCHESTRATOR READY / ADAPTERS NEEDED** — control logic is working but real external providers are not all connected.
- **DISCOVERY ONLY** — candidate catalog; not executable.
- **MISSING / P0** — required to approach Town/Polsia/Manus/Lindy execution maturity.

## Current ibis matrix

| Lane | Current capability | Status |
|---|---|---|
| Universal input | Topic-agnostic Universal Question Router with TEXT fallback | WORKING + GATED |
| Persistent context | Per-user Supabase memory with RLS; browser-local guest fallback | WORKING + GATED |
| Permissioning | ALLOW / ASK / DENY ledger, expiry and constraints | WORKING + GATED |
| Connected apps | Connection metadata, scopes, adapter boundary | FOUNDATION WORKING |
| Universal connection fabric | Direct → MCP → Activepieces → Nango → REST routing | WORKING SEED + GATED |
| Multi-agent company execution | Strategy, Engineering, Marketing, Comms, Ops, General | WORKING + GATED |
| Execution persistence | Execution runs + agent tasks persisted for signed-in users | WORKING FOUNDATION |
| Build delivery | BUILD → TEST → PUBLISH PREVIEW → VERIFY → SHARE | ORCHESTRATOR READY / ADAPTERS NEEDED |
| Deterministic math | Arithmetic, stats, regression, capital/return math | WORKING + GATED |
| Correlation | Exact-period correlation with non-causality guard | WORKING + GATED |
| Confidence | Source/freshness/claim/provenance confidence grading | WORKING + GATED |
| Capital Intelligence | Principal/income/yield/inflation scenarios | WORKING + GATED |
| Context Graph | Grounded FTN nodes/products/scout relationships | WORKING + GATED |
| Intent Graph | Private-by-default NEED/HAVE/PLAN/WATCH intents | WORKING + GATED |
| Opportunity Graph | Reviewed finding → intent matching | WORKING + GATED |
| Foresight | Evidence-backed prepare/watch suggestions | WORKING + GATED |
| Presentation Intelligence | Chart/table/KPI/range selection + provenance/live states | WORKING + GATED |
| Live state discipline | LIVE / LIVE MODEL / SNAPSHOT / DERIVED / SCENARIO | WORKING + GATED |
| Headspace | Spatial black cognitive interface; materialize/focus/drag/resize/mobile stack | WORKING PROTOTYPE + BROWSER GATE |
| Device/sensor bridge | Camera, mic, screen, location, motion/orientation, WebUSB/HID/Serial/Bluetooth/MIDI, instrument adapters | WORKING FOUNDATION + TRUTH GUARD |
| Thermal | Accept real thermal-capable sensor adapters; refuse fake RGB→FLIR | WORKING POLICY |
| UX/UI optimization | Accessibility, interaction, performance, conversion, Headspace audits | DISCOVERY ONLY |
| Creative AI | Music/image/video/audio/3D/open-model/free-credit catalog | DISCOVERY ONLY |
| Specialist intelligence | 39 lanes spanning finance, science, legal, geo, devices, commerce, security, docs, etc. | DISCOVERY ONLY |
| Model/provider registry | Gemini/Anthropic/Cloudflare + external/open model candidates | PARTIAL |
| Caribbean-specific graph/data | FTN Statistics, Nodes, Scout findings and Caribbean data seeds | FOUNDATION WORKING |

## Peer benchmark — what the funded products prove

### Town
Town proves the importance of one assistant with shared memory, connected apps, federated search, recurring routines and configurable approval modes. It also exposes connected data directly inside ordinary conversation.

### Polsia
Polsia proves that specialized Strategy, Engineering, Marketing, Comms and Ops agents can operate as a company-level execution network with shared persistent memory and live integrations.

### Lindy
Lindy proves that **integration breadth itself is a product moat**: 1,000+ app integrations, arbitrary MCP servers, recurring workflows and plain-language execution.

### Manus
Manus proves the connector abstraction: OAuth-connected third-party tools and MCP servers become unified tools available to an agent, with permission/cost control.

### ibis differentiation seed
ibis should not clone their UI. ibis should combine their execution primitives with:

- Caribbean Context Graph
- Intent Graph
- Opportunity Graph
- Caribbean Capital Intelligence
- Foresight / Butterfly / Trust
- physical-world/device and trades intelligence
- live Caribbean data discipline
- model/provider independence
- Headspace cognition interface

## P0 gaps before claiming execution parity

1. **Real Model Router** — score providers/models by quality, cost, latency, privacy, modality, reliability and Caribbean benchmark.
2. **Free Capacity Scout** — continuously discover free model quotas/trials/open weights and verify commercial/API eligibility before routing.
3. **Perplexity/research adapter** — official API or MCP integration for grounded web research; retain other search providers as fallback.
4. **MCP client + registry discovery** — connect remote/local MCP servers, inspect tools, cache capability schemas, permission every consequential tool call.
5. **Activepieces gateway** — primary broad low-cost/open integration bus; expose hundreds of apps/actions behind one ibis gateway.
6. **Nango OAuth gateway** — use where product-native OAuth/auth/token refresh and embedded Connect UI are preferable.
7. **Federated connected-source search** — one query over email, Drive, Slack, files, databases, CRM, etc., with source attribution.
8. **Real routine/watch engine** — persistent event/schedule/webhook triggers, retry, history and notification delivery.
9. **Secret broker** — server-side OAuth/API secret storage with rotation; browser never receives reusable credentials.
10. **Execution reliability layer** — queues, retries, idempotency keys, resumable runs, timeout budgets, compensating/undo actions.
11. **Real build/test/publish/share adapters** — GitHub/workspace builder, Playwright/CI tester, Cloudflare/Vercel preview publisher, Gmail/Slack/share adapter.
12. **Local computer bridge daemon** — files/apps/OS/hardware/vendor SDK access outside browser constraints.
13. **Mobile ingress** — voice, camera, share-sheet, push notifications and permitted SMS/WhatsApp/email entry points.
14. **Memory consolidation** — derive durable preferences/entities/projects from raw sessions without flooding context; user-reviewable memory summary.
15. **Entity/people graph** — contacts, companies, properties, projects and relationships across connected systems.
16. **Observability + cost ledger** — tool/model latency, failure, spend, free quota, retry, provider health and provenance.
17. **Caribbean eval harness** — benchmark models/tools on TT/Caribbean geography, institutions, language, finance, law, culture and field/trade workflows.
18. **Trust Engine + contradiction detection** — evidence facets, conflicts, freshness and claim type around every important answer/action.
19. **Butterfly Engine** — intervention/pathway reasoning with explicit causal uncertainty.
20. **Connector UX** — a Town/Manus-class `Connect` flow: search app → OAuth → choose scopes → approval mode → health/status → disconnect/revoke.

## Lowest-cost connection strategy

### 1. MCP first
Use the official MCP protocol and registry as the universal agent-native tool surface. ibis remains the host and retains memory, permissions, routing and provenance.

### 2. Activepieces as broad open integration bus
Activepieces is MIT/open-source, self-hostable, provides hundreds of app integrations/actions, OAuth connections, agents, approvals and MCP exposure. Use it to avoid rebuilding common integrations individually.

### 3. Nango for direct OAuth/API integrations
Nango provides a free developer tier plus auth/tool/sync infrastructure across hundreds of APIs and MCPs. Use it where ibis needs a polished product-native connect flow or direct API ownership.

### 4. Direct adapters for strategic apps
Build direct adapters only for apps where latency, UX, data model, reliability or economics justify owning the path: e.g. Gmail, Google Calendar/Drive, GitHub, Supabase, local computer bridge, key Caribbean data sources.

### 5. Generic REST last-mile
Any public API that is not covered by the above should be reachable through a constrained generic HTTP/REST capability with schema validation and permission controls.

## Funding proof target

Do not pitch “feature parity.” Demonstrate a **capability matrix seed**:

1. Ask ibis a general question.
2. ibis remembers personal/project context.
3. Connect Gmail/Calendar/Drive/GitHub plus one CRM through the universal Connect flow.
4. Ask one cross-app question; ibis federates context.
5. Give ibis an outcome requiring Strategy + Engineering + Comms.
6. Show agent plan and Permission Ledger.
7. Approve once.
8. ibis builds, tests, publishes a real preview and returns a verified URL.
9. ibis sends that URL through a connected app.
10. Ask “why did you do that?” and expose provenance, tools, sources, permissions and agent steps.
11. Use phone camera/location/device sensor in a trade/field Headspace.
12. Show Caribbean intelligence no generic assistant has natively.

If this loop is real, ibis does not need to match every mature feature of Town/Polsia/Lindy/Manus before fundraising. It demonstrates the same architectural class plus a differentiated Caribbean intelligence/device thesis.

## External references reviewed 2026-09-08

- Town Assistant / Context / Integrations: https://www.town.com/docs/
- Polsia public agent architecture: https://github.com/PolsiaAI/PolsiaAI
- Lindy integrations: https://www.lindy.ai/integrations
- Manus connectors: https://open.manus.im/docs/v2/connectors
- Activepieces integrations/open source: https://www.activepieces.com/pieces and https://www.activepieces.com/open-source
- Nango integrations/pricing: https://nango.dev/api-integrations and https://nango.dev/pricing
- MCP Registry: https://registry.modelcontextprotocol.io/
- MCP specification: https://modelcontextprotocol.io/
