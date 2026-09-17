# EcoMap source and boundary note

## What this is

EcoMap is FTN's structured ecosystem-intelligence model: a way of representing the services,
organizations, pathways and relationships in a place (starting with Trinidad and Tobago) as
data other IBIS reasoning engines can consume -- not merely a visual diagram for a human to look
at. This checkpoint implements three of its modes:

- **EcoMap Place** -- what services/organizations/opportunities/events exist, where, under what
  jurisdiction, and how available/eligible/accessible they are.
- **EcoMap Pathway** -- the ordered route from a stated current state to a stated outcome: steps,
  eligibility, documents, costs, deadlines, dependencies, bottlenecks and alternatives.
- **EcoMap Relationship** -- the edges between ecosystem entities (organizations, services,
  funders, referral sources): who connects to whom, in what direction, with what confidence.

Multi-Agent Orchestration is explicitly **not** implemented in this pass.

## Methodology classification: `PARTIAL / FOUNDER-AUTHORIZED`

The data model above (which fields each mode structures) comes from a **founder-authorized product
contract** -- FTN's own specification of what EcoMap should represent, written by the founder for
this product. It is:

- **not** a peer-reviewed or externally validated methodology;
- **not** based on a published academic framework the way Evidence-Bounded Retrodiction is (see
  `GOVERNANCE/EBR_SOURCE_AND_BOUNDARY.md` for that contrast -- EBR cites a DOI and a public
  mathematics note; EcoMap here cites neither, because neither exists for this data model);
- **not** claimed to be complete, optimal, or the only reasonable way to structure ecosystem data.

Any future document, comment, or response that describes EcoMap's methodology must use the label
**`PARTIAL / FOUNDER-AUTHORIZED`** and must not imply external scientific validation, academic
peer review, or a formal proof of correctness. This is an engineering data model built to be
useful and honest about its own limits -- not a research contribution.

## What EcoMap honestly does not include (this pass)

- **No automatic entity classification beyond a keyword heuristic.** `classifyPlaceKind()` in
  `ibis-ecomap-engine.ts` guesses whether a source describes a service, organization, opportunity,
  event or report from title/text keywords (e.g. "grant"/"fund" → OPPORTUNITY, "workshop"/"training"
  → EVENT). This is a real, deterministic, inspectable heuristic -- not a claim of accurate NLP
  classification. Anything it cannot confidently classify is labeled `UNKNOWN`, never guessed
  silently.
- **No automatic pathway-step ordering or confirmation.** A step built from a search result is
  always labeled `INFERRED` (a source exists that plausibly relates to this outcome) or `MISSING`
  (a required field like eligibility/documents/deadline was not stated by any source) -- never
  `CONFIRMED` unless a caller's advanced/internal input explicitly asserts it.
- **No automatic relationship-type inference beyond structural pairing.** An edge built from search
  results connects the user's stated goal to a discovered organization/service with a generic,
  low-confidence relation (`POTENTIAL_REFERRAL`) -- EcoMap never invents a specific relationship
  type (e.g. "FUNDS", "PARTNERS_WITH") from a search snippet alone; that requires a caller's
  advanced/internal input or a real, cited statement.
- **No automatic evidence retrieval of its own.** EcoMap consumes the SAME search results and
  product list already retrieved for the canonical request (see `ibis-canonical-brain.ts`'s
  `buildEcoMapContext()`) -- it never issues its own search, and never fabricates an entity, step
  or edge that no source or product-list entry supports.

## Location privacy (EcoMap Place)

- Only the jurisdiction/area a user's own request text states (e.g. "Tobago") is used -- there is
  no device-location API call, no IP-geolocation, and no coordinate collection anywhere in this
  module.
- `PlaceEntity.locationPrecision` is never finer than what a source or the request text actually
  states; the type includes a `COORDINATES` level for completeness, but no code path in this
  implementation ever produces it.
- `confirmedLocation` (only ever set from something a source directly stated) and
  `inferredCoverage` (an explicit, separately-labeled guess, e.g. "island-wide") are kept as two
  distinct fields -- never merged, so a caller can never mistake an inferred coverage area for a
  confirmed address.
- Sensitive location use cases (precise device location, tracking) are simply out of scope for this
  pass -- not degraded-but-present, not collected at all.

## Relationship sensitivity and suppression (EcoMap Relationship)

Every edge carries a `sensitivity` classification (`PUBLIC` / `SENSITIVE` / `PRIVATE`). Only
`PUBLIC` edges (by default: organization-to-organization or goal-to-organization relationships
built from public search results) are named in a reasoning-engine's customer-facing `contribution`
text. `SENSITIVE`/`PRIVATE` edges are counted but never named in that text -- "N sensitive
relationship(s) detected but not disclosed" -- even though they remain present in the structured
result for an authorized advanced/internal caller to inspect. EcoMap Relationship never infers a
person-level relationship from generic web search snippets; auto-built edges only ever connect the
request's own stated subject to a discovered organization/service, never two named individuals.

## Acceptance boundary

Any test or acceptance-runner entry for EcoMap must confirm:

- Place, Pathway and Relationship are independently selectable and composable in one request;
- one retrieval result set feeds all three modes (no duplicate search per mode);
- every entity/step/edge retains provenance;
- unsupported entries are labeled `INFERRED`/`CONDITIONAL`/`MISSING`/`UNKNOWN`, never presented as
  `CONFIRMED` without support;
- insufficient evidence produces a partial map with explicit gaps, never fabricated completeness;
- sensitive/unsupported relationships are suppressed or labeled, never exposed merely because they
  can be inferred;
- precise personal location is neither requested nor exposed;
- a simple factual question invokes none of the EcoMap modes;
- EcoMap output materially changes the canonical response (the `actions`/`ecosystemConnections`
  envelope fields, previously always empty, now carry real Pathway/Relationship content when those
  modes execute).

See `supabase/functions/_shared/ibis-ecomap-engine.test.ts` and the EcoMap-specific cases in
`ibis-reasoning-engines.test.ts` / `ibis-canonical-brain.test.ts` for the tests that enforce this.
