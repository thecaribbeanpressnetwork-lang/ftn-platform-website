# ibis project handoff index — 2026-09-08

This is the durable reading order for the current ibis organism work. It separates what is implemented, what is live, and what still requires a release gate.

## Decision

**PREPARE NOW.** The organism foundation is connected and the live Supabase semantic-memory migration is applied. The Headspace frontend still requires an exact-source deployment and browser verification before production-complete can be claimed.

## Reading order

1. **IBIS Founder Cognitive Layer** — the organism contract: identity, context, reasoning, provenance, learning, Butterfly Engine, Founder Resonance, permission boundaries and Mary’s Hill mission logic.
2. **IBIS Headspace Architecture** — the user-facing cognitive interface and the rule that capabilities must connect into Headspace rather than become isolated pages.
3. **IBIS Capability Matrix — Funding Seed** — the honest capability-status vocabulary and the funding/opportunity strategy that seeded this build.
4. **Perplexity External Red-Team Prompt** — the next independent gap review against leading AI assistants and agent systems.

## Current truth

| Layer | State |
|---|---|
| Founder Cognitive Layer | Implemented and covered by deterministic audits |
| Universal routing and orchestration | Implemented; permission and adapter gates are fail-closed |
| First-party opportunity backend | Connected through the canonical connection fabric |
| Semantic memory schema | Applied to the live Supabase project |
| Headspace page | Implemented separately from `/ibis-ai/`; not yet deployed from this exact source |
| Browser acceptance | Blocked by the provided Chromium runtime crashing; must pass in a supported browser environment |
| External consequential actions | Intentionally gated until a real adapter, authentication and permission exist |
| `/ibis-ai/` legacy surface | Deliberately unchanged |

## Non-negotiable truth boundary

ibis may model Ricardo’s reasoning and continuity, but the Founder Cognitive Layer is not consciousness, identity proof or an authorization credential. Founder Resonance can recognize continuity; it can never authorize imitation or consequential action.

## Release gate

Production-complete requires all of the following:

- deploy the exact connected Headspace source;
- run the browser acceptance suite against that deployed source;
- confirm live semantic-memory reads/writes under authenticated RLS;
- review the remaining Supabase advisor findings that affect exposed ibis paths;
- preserve the separate legacy `/ibis-ai/` route and the separate Headspace page boundary.

## Ownership and portability

The code, governance records, source adapters, capability taxonomy and data contracts remain FTN-owned artifacts. Provider-specific work must remain behind replaceable interfaces; no model vendor or connector is allowed to become the system’s authority.
