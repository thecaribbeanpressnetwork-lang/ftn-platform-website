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
