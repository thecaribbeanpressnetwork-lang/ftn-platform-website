# FTN Kaiso — Production Phase 1

## Purpose
Move FTN Kaiso from a searchable list of planned coverage beats into the smallest credible newsroom foundation without fabricating published journalism or implying that a secure/cloud newsroom already exists.

## Operational now
- Searchable newsroom coverage desks using the shared FTN Search Foundation.
- Structured story-pitch preparation covering coverage beat, location, working headline, summary, source basis, confidence, supporting public link, optional follow-up identity, urgency and country context.
- Browser-local pitch persistence through the shared FTN Integration Adapter.
- Recent local story-pitch history.
- Clear distinction between a story lead and a verified fact.

## Not yet operational
- Published Kaiso articles or investigations.
- Cloud newsroom/editorial queue.
- Reporter assignment and collaborative editing.
- Secure confidential-source submissions or encrypted document uploads.
- Source identity protection guarantees.
- Automated fact checking or autonomous editorial decisions.
- CMS publishing workflows.

## Editorial and source rules
- A pitch is a lead, not a verified fact.
- FTN Kaiso must independently verify material before publication.
- Locally saved pitches are not represented as received, assigned, approved or scheduled by FTN.
- The current browser-only form must not be marketed as an anonymous or secure whistleblower channel.
- Visitors are explicitly told not to enter confidential documents, credentials, private addresses, protected-source material or information that could put a person at risk.
- A future protected-source channel must be designed as a dedicated server-side security capability with access controls, retention rules, encryption and documented newsroom procedures before activation.

## Architecture
Kaiso reuses FTN Product Registry, Workspace Shell, Search Foundation, Country context, shared storage and Integration Adapter. No product-specific backend or duplicate persistence layer is introduced.

`kaiso-story-tip` is the Integration Adapter tool ID. A future FTN newsroom API can replace the adapter implementation while preserving the public form contract.

The structured pitch record is intentionally useful to future newsroom analytics and ibis.ai only after appropriate permissions and editorial governance exist. No automatic cross-product sharing occurs in this phase.

## FTN Product Mnemonic Layer
Kaiso's mnemonic is the **Press Mark**: a dark editorial sheet with stacked headline/proof lines, a verification stamp and a scanning proof line.

- Ambient presence: the Press Mark sits quietly beside the newsroom proposition.
- Meaningful interaction: when a story pitch is successfully saved, the verification stamp lands and the proof line scans the page.
- Positive completion feedback: the motion reinforces “recorded for verification,” not “published” or “approved.”
- Accessibility: motion is disabled when `prefers-reduced-motion` is enabled.
- Identity: the motif is Kaiso-specific and should not be reused as a generic FTN animation.

## Decision Gate
**BUILD NOW:** coverage discovery, structured local pitch preparation, editorial trust boundary and future-safe integration seam.

**PREPARE NOW, BUILD LATER:** secure newsroom API, CMS, encrypted source channel, assignments, verification workflow and rights-managed publishing.

This preserves user value, editorial integrity, FTN ownership and future optionality without overengineering a newsroom backend before the operational processes exist.
