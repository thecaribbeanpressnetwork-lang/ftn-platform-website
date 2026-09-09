# FTN ibis Intelligence Gateway

The public `ibis-assistant` function retains its existing URL and compatibility provider id. Internally it now routes through an FTN-owned gateway.

## Routing order

1. FTN deterministic answers and Product Registry answers.
2. Anthropic, when configured.
3. Google Gemini, when configured.
4. OpenAI-compatible primary provider.
5. OpenAI-compatible secondary provider.
6. Reachable FTN-controlled Ollama server.

Every provider call has a bounded timeout. Two consecutive failures open a short per-isolate circuit so the unhealthy provider is skipped temporarily. Total failure returns a non-empty honest degraded answer, provider/model placeholders, gateway version, uncertainty, fallback state and request ID; it never fabricates a substantive answer or leaves the interface blank. The health action exposes only non-secret provider configuration/circuit state and model identifiers.

## Optional secrets

Existing: `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL`, `GEMINI_API_KEY`, `GEMINI_MODEL`.

OpenAI-compatible primary: `IBIS_OPENAI_COMPAT_BASE_URL`, `IBIS_OPENAI_COMPAT_API_KEY`, `IBIS_OPENAI_COMPAT_MODEL`, `IBIS_OPENAI_COMPAT_PROVIDER`.

OpenAI-compatible secondary: `IBIS_OPENAI_COMPAT_2_BASE_URL`, `IBIS_OPENAI_COMPAT_2_API_KEY`, `IBIS_OPENAI_COMPAT_2_MODEL`, `IBIS_OPENAI_COMPAT_2_PROVIDER`.

Ollama: `IBIS_OLLAMA_BASE_URL`, `IBIS_OLLAMA_MODEL`, and optionally `IBIS_OLLAMA_API_KEY`.

Ollama has no localhost default because Supabase cannot reach a founder computer's localhost. It must be exposed through an authenticated, encrypted FTN-controlled endpoint before activation.

## Controlled deployment and proof

Run the manual GitHub Actions workflow **Deploy and verify ibis assistant gateway** from the exact reviewed commit. It requires the existing scoped `SUPABASE_ACCESS_TOKEN`, deploys only `ibis-assistant` to project `jshmidfpqrajxtukzges`, then runs `node scripts/verify-ibis-assistant-live.mjs`. The verifier requires the new gateway versioned health payload and proves `7 × 8` is answered deterministically without a model provider.

Provider-outage failover remains a separate operator acceptance test. Disable only the preferred provider in a controlled maintenance window, verify that an independent configured provider returns a non-empty answer with `fallbackState: "SUCCEEDED"`, then restore the provider. Do not expose or rotate secrets merely to demonstrate this in a public client.

## Founder Cognitive Layer

The FCL remains above the gateway and has two deliberately different projections:

1. **Public Founder Reasoning Model:** every ibis user receives Ricardo-derived principles, the seven-part decision gate and the founder reasoning method. This is the distinctive default ibis thinking layer.
2. **Private Founder Memory:** evolving decisions, outcomes, pathway weights, personal evidence and private funding configuration enter prompts only after `ftn-owner-control` verifies both the founder identity and approved device. A normal authenticated account is not enough.

The public projection contains governed doctrine, not private cognitive history. Raw private context and founder funding policy are removed from provider payloads when the owner check fails. Neither projection is Ricardo's consciousness or an authorization credential. External actions still require verified identity and the Permission Ledger.
