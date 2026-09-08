# ibis Headspace — Cognitive Interface & Wiring Architecture

Date: 2026-09-07
Status: Working architecture for the ibis redesign branch

## Core thesis

ibis Headspace is not a conventional dashboard, desktop or page system. It is a living cognitive field: a user expresses intent and the relevant answers, graphs, maps, media, people, files, opportunities, tools and actions materialize around that intent.

The interface should behave more like cognition than software navigation: attention, recall, association, imagination, suppression, context, prediction and action.

This does **not** claim literal brain-computer integration. The design goal is to create a human-computer interaction model that is naturally compatible with future neural, ambient or multimodal input systems because the software already works in cognitive primitives rather than page/menu primitives.

## Hard product rule

> No isolated features. Every new capability must wire into Headspace or remain outside the core product.

The substrate may become more complex while the user experience becomes simpler.

## Cognitive primitives

- **Intent** — what the user is trying to make happen.
- **Attention** — what is currently visible in Headspace.
- **Thought object** — an answer, graph, map, person, opportunity, file, media item, tool, task or other meaningful object.
- **Association** — the relationships between visible and latent thought objects.
- **Memory** — objects and scenes that are not presently visible but remain recallable.
- **Imagination** — generated hypotheses, simulations, alternatives and possible futures, clearly labeled as such.
- **Recall** — bringing prior objects or scenes back into view by language, gesture or direct action.
- **Suppression** — dematerializing objects without deleting them.
- **Action** — executing through connected tools, APIs and agents when permitted.
- **Explanation** — ibis must be able to explain why any object appeared, which signals produced it, which engine/scout contributed, what evidence supports it, what remains uncertain, and what would change confidence.

## Interaction model

The user should be able to manipulate Headspace through whichever modality is most natural:

- typing
- voice
- drag-and-drop
- pointer / touch
- files
- pasted text
- images / camera
- links
- connected accounts
- location/context signals, when permissioned
- APIs / agents
- connected devices and hardware capabilities, when genuinely exposed by supported interfaces
- future ambient or neural inputs

The user should not need to select a tool before stating intent. ibis should determine which capabilities are relevant and ask for permission only when needed.

Users should be able to tell ibis anything. The system should interpret the request and materialize the minimum useful set of capabilities.

## Explainability and conversation

Every revealed object must remain conversational.

Examples:

- “Why am I seeing this?”
- “Explain the graph.”
- “What evidence supports that?”
- “Which scout found this?”
- “What did you correlate?”
- “What would make you less confident?”
- “What should I do next?”
- “Launch the relevant scouts.”
- “Run the correlation engine on this.”
- “Imagine three alternatives.”

The explanation layer should expose:

- source and provenance
- freshness
- verified fact vs inference vs estimate vs generated scenario
- confidence
- assumptions
- contributing scouts/engines
- correlation vs causation distinction
- alternative interpretations
- next available actions

## Engines inside Headspace

Core engines must be invokable through natural language or contextual controls, not separate dashboards.

Examples:

- Scout Network
- Signal Fusion Engine
- Correlation / Prediction Engine
- Foresight Engine
- Butterfly Engine
- Economic Shadow / Twin
- Trust Engine
- Entity Resolution
- Opportunity Graph
- Intent Graph
- Caribbean Context Graph
- Action / Agent Layer

An engine may materialize as a temporary thought object when the user needs to inspect or steer it. Otherwise it should remain invisible.

## Materialization model

Thought objects should not pop in like modal windows. They should materialize organically:

1. latent suggestion
2. soft spatial presence
3. resolved form
4. focused clarity

Dematerialization reverses the process. Nothing should feel hard, aggressive or mechanical.

Motion must support understanding rather than decoration. Respect `prefers-reduced-motion`.

## Spatial composition

Use golden-ratio relationships where they improve visual hierarchy and balance, never as a gimmick. Candidate uses:

- major panel proportions
- spacing scale
- relative object sizes
- focal versus supporting content
- animation pacing ratios
- compositional clustering

Headspace should feel organic, breathable and connected rather than gridded like a dashboard.

## Resizable thought surfaces

Thought objects must be resizable when their content benefits from more or less space.

Users should be able to:

- drag to resize
- say “make the graph bigger”
- say “shrink the video”
- expand a map or document temporarily
- return an object to its previous size using Back/Undo

Resize state is part of Headspace memory and should persist with saved scenes where appropriate.

## Reversible spatial memory

Every meaningful spatial action should be reversible.

Required primitives:

- back / undo
- forward / redo
- “put that back”
- “show me the graph again”
- “bring back what we were looking at yesterday”
- save scene
- recall scene
- pin
- resize
- dematerialize
- clear attention without deleting memory

## Output surfaces

Headspace must be able to materialize, eventually from live systems:

- answers
- evidence / citations
- graphs
- maps
- timelines
- images
- video
- audio
- documents
- forms
- calculators
- people / entities
- businesses
- opportunities
- Trust Cards / Trust Passports
- Economic Shadows / Twins
- alerts
- predictions
- scenario simulations
- scout controls
- correlation / reasoning inspection
- tasks / agents
- API / tool controls
- supported device control surfaces

## Media

Media should play inside Headspace when useful rather than always navigating away.

Target integrations:

- FTN TV
- Riddim
- Face The Nation / Caribbean Press Network media
- uploaded video/audio
- permitted external media providers

Media objects should be draggable, resizable, pinnable, dismissible and recallable.

## Tool, API and device surfaces

A connected tool, API or supported device should appear as a capability inside the current thought-space, not as a separate product silo.

Examples:

- “Check my calendar.”
- “Send this to Jason.”
- “Open this opportunity and prepare the application.”
- “Connect this business to my accounting data.”
- “Show me the GitHub issue.”
- “Run this through the Caribbean Context Graph.”
- “Bring up four MP3 decks, use the USB stick I connected, connect to my Pioneer mixer, and help me DJ this party.”

The DJ example defines the orchestration pattern, not a claim that arbitrary Pioneer hardware can currently be controlled from a browser. Production Headspace must:

1. detect only capabilities actually exposed by the operating system, browser, driver, local bridge, MIDI/HID/audio API, vendor SDK or connected application
2. request permission before using them
3. identify the device and supported controls
4. materialize only controls that are truly available
5. keep the user in control of consequential actions
6. expose current connection state
7. never claim device control when no supported interface exists

This pattern can later apply to creative hardware, cameras, microphones, mixers, displays, sensors, vehicles, smart-home systems, industrial systems and other supported devices.

## Local computer agency and driver acquisition

Headspace should eventually be able to operate the user’s local computer through an FTN-controlled local bridge when the user explicitly asks and grants permission.

Target capabilities:

- inspect local files and folders within approved scopes
- open and operate desktop applications
- inspect connected hardware
- identify missing software dependencies or drivers
- locate official or trusted driver sources
- download driver/install packages
- verify publisher/signature/checksum where available
- explain exactly what will change before installation
- require explicit approval for system-level installation, elevation, restart or configuration changes
- install or launch supported software when approved
- connect applications, hardware, browser sessions, files and APIs into one Headspace task

Driver acquisition must prefer the device/vendor/OS official source or a verified package repository. ibis must not silently install unsigned or provenance-unknown system software.

Open-source building blocks should be adopted only after licence, security, maintenance and provenance review. The initial local-computer lane should remain provider-agnostic and capable of using local/open models when practical.

## Execution Spine

Before deeper maths/correlation work, ibis needs one shared execution substrate so every action is not implemented as a one-off automation.

The Execution Spine is the common layer that converts an intention into an auditable sequence of tool actions.

Required components:

1. **Capability Registry** — what browsers, apps, APIs, files, devices, agents and FTN systems are currently available, plus what each can actually do.
2. **Permission Broker** — scopes permissions by task and resource; requests escalation only when necessary.
3. **Identity / Profile Vault** — user-approved reusable facts, CVs, bios, addresses, work history, preferences, documents and application answers, with field-level controls.
4. **Credential Broker** — credentials stay in approved secure stores; ibis requests use without exposing secrets in Headspace.
5. **Browser Agent** — navigate, click, type, upload, download, fill forms, manage tabs and inspect page state.
6. **Desktop Agent / Local Bridge** — operate approved desktop applications, files, OS surfaces and supported hardware.
7. **Document Composer** — create/adapt CVs, cover letters, forms, PDFs and other task-specific documents using approved profile data.
8. **Task State / Resume Engine** — long multi-step work can pause for a user decision and continue from the exact state instead of restarting.
9. **Human Handoff** — CAPTCHA, identity proofing, legal attestations, ambiguous questions, payment approvals or unsupported UI can be surfaced cleanly to the user, then the agent resumes.
10. **Action Ledger** — records what was read, clicked, entered, downloaded, uploaded, changed, submitted or installed; actions remain explainable.
11. **Rollback / Recovery** — reversible actions should be undoable where technically possible; destructive/system changes require stronger confirmation.
12. **Capability Health / Confidence** — ibis knows when a tool is uncertain, disconnected, stale or unsupported and does not bluff success.
13. **Policy / Consequence Classifier** — distinguishes harmless inspection from submissions, financial transfers, account changes, system elevation and other consequential actions.
14. **Local/Cloud Router** — selects local execution, browser automation, cloud APIs or human handoff based on privacy, latency, cost and capability.

### Job application example

A request such as “apply for this job for me” should be executable through the same spine:

1. inspect the job page
2. read the role and requirements
3. compare it to the user profile/CV
4. explain fit and any material gaps
5. generate/adapt the appropriate CV/cover letter if needed
6. open/fill the application
7. upload approved documents
8. answer routine questions from the Profile Vault
9. stop for information ibis does not know or should not guess
10. handle CAPTCHA/identity verification through Human Handoff
11. submit according to the user’s submission policy
12. save confirmation, job URL, answers, documents and next steps into Memory/Watch

A user should be able to set a preference such as:

- prepare only; I submit
- fill everything and ask me before final submission
- submit eligible applications automatically within my saved rules

The visible Headspace should show only the application, fit, material decisions and status — not every underlying click unless the user asks to inspect execution.

## Caribbean Capital Intelligence

Headspace needs a dedicated capital/wealth intelligence lane because regional financial decisions are fragmented across countries, currencies, banks, taxes, property markets, residency rules, businesses, yields and risk.

This is not a standalone finance dashboard. It is a family of engines, calculators, scouts and data connectors that materialize around a financial intention.

Example questions:

- “How much money do I need invested to live on TT$35,000 a month without touching principal?”
- “If I have US$2 million, where in the Caribbean could I live from income with the best combination of yield, safety, healthcare, taxes and lifestyle?”
- “Compare living in Tobago, Barbados, Grenada and Curaçao for my budget.”
- “What Caribbean banks or instruments currently offer the best low-risk yields for this currency and term?”
- “What happens if interest rates fall 2%?”
- “How much capital would I need to buy this hotel and maintain a 12-month reserve?”
- “Find businesses in the Caribbean that fit my acquisition criteria.”
- “Model this property as a rental, hotel, mixed-use asset and resale play.”
- “What currency risk am I taking?”
- “What taxes, residency rules or capital controls matter here?”
- “Show me three ways to deploy US$5 million into Caribbean assets and explain the trade-offs.”

Required capabilities:

- financial-independence / income-target calculator
- real vs nominal return modelling
- inflation scenarios
- tax-aware cash-flow modelling where data is available and jurisdiction-specific advice is properly qualified
- FX and currency-risk scenarios
- bank-deposit and fixed-income comparisons
- portfolio and drawdown simulations
- Monte Carlo scenarios where appropriate
- property underwriting
- business acquisition underwriting
- market-entry economics
- operating-reserve and runway models
- debt-service and leverage modelling
- relocation cost and residency economics
- jurisdiction comparison
- due-diligence checklists and evidence rooms
- private-opportunity matching through the Intent/Opportunity Graphs
- capital deployment scenarios
- liquidity and exit-risk assessment
- provenance, freshness and confidence for every financial input

For high-stakes personal financial decisions, Headspace must distinguish educational modelling from regulated financial advice and expose assumptions, dates, sources, uncertainty and professional-review triggers.

## Investor-grade Caribbean intelligence

For wealthy investors, family offices, funds, developers, corporations and diaspora capital, ibis should become a Caribbean decision-intelligence layer rather than merely a consumer assistant.

High-value investor surfaces include:

- Caribbean market-entry intelligence
- cross-island opportunity discovery
- private business-sale / buyer-intent matching
- property and development intelligence
- procurement and concession discovery
- sector heat maps
- infrastructure and climate-risk overlays
- tourism demand signals
- informal-economy estimates
- supply-chain and logistics analysis
- labour and talent intelligence
- regulation and licensing pathways
- acquisition-target scouting
- company / asset dossiers
- due-diligence workspaces
- scenario simulation
- country/jurisdiction comparison
- diaspora capital matching
- trusted local partner discovery
- ongoing watchlists and Foresight alerts

The defensible value is not a generic global-finance model. It is the combination of Caribbean Context Graph + Intent Graph + Opportunity Graph + regional data + proprietary scouts + local entity resolution + trust/provenance + execution capability.

## Wiring architecture

All existing and future FTN capabilities should be mapped into a common Headspace object/action model.

Each integration should expose:

- what object(s) it can produce
- what actions it can perform
- what permissions it needs
- provenance / evidence
- whether the output is verified, estimated, inferred or generated
- persistence / memory behavior
- user-visible controls
- explainability hooks
- resizing behavior where relevant
- scout / engine dependencies
- device/tool capability state where relevant

Core systems to wire:

1. Caribbean Context Graph
2. Intent Graph
3. Opportunity Graph
4. Signal Fusion Engine
5. Foresight Engine
6. Butterfly Engine
7. Economic Shadow / Economic Twin
8. Trust Engine / Trust Passport
9. Entity Resolution
10. Scout Network
11. Correlation / Prediction Engine
12. Action / Agent Layer
13. ibis API / Extension
14. FTN Opportunities
15. Community Connect
16. Observatory / Statistics
17. Media layer
18. Riddim
19. Mayor / institutional intelligence
20. account / identity / permissions
21. connected external tools, APIs and supported devices
22. local computer bridge
23. Execution Spine
24. Caribbean Capital Intelligence
25. investor-grade market / due-diligence intelligence

## Simplification rule

The number of underlying systems can increase while the number of primary user-facing concepts decreases.

Target user-facing primitives:

- **Ask ibis**
- **Tell ibis**
- **Headspace**
- **Memory**
- **Watch**
- **Act**

Everything else should materialize contextually.

## Future brain-interface compatibility

The useful long-term hypothesis is not “digitize the brain.” It is:

> Build a computational environment that already organizes information in brain-like cognitive primitives, so future brain-computer, wearable, ambient or multimodal interfaces can connect to a system whose interaction model is already based on intent, attention, memory, association, explanation and action.

This is a product/HCI hypothesis, not a claim of neuroscience capability.

## Design standard

The target is not merely polished SaaS. The interface should be distinctive enough to stand on its own as an interaction model while remaining intuitive on first use.

Success condition:

> A user can enter with one intention, receive only the objects necessary to think and act, interrogate why those objects appeared, launch deeper intelligence when needed, manipulate those objects naturally, and leave with less interface complexity than they started with.
