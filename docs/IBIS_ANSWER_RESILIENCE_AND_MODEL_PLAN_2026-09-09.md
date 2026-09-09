# FTN ibis — answer resilience and model plan

Status: source implementation and deterministic audits complete; deployment, live provider tests, local-runtime installation and browser acceptance remain after the usage reset.

## Decision gate

**BUILD NOW / PREPARE NOW:** make answering a governed capability with explicit health, timeout, fallback and evidence states.

**BUILD LATER:** local Ollama and voice-model execution after the reset, hardware check and model-term review.

**DEFER:** installing every named model. A large ungoverned model pile would increase attack surface, storage, maintenance and licence ambiguity without guaranteeing answers.

## Why ibis can still fail today

Redundancy in the code is not the same as verified redundancy in production. The likely failure points are:

1. Browser route or registry eligibility rejects the request before a provider is called.
2. Supabase secret is absent, expired or named differently from the function expectation.
3. Provider model ID is unavailable to the account or has changed.
4. Provider call times out before the fallback begins.
5. Fallback exists in source but is not deployed in the same environment/version.
6. A response arrives without usable text and is treated as a provider failure.
7. The UI race or stale-request guard renders an older failure over a newer answer.
8. Questions that should be deterministic are unnecessarily sent to a paid model.

The repair must measure each boundary, not merely add another model.

## Completed in source now

1. Added deterministic arithmetic, greeting, ibis-identity and FTN Product Registry answers.
2. Added a non-secret health action for the configured text-provider pool.
3. Added bounded Anthropic, Gemini, two OpenAI-compatible and Ollama adapters behind one stable ibis endpoint.
4. Added structured answer provenance: `provider`, `model`, `generatedAt`, `answerClass`, `evidenceState`, `requestId` and fallback state.
5. Added a short circuit breaker and a 24-second total request budget.
6. Added deterministic provider-failure and fallback tests to CI.
7. Added the public Founder Reasoning Model to every ibis reasoning prompt while keeping evolving private founder memory and funding configuration behind the server-backed founder and approved-device check.

## Tomorrow's deployment and acceptance sequence

1. Deploy the upgraded `ibis-assistant` Edge Function and verify its reported version and health response.
2. Run a live answer matrix: arithmetic, ibis identity, FTN navigation, current-data question, unknown question, long question and provider-outage simulation.
3. Verify at least two hosted providers with real secrets, then deliberately disable the first and prove the second answers.
4. Run Headspace browser, touch, accessibility and stale-response tests against production.
5. Check target hardware with CanIRun.ai or direct system telemetry, then install Ollama only if the machine can host the selected model reliably.
6. Review the exact Gemma, Qwen and Llama checkpoints for licence, safety, context size and memory requirements before enabling one.
7. Keep voice-model installation separate from answering and test it with the supplied voice samples; voice failure must never block text answers.
8. Publish only after production health, answer and privacy gates all pass.

## Candidate inclusion policy

The named tools are discovery candidates, not automatic production dependencies:

- **Ollama:** strong local-runtime candidate; use as a fallback boundary, not as an assumed cloud service.
- **Gemma, Qwen, Llama:** model-family candidates; each exact checkpoint needs licence, safety and hardware review.
- **Venice AI, Bytez, APIQik:** hosted-provider candidates; require current API terms, pricing, data handling and outage behaviour.
- **CanIRun.ai:** useful for hardware/model feasibility checks; not an ibis answer provider.
- **VidRender:** rendering candidate for media workflows; keep separate from the text-answer contract.
- **PromptFoo:** useful for adversarial prompt/evaluation suites; high-value for testing, not runtime inference.
- **MicroFish, NanoChat, Impeccable, Heretic, OpenViking:** investigate and classify after primary-repository verification. Do not enable from a name or video alone.

## YouTube scout rule

YouTube may discover candidates, tutorials and implementation evidence. It must never be treated as the source of truth for licence, security, pricing or model capabilities. The scout records the video, channel, date, repository link and claims; a second pass verifies those claims against the primary source.

## Acceptance criteria

- Simple questions answer even when the preferred provider is unavailable.
- A provider outage is visible in diagnostics but not exposed as confusing internal error text.
- No model is called without a bounded timeout and cost/permission classification.
- Text answering, voice synthesis, rendering and agent actions are separate failure domains.
- Every fallback answer identifies its source and evidence state.
