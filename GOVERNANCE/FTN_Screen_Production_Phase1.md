# FTN Screen — Production Phase 1

## Purpose
Turn FTN Screen from a basic five-field submission form into a durable Caribbean screen-programming record without implying that FTN currently operates a streaming service, commissioning pipeline or rights-management backend.

## Operational now
- Canonical `screen-submission` records through the shared Entity Metadata Engine.
- Structured title, creator/studio, format, genre, territory of origin, language, runtime/episode length, production year, production status, logline, synopsis, audience, credits, rights/submission authority, distribution state and creator/rights contact.
- Local trailer/clip preview through shared Media Intake; video never leaves the browser.
- TXT/structured export through the shared Export Framework.
- Browser-local saved-record persistence through the shared Integration Adapter.
- Recent local submission history.

## Not yet operational
- Cloud video upload/storage.
- Streaming playback catalog.
- Commissioning or acquisition workflow.
- Rights verification or contract execution.
- Screening-room access controls.
- Creator accounts or collaborative submission review.
- Distribution delivery to third-party platforms.

## Rights and editorial rules
- Creating or saving a submission record does not transfer rights to FTN.
- A locally saved record is not represented as received, selected, commissioned or acquired.
- A trailer preview is browser-local and not uploaded.
- Future commissioning must use explicit contracts and documented rights authority; metadata alone is never proof of ownership.

## Architecture
The canonical Screen schema lives in the shared Entity Metadata Engine because FTN Screen is now a real consumer. This avoids private page-only fields and gives future catalog, programming, rights and ibis.ai services a stable record shape.

The schema remains vendor-neutral: no streaming provider IDs, proprietary CMS identifiers or third-party account references are required. FTN can later map the canonical record outward to distribution vendors while retaining its own source of truth.

## FTN Product Mnemonic Layer
Screen's mnemonic is the **Story Frame**: a cinematic frame with perforated film edges, a play mark and a focus ring.

- Ambient presence: the frame establishes a cinematic identity around the submission studio.
- Meaningful interaction: saving a completed Screen record activates the play mark and focus ring.
- Positive completion feedback: the interaction means “record prepared and saved,” not “accepted” or “streaming.”
- Accessibility: motion is disabled with `prefers-reduced-motion`.
- Identity: the Story Frame is specific to FTN Screen and should not become a generic FTN media icon.

## Decision Gate
**BUILD NOW:** canonical screen metadata, local trailer preview, export, local history and rights boundary.

**PREPARE NOW, BUILD LATER:** secure media storage, screening room, commissioning workflow, contracts, catalog publishing and streaming/distribution integrations.

This creates a durable FTN-owned metadata asset now while keeping high-cost media infrastructure and vendor choices reversible until actual distribution requirements are known.
