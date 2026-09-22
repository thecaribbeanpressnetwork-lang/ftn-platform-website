# Scarlett — Adaptive Interface Architecture

Status: BUILD NOW foundation; native business Receptor is BUILD LATER.

## Product boundary
Scarlett is a separate FTN product built on the ibis substrate. ibis remains teal and keeps Headspace as its direct cognitive interface. Scarlett is the red-ibis adaptive interface layer for existing websites.

Scarlett does not replace, proxy or destructively rewrite the source site. It creates a reversible client-side presentation layer over the current DOM. The original page remains underneath and can be restored instantly.

## Non-negotiable rules
1. No fixed website archetypes or template buckets. Scarlett derives a page-specific plan from observable structure, purpose, content, brand signals, interaction semantics, accessibility signals and the user's stated outcome.
2. No fabricated proof, scarcity, reviews, credentials or claims. Trust/conversion rules may only reorganize or clarify truthful source material.
3. Existing links, forms and controls retain their original destinations/behavior unless a separately permissioned adapter is explicitly authorized.
4. No browsing-history collection. Page analysis is local by default. Sending page content to ibis requires explicit user intent and the normal FTN permissions/data-purpose checks.
5. Transformations are reversible. Every changed node records its prior inline style/class state for restoration.
6. Motion follows Headspace spatial continuity: elements move toward their final position while resolving from partial to full opacity. Respect `prefers-reduced-motion`.
7. Scarlett uses a red ibis mnemonic. ibis remains teal.
8. The opacity/intensity control is continuous at the presentation level, with a decisive crossover around 50% so the source site and Scarlett do not become an illegible double-interface. Foundation implementation uses a 45–55% crossover band: below it the source presentation dominates; above it Scarlett dominates; 50% snaps to the nearest stable side after interaction.

## Adaptive plan model
`Scarlett.analyze(document)` returns a local, non-identifying page model:
- purpose signals: commerce, service, editorial, civic/institutional, creator/media, utility/product, unknown
- primary actions inferred from real anchors/buttons/forms
- hierarchy candidates inferred from headings, landmarks, position and text density
- trust signals already present in source
- friction signals: excessive competing CTAs, dense line length, weak contrast hints, hidden labels, oversized blocks, noisy fixed/sticky elements
- brand tokens: existing colors/font families where readable from computed styles
- accessibility preferences and reduced-motion state

`Scarlett.plan(model, goal)` produces bounded presentation operations. It never invents source facts.

## Neural Mesh
The Neural Mesh is a deterministic map of legitimate interactive elements: anchors, buttons, inputs, selects, textareas and forms. Each node receives a stable session-local identifier and semantic role. Scarlett may highlight, group, move presentation clones or focus these controls, but does not silently alter their destination or submit them.

## Rendering
The browser layer uses CSS custom properties and a root `data-scarlett` state. It avoids permanent DOM replacement. Presentation operations are intentionally small:
- constrain reading width and spacing
- clarify heading hierarchy
- elevate one or two existing primary actions
- de-emphasize visual noise
- improve focus visibility
- reduce disruptive sticky/fixed chrome when clearly non-essential
- preserve source brand cues

## Evidence registry
Every adaptive rule has an ID, category and rationale. Foundation rules rely on durable HCI/accessibility principles rather than pretending deterministic formatting is AI. Future ibis-assisted recommendations must carry provenance, confidence and the specific source evidence used.

## Extension sequence
Browser extension first because it is the fastest reversible way to apply Scarlett to arbitrary sites without asking businesses to modify their stack. Keep the transformation engine as ordinary shared JavaScript so Chromium is only a delivery shell, not the product architecture. Other browsers and a business-installed Receptor can reuse the same engine later.

## Security and ownership
- no remote code execution
- no `eval`
- no broad host exfiltration
- extension permissions limited to `activeTab`, `scripting`, `storage`
- no credentials in the extension
- local preferences only in extension storage
- source and rule registry remain FTN-owned

## Decision Gate
USER VALUE: immediate clarity, focus, readability, reduced friction while keeping the source site's functionality.
ECOSYSTEM VALUE: reuses ibis intent/permissions later and can produce privacy-safe interface-quality signals for FTN Observatory only with consent.
OWNERSHIP: core renderer and rules are FTN-owned and portable.
DATA VALUE: structured page-purpose/friction models can become ibis inputs later without retaining raw private pages.
REVENUE: consumer extension can validate demand; business Receptor/licensing is a later commercial lane.
EXECUTION COST: low for deterministic foundation; higher for validated intelligence/recommendation layer.
FUTURE OPTIONALITY: high because renderer is delivery-neutral.

Decision: BUILD NOW the local-first browser foundation. EXPERIMENT with evidence-ranked adaptive recommendations. BUILD LATER the authenticated business Receptor and institution analytics. REJECT fixed archetype/template architecture and any conversion tactic that depends on deception or dark patterns.
