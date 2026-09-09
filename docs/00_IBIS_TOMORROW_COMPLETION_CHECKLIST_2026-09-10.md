# FTN ibis — tomorrow completion checklist

**Date:** 2026-09-10  
**Objective:** finish the smallest credible investor-ready ibis release and close the gateway, Headspace, MCP/plugin and browser-extension lanes so funding work can begin.

## Operating rule

ibis must see the whole picture while focusing on the highest-value next action. This checklist is the controlling order for tomorrow. New ideas go into a later queue unless they unblock one of these release gates.

## P0 — establish one release truth

- [x] Preserve the current working tree before changing it. Do not overwrite the existing user changes.
- [x] Reconcile `ftn-ibis-organism` and `ftn-ibis-continue`; choose the canonical source and record what remains intentionally separate.
- [x] Review the current uncommitted gateway, Founder Cognitive Layer, theme, tool-catalog and Headspace changes.
- [x] Run the complete deterministic audit suite and repair any regression introduced by the current changes.
- [x] Create one coherent checkpoint commit with release notes and a rollback point.

## P0 — make ibis answer reliably

- [ ] Deploy the exact current `ibis-assistant` gateway source.
- [ ] Verify the deployed version and non-secret provider-health response.
- [ ] Confirm at least two usable text routes, including one independent fallback.
- [ ] Run live tests for arithmetic, identity, FTN navigation, Caribbean knowledge, current information, unknown questions and long prompts.
- [ ] Deliberately disable the preferred route and prove fallback answering.
- [x] Confirm deterministic questions do not consume a model unnecessarily.
- [x] Confirm provider, model, timestamp, evidence state, request ID and fallback state reach the interface.
- [x] Confirm no provider failure produces a blank panel, internal error text or stale answer in the source contract.

**Gate:** an investor can ask a simple question and receive a useful answer even when one provider is unavailable.

## P0 — deploy and verify Headspace

- [ ] Deploy the exact connected Headspace source, not the older `/ibis-ai/` compatibility surface.
- [ ] Run browser acceptance in a supported Chromium/Opera environment.
- [ ] Verify smart placement, snap-to-grid, tile, stack, minimize and restore.
- [ ] Verify tablet and touch operation.
- [ ] Verify one-tap speech controls: play, pause, rewind, speed and next line.
- [ ] Remove unnecessary bottom text and confirm the public page does not expose private founder information.
- [x] Verify country themes, including Trinidad & Tobago, Jamaica, Barbados, Guyana, Saint Lucia and Venezuela at the source-contract level.
- [x] Confirm text answering, voice, rendering and actions remain separate failure domains at the source-contract level.

**Gate:** Headspace is usable on desktop and touch screens and does not obstruct the answer experience.

## P0 — complete the capability register

- [x] Expand the registry beyond its current 37 tools to include every named service from the project discussion.
- [x] Add OpenAI/ChatGPT, Anthropic/Claude, Gemini, Perplexity, APIQIK, Bytez, Venice AI, VidRender, PixVerse, Kling, ElevenLabs, Suno, Youka, n8n, MicroFish, NanoChat, Impeccable, Heretic and any other named candidate.
- [x] Mark each item `LIVE`, `ENABLED`, `SOURCE_READY`, `CANDIDATE`, `DISCOVERY` or `BLOCKED` accurately.
- [x] Add the missing task lanes: research, URLs, photos, documents, audio, video, trade, importing, commerce, grants, jobs, music release, business building, property, civic work, browser action, voice, monitoring and funding.
- [x] Map every capability to its local program, external provider, permission class, privacy class, cost, health check and test.
- [ ] Ensure the Open-Source Scout, GitHub Scout, Hugging Face Scout and YouTube Scout write into this same registry.

**Gate:** ibis can inspect its own registry and explain what it can do now, what it can call, and what is unavailable.

## P1 — finish the FTN ibis plugin/MCP lane

- [x] Run the MCP package tests and live health/handshake check.
- [x] Verify the six public read-only tools against the deployed endpoint.
- [x] Verify provenance, uncertainty notices and FTN routing in returned results.
- [x] Confirm the public plugin never claims to submit applications, send messages, access private conversations or perform payments.
- [ ] Complete publisher identity, metadata, reviewer test cases and OpenAI submission preparation.
- [x] Decide and record whether the first public submission is the honest read-only MCP release or a later expanded action release.

**Gate:** an investor can open the MCP/plugin link and see a stable, source-backed Caribbean intelligence product with honest boundaries.

## P1 — finish the Chrome/Opera extension

- [x] Run the extension audit and package build.
- [ ] Install the package locally in Chrome and Opera.
- [ ] Test toolbar opening, selected-text context action, results page, error state and return-to-source links.
- [x] Verify least-privilege permissions, CSP, no secret exposure and correct privacy copy at the source/package level.
- [ ] Add final store screenshots. Icons, description, support URL and privacy URL are complete.
- [x] Prepare Chrome Web Store publisher setup and submission materials.
- [ ] Submit only after the live backend endpoint and public privacy pages are reachable.

**Gate:** the extension is installable, useful for a real selected passage, and ready for store review without pretending to be a full autonomous agent.

## P1 — install only the highest-leverage open-source foundation

- [ ] Check local hardware before installing models.
- [ ] Install/test Ollama or llama.cpp as a local fallback.
- [ ] Select one exact model checkpoint, not an entire model family.
- [ ] Test one vision model for product/photo intake.
- [ ] Test Whisper for voice/audio intake.
- [ ] Keep voice synthesis separate; test OpenVoice or F5-TTS only with the consented samples.
- [ ] Evaluate LiteLLM behind the FTN gateway rather than replacing ibis routing.
- [ ] Evaluate Activepieces for connectors and LangGraph for resumable workflows.
- [ ] Do not enable unverified “uncensored” checkpoints or install every named project automatically.

## P1 — demonstrate the investor promise

- [x] Build a public demo source path that begins with “Give ibis a problem, opportunity, product, song, document or goal.”
- [ ] Prepare three live demonstrations: a complex decision, a Caribbean opportunity and a URL/photo-to-business workflow.
- [x] Show Founder Reasoning DNA to every user without exposing private founder memory.
- [ ] Show sources, assumptions, confidence and the next sensible action.
- [x] Add a capability/status view so investors can distinguish live, enabled, source-ready, candidate, discovery and blocked functions.
- [ ] Verify the investor link from a clean browser/device before sharing it.

## Explicitly not tomorrow’s priority

- [ ] Do not build a new isolated app for every capability.
- [ ] Do not install every model or tool named in videos.
- [ ] Do not add autonomous purchasing, publishing, payments, applications or messaging without permission adapters.
- [ ] Do not redesign the entire FTN platform while ibis and distribution gates remain open.
- [ ] Do not begin funding outreach until the investor link and release status are truthful.

## End-of-day completion standard

Tomorrow is successful when:

1. ibis answers reliably through the deployed gateway;
2. Headspace works on desktop and touch screens;
3. the capability registry reflects the whole ecosystem;
4. the MCP/plugin package is tested and submission-ready;
5. the Chrome/Opera extension is packaged and submission-ready;
6. one investor link demonstrates the Founder Reasoning and Caribbean intelligence clearly;
7. every remaining limitation is visible and assigned to a dated next step.

After these gates pass, the work changes from “make ibis functional” to “use ibis and FTN to identify and pursue funding.”

## Execution evidence — 2026-09-09

- **Canonical tree:** `ftn-ibis-organism`. It has 98 project files absent from `ftn-ibis-continue`; the continue tree has no unique project file and only a broken linked-worktree `.git` pointer. Keep it untouched as historical residue until the founder approves cleanup.
- **Deterministic release checks:** 41/41 non-browser release checks passed after the integrated source additions, with a clean `git diff --check` result before the checkpoint commit.
- **Gateway source:** total provider failure now returns a non-empty degraded answer with provider, model, generated time, request ID, evidence state, confidence/uncertainty, fallback state and gateway version.
- **Gateway deployment:** blocked in this workspace by the absence of Supabase CLI/project linkage and deployment credentials. Production comparison proved it is still older source: `action=health` returned HTTP 400 `Ask ibis something first`, and deterministic `7 × 8` returned HTTP 502 `ibis is temporarily unavailable`. The new manual `ibis-assistant-release.yml` workflow deploys the exact reviewed source and runs `scripts/verify-ibis-assistant-live.mjs`.
- **MCP production:** production health, initialize, tools/list and all six tool calls passed; all six returned provenance and verification notices.
- **Extension package:** rebuilt with correct `icons/` archive paths; SHA-256 `4bf0535b54750825a0f82ccb71c2aed224f25b7b2523e5f1487698fb0539c6fa`. Chrome/Opera installation and real screenshots remain blocked because no controllable/local Chromium browser is available in this session.
- **External WAM/Trybe work:** intentionally outside this ibis release checklist. Business-account setup and project applications are a separate founder-owned lane and do not block this release or its funding transition.
- **Funding transition:** **DEFER.** The MCP proof is live, but the investor Headspace/gateway deployment, clean-browser verification and extension screenshots/install gates are still open.
