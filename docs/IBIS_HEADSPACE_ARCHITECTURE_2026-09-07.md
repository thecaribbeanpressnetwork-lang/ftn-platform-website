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
- future ambient or neural inputs

The user should not need to select a tool before stating intent. ibis should determine which capabilities are relevant and ask for permission only when needed.

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
- tasks / agents
- API / tool controls

## Media

Media should play inside Headspace when useful rather than always navigating away.

Target integrations:

- FTN TV
- Riddim
- Face The Nation / Caribbean Press Network media
- uploaded video/audio
- permitted external media providers

Media objects should be draggable, resizable, pinnable, dismissible and recallable.

## Tool & API surfaces

A connected tool or API should appear as a capability inside the current thought-space, not as a separate product silo.

Examples:

- “Check my calendar.”
- “Send this to Jason.”
- “Open this opportunity and prepare the application.”
- “Connect this business to my accounting data.”
- “Show me the GitHub issue.”
- “Run this through the Caribbean Context Graph.”

The tool layer must respect permissions, provenance and reversible actions.

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
11. Action / Agent Layer
12. ibis API / Extension
13. FTN Opportunities
14. Community Connect
15. Observatory / Statistics
16. Media layer
17. Riddim
18. Mayor / institutional intelligence
19. account / identity / permissions
20. connected external tools and APIs

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

> Build a computational environment that already organizes information in brain-like cognitive primitives, so future brain-computer, wearable, ambient or multimodal interfaces can connect to a system whose interaction model is already based on intent, attention, memory, association and action.

This is a product/HCI hypothesis, not a claim of neuroscience capability.

## Design standard

The target is not merely polished SaaS. The interface should be distinctive enough to stand on its own as an interaction model while remaining intuitive on first use.

Success condition:

> A user can enter with one intention, receive only the objects necessary to think and act, manipulate those objects naturally, and leave with less interface complexity than they started with.
