# FTN Radio — Production Phase 1

## Purpose
Expand FTN Radio from a basic segment-idea form into a credible programming-development workspace while keeping broadcast maturity explicit.

## Operational now
- Structured programme and segment briefs.
- Format, host, duration, territory, production mode, concept, music/talk direction, proposed frequency and rights-status capture.
- Local audio-file preview through the shared FTN Media Intake module; audio never leaves the browser.
- Browser-local programming brief persistence through the shared Integration Adapter.
- Recent programming brief history.
- Broadcast-readiness checklist showing the infrastructure still required for a real station launch.

## Not yet operational
- FTN Radio live stream.
- Broadcast scheduling or playout automation.
- Remote audio upload/storage.
- Music licensing clearance or royalty reporting.
- Live listener analytics.
- Presenter accounts, studio collaboration or remote contribution.
- Podcast/RSS distribution automation.

## Rights and trust rules
- Local preview does not grant FTN rights to an attached file.
- A saved programming brief does not schedule a broadcast or constitute rights clearance.
- Production deployment must define music/content licensing procedures appropriate to the territories served.
- FTN should own canonical programme metadata, scheduling records and the audience relationship even where external streaming infrastructure is used.

## Architecture
Radio reuses Product Registry, Workspace Shell, Media Intake, shared storage and Integration Adapter. No new backend, uploader or streaming vendor is introduced in this phase.

The existing `radio` Integration Adapter tool ID remains the future seam for programme intake. Broadcast scheduling and playback should be separate shared services when they become operational rather than being embedded directly into the public page.

## FTN Product Mnemonic Layer
Radio's mnemonic is the **Broadcast Dial**: a circular tuner, needle and central waveform.

- Ambient presence: the dial establishes a warm broadcast-studio identity without overpowering the workspace.
- Meaningful interaction: a successful programming-brief save sweeps the tuning needle and energizes the waveform.
- Positive completion feedback: the movement represents a programme concept becoming broadcast-ready work, not a claim that it is currently on air.
- Accessibility: motion is disabled under `prefers-reduced-motion`.
- Identity: this tuner/waveform combination belongs to FTN Radio and should not be reused as a generic FTN completion animation.

## Decision Gate
**BUILD NOW:** structured programming desk, local preview, rights-state capture, readiness framework and durable shared-service seams.

**PREPARE NOW, BUILD LATER:** streaming, playout, licensing logs, scheduling, podcast distribution and analytics.

This preserves FTN ownership and optionality without choosing a streaming vendor before broadcast requirements and rights operations are mature.
