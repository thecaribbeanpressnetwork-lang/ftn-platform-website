# Perplexity External Red-Team Prompt — ibis Capability Gap Review

Use this prompt in Perplexity Deep Research / Agent mode with current web access.

---

You are performing an external investor-grade red-team review of **ibis**, an early-stage Caribbean intelligence, intent and execution network being built by FTN Platform.

Your job is NOT to praise it. Determine what is missing compared with the best-funded AI assistants, agent companies, autonomous-work products and app-building agents available in 2026, and identify the cheapest credible way to close each gap using open-source software, free tiers, free credits, MCP servers, public APIs or self-hosted tooling.

## Current ibis capabilities

### Working / tested foundations
- Universal Question Router with general TEXT fallback so unknown topics can still be attempted.
- Persistent per-user personal/project/preference/intent context in Supabase with RLS; browser-local fallback for guests.
- Permission Ledger with ALLOW / ASK / DENY, expiry and constraints.
- App Registry storing connection metadata/scopes, never reusable secrets in browser-readable tables.
- Universal Connection Fabric with preferred routing: Direct adapter → MCP → Activepieces → Nango/OAuth → constrained REST.
- Multi-agent orchestration across Strategy, Engineering, Marketing, Comms, Ops and General agents.
- Persistent execution runs and agent-task state.
- BUILD → TEST → PUBLISH PREVIEW → VERIFY URL → SHARE LINK orchestrator, with test gate, separate publish/share permission gates and resumability. Real external adapters are not all connected yet.
- Deterministic math/statistics kernel.
- Correlation engine with exact-period alignment and correlation-vs-causation guard.
- Confidence/provenance grading.
- Caribbean Capital Intelligence scenario engine.
- Context Graph seeded by FTN Product/Node registries and reviewed Scout findings.
- Private Intent Graph: NEED / HAVE / PLAN / WATCH.
- Opportunity Graph matching reviewed findings to intents.
- Evidence-backed Foresight.
- Presentation Intelligence with LIVE / LIVE MODEL / SNAPSHOT / DERIVED / SCENARIO discipline.
- Headspace spatial cognitive interface: black field, thought surfaces, focus/materialize/dematerialize, drag/resize, mobile recomposition.
- Browser/device sensor bridge: camera, microphone, screen capture, location, motion/orientation, WebUSB, WebHID, Web Serial, Bluetooth, MIDI, instrument adapters where browser/platform supports them.
- Explicit truth guard that ordinary RGB camera data cannot be represented as FLIR/thermal data without a real thermal sensor.

### Discovery-only capability map
ibis currently has candidate lanes for:
- finance/markets/banking/property/business due diligence/legal/regulatory/procurement/grants
- science/research/document intelligence/data engineering/data science
- geospatial/weather/climate/satellite/transport/logistics/travel
- health information/education/language/accessibility
- software engineering/browser automation/desktop computer use/devices/IoT/workflow automation
- communications/commerce/defensive cybersecurity/identity verification
- archives/news/public social signals/knowledge graphs/search/retrieval/storage/memory/observability/scheduling/auth/export
- dedicated UX/UI optimization lane
- creative layer spanning music, vocals, image, video, speech, 3D, editing, restoration, media assembly and open/free-credit model candidates

### Model/provider candidates
OpenAI, Anthropic, Gemini, Perplexity, xAI, Cohere, OpenRouter, Hugging Face, Groq, Together, Fireworks, Cerebras, local Ollama/llama.cpp/vLLM, plus creative providers such as Google Flow/Veo, Runway, Pika, MusicGPT, Treblo, Mureka, AirMusic, ACE-Step, Stable Audio and other open/self-hostable models.

### Differentiated product thesis
ibis aims to combine:
- Caribbean Context Graph
- Intent Graph
- Opportunity Graph
- Signal Fusion
- Economic Shadow / Economic Twin
- Foresight
- Butterfly Engine
- Trust Engine / Trust Passport
- Entity Resolution
- Prediction & Correlation
- Scout Network
- Agent/Action Layer
- local computer/device bridge
- Caribbean Capital Intelligence
- Headspace cognitive interface

Consumer promise: **Ask ibis anything. Tell ibis what you’re trying to make happen.**

## Products to benchmark
At minimum compare ibis with current capabilities from:
- Town
- Polsia
- Lindy
- Manus
- Genspark
- Replit Agent
- Lovable
- Cursor / coding agents
- OpenAI agent/work capabilities
- Anthropic agent/computer-use products
- Google Gemini/Workspace agents
- any better-funded 2025–2026 product that materially changes the comparison

## Questions you must answer

1. What capabilities do the strongest funded competitors have that ibis does NOT yet have operationally?
2. Which gaps are essential for a convincing fundraising demo versus later-scale features?
3. Which capabilities can be acquired almost immediately through MCP, Activepieces, Nango, open-source software, public APIs or free tiers instead of building from scratch?
4. Identify the best **free/open-source or free-credit** source for every missing P0/P1 capability. Include exact project/service name, official URL, licence where relevant, free-tier limits if current and whether commercial use appears permitted. Flag anything uncertain.
5. What should ibis integrate directly versus reach through MCP/Activepieces/Nango?
6. What is the best architecture for a Town/Manus/Lindy-quality **Connect** experience: search app → OAuth → scopes → permission mode → health → use → revoke?
7. What security, OAuth, secrets, sandboxing, audit, retry, queue, idempotency and observability pieces are missing?
8. What memory architecture is needed for Town-level persistent context without sending the entire user history into every prompt?
9. What agent orchestration capabilities are missing for Polsia-level autonomous Strategy/Engineering/Marketing/Comms/Ops execution?
10. What is missing for reliable autonomous **build → test → repair → deploy preview → verify → share link** execution?
11. What should ibis add to become highly valuable to Caribbean engineers, electricians, builders, mechanics, technicians, inspectors, creators, entrepreneurs and investors?
12. What phone/laptop/device capabilities are realistic with browser APIs, native mobile APIs, a local bridge, Bluetooth/USB/HID/serial/MIDI, external sensors and vendor SDKs?
13. Find useful open-source field/trade tools: computer vision measurement, AR measurement, OCR, electrical calculators, CAD/BIM, GIS, thermal-camera integrations, Bluetooth measurement devices, multimeters/test instruments, barcode/QR, asset inspection, maintenance, offline-first forms.
14. Which Caribbean-specific datasets/APIs should ibis integrate first to create a defensible regional advantage?
15. Which parts of the current ibis capability matrix are likely to impress investors, and which will be dismissed as architecture without proof?
16. Design a 10–15 minute live investor demo that proves the maximum amount of capability with the smallest implementation burden.
17. Propose a 30-day P0 execution plan using mostly free/open resources.
18. Red-team the thesis: what could make ibis look like a wrapper, and what proprietary data/workflows/network effects would make it defensible?

## Required output format

Produce:

A. **Executive verdict** — current class of product, strongest differentiators, biggest credibility gaps.

B. **Competitive matrix** — rows are major capabilities; columns include ibis, Town, Polsia, Lindy, Manus and any more relevant competitor.

C. **Missing-capability table** with columns:
- Capability
- Why it matters
- Priority P0/P1/P2
- Build vs integrate
- Best free/open option
- Backup option
- Licence/free-tier notes
- Estimated engineering difficulty
- Demo value

D. **Connector strategy** — recommended MCP / Activepieces / Nango / direct integration architecture.

E. **30-day build order**.

F. **Investor demo script**.

G. **Defensibility recommendations**.

Use current official sources wherever possible. Cite every externally verifiable product claim. Do not treat a listed candidate as an implemented ibis feature. Distinguish clearly between WORKING, PARTIAL, ORCHESTRATOR-ONLY, DISCOVERY-ONLY and MISSING.

---
