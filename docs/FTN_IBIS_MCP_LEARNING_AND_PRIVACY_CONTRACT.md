# FTN ibis MCP learning and privacy contract

**Status:** foundation contract for the first FTN ibis MCP app

**Deployed read-only transport:** `https://jshmidfpqrajxtukzges.supabase.co/functions/v1/ftn-ibis-mcp` (live Edge Function; health and MCP handshake still require an external live/browser gate).

## Decision

FTN ibis should learn from use, but it must not silently ingest full conversations or infer a person's identity, funding intent or sensitive traits. The initial ChatGPT/LLM connector is read-only. Learning is added through explicit, bounded lanes owned by FTN.

## Three learning lanes

### 1. User-controlled Founder Cognitive Layer memory

Only after FTN Account/OAuth authentication and clear user confirmation may ibis save:

- project goals and active intents;
- stated preferences and constraints;
- corrections to a source or recommendation;
- decisions, outcomes and reasoning summaries the user chooses to preserve;
- saved opportunities, preparation status and next actions.

Each record must carry owner, purpose, source, consent state, created/updated time, retention policy and deletion path. Founder Resonance or any cognitive score is never authentication, and memory must never be represented as consciousness transfer.

### 2. Privacy-preserving adoption signals

The service may retain aggregate or pseudonymous operational metrics such as tool name, broad request category, success/error, latency band, source-open event, repeat-use cohort and paid conversion. Raw prompt text, full chat transcripts, email contents and WhatsApp contents are excluded by default.

Signals may support product improvement, grant reports and investor evidence. They must not be presented as proof that a specific person is a funder, copied FTN material or intends to invest.

### 3. Quality improvement

Explicit user corrections and accepted/rejected outputs may be de-identified and used to improve deterministic routing, source freshness, opportunity ranking and evaluation sets. Changes must be reviewable and reversible. No silent model-weight training or hidden behavioural targeting is implied.

## Cross-LLM portability

The FTN-owned MCP/API layer is the portable memory boundary. ChatGPT, Claude, Gemini, Copilot, the FTN website and WhatsApp are hosts or adapters; they do not own the user's FTN workspace. A user may disconnect a host without deleting FTN records, and may request deletion from FTN independently.

## Release gates before memory tools

- FTN Account/OAuth user identity verified server-side;
- per-user RLS and service-role-only write path;
- explicit save/forget confirmation in the host;
- export and deletion controls;
- retention schedule and privacy-policy language;
- audit events without raw content leakage;
- adversarial tests for prompt injection, cross-user access and accidental transcript capture.

## First implementation boundary

The current MCP slice exposes only `search`, `fetch`, `opportunity_scout`, `route_intent` and `get_entity_profile`. It does not claim to learn from a user's chat. The next authenticated slice may add `get_user_workspace` and `remember`, subject to every gate above.
