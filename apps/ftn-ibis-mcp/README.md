# FTN ibis — Caribbean Intelligence MCP server

This is the first portable FTN ibis app surface. It exposes read-only, provenance-preserving tools for ChatGPT and other MCP-compatible hosts while reusing the repository's founder-reviewed scout registry and public ibis identity record.

## Current archetype

`tool-only` MCP app. A widget is intentionally deferred until the tool contract and hosted connection are proven.

## Tools

- `search` — source-backed FTN/Caribbean records.
- `fetch` — retrieve an indexed record by id or exact source URL.
- `opportunity_scout` — rank founder-reviewed grants, procurement, accelerators, awards and partners.
- `route_intent` — transparent keyword routing to an FTN capability.
- `get_entity_profile` — identity, ownership and verification profile for FTN ibis.

The server does not submit applications, send messages, access private conversations, or collect user identity. Scores are priority signals, not probabilities. Original sources must be checked before action.

When the optional collector is configured, each tool call emits only an aggregate event (`tool-call`, `tool-success` or `tool-error`) to the FTN server-side usage collector. Set `FTN_IBIS_USAGE_WEBHOOK_URL` and `FTN_IBIS_USAGE_TOKEN` outside the repository. The founder can review the resulting 90-day evidence summary in **FTN Nexus Command → Ecosystem Data → FTN ibis Usage Evidence** after the migration and collector are deployed.

## Learning boundary

The public read-only tools do not silently learn from conversations. FTN ibis learning is designed as three explicit lanes:

1. **User-controlled memory:** an authenticated FTN account may later save a project, preference, intent, correction or decision to the Founder Cognitive Layer after clear confirmation.
2. **Aggregate adoption:** the service may measure privacy-preserving counts such as tool use, repeat use, source opens, errors and conversion events without retaining raw chat transcripts.
3. **Quality improvement:** de-identified corrections and accepted/rejected results may improve ranking rules and source quality; they do not silently rewrite a user's identity or claim consciousness.

Authenticated memory tools are intentionally not exposed in this first public slice. They require FTN Account/OAuth, explicit consent, retention controls, deletion, and per-user RLS before release. This keeps learning portable across ChatGPT, Claude, Gemini, the FTN website and WhatsApp without making any host the owner of the user's FTN memory.

## Local run

```sh
npm install
npm start
curl http://127.0.0.1:8787/health
```

MCP endpoint: `http://127.0.0.1:8787/mcp`

For ChatGPT Developer Mode, expose the endpoint through a public HTTPS tunnel and connect the resulting `/mcp` URL under **Settings → Apps & Connectors → Advanced settings**. Use a stable HTTPS deployment for public submission; do not submit a localhost or tunnel URL.

## Public identity

- Product: **FTN ibis — Caribbean Intelligence**
- Canonical page: https://ftnplatform.org/ibis/
- Privacy policy: https://ftnplatform.org/legal/privacy-policy/
- Support/funding contact: facethenationtt@gmail.com

## Remaining production work

1. Deploy this server behind a stable FTN-owned HTTPS endpoint.
2. Add authenticated workspace tools only after OAuth and consent are implemented.
3. Add an optional MCP Apps widget after the tool-only flow passes ChatGPT testing.
4. Prepare the app metadata, logo, test prompts, privacy/support evidence and publisher verification for directory review.
