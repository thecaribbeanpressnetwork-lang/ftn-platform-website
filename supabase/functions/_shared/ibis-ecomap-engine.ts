// FTN Platform — EcoMap (Place / Pathway / Relationship) engine.
//
// SOURCE/BOUNDARY: see GOVERNANCE/ECOMAP_SOURCE_AND_BOUNDARY.md before extending this file. The
// data model here is a FOUNDER-AUTHORIZED PRODUCT CONTRACT (methodology classification: PARTIAL /
// FOUNDER-AUTHORIZED) -- not a peer-reviewed or externally validated methodology the way EBR is.
// Do not describe it as scientifically validated; do not invent missing theory to make it sound
// more rigorous than it is.
//
// Honesty discipline (same as every other engine in ibis-reasoning-engines.ts): this module
// evaluates evidence a caller (or ibis-canonical-brain.ts, on behalf of an ordinary user) supplies.
// It never issues its own retrieval, never fabricates an entity/step/edge no source supports, and
// labels everything it cannot confirm as INFERRED, CONDITIONAL, MISSING or UNKNOWN.

export type EvidenceConfidence = "CONFIRMED" | "INFERRED" | "CONDITIONAL" | "MISSING" | "UNKNOWN";

// A single normalized piece of context EcoMap can build from -- deliberately the same shape
// regardless of whether it came from a live search result or FTN's own product registry, so
// ibis-canonical-brain.ts can build ONE list from whatever it already retrieved (never a second
// retrieval, never a duplicate search per mode).
export type EcoMapSourceRecord = {
  id: string;
  title: string;
  text: string; // title + any snippet/description available -- used only for keyword heuristics
  url: string | null;
  publisher: string | null;
  origin: "SEARCH" | "PRODUCT_REGISTRY";
  recordedAt: string; // when this system retrieved/registered it
  confidence: EvidenceConfidence; // e.g. SEARCH/SNIPPET-only -> INFERRED, PRODUCT_REGISTRY -> CONFIRMED
};

// --- EcoMap Place -----------------------------------------------------------------------------

export type PlaceEntityKind = "SERVICE" | "ORGANIZATION" | "INSTITUTION" | "OPPORTUNITY" | "EVENT" | "REPORT" | "UNKNOWN";
export type PlaceAvailability = "PHYSICAL" | "ONLINE" | "HYBRID" | "UNKNOWN";
// COORDINATES exists for type completeness only -- see GOVERNANCE/ECOMAP_SOURCE_AND_BOUNDARY.md's
// location-privacy section: no code path in this module ever produces it.
export type LocationPrecision = "COORDINATES" | "ADDRESS" | "MUNICIPALITY" | "ISLAND" | "JURISDICTION" | "UNSPECIFIED";

export type PlaceEntity = {
  id: string;
  name: string;
  kind: PlaceEntityKind;
  jurisdiction: string | null; // e.g. "Tobago" -- only ever the request's own stated jurisdiction
  locationPrecision: LocationPrecision;
  confirmedLocation: string | null; // only ever set when a source directly states it
  inferredCoverage: string | null; // an explicit, separately-labeled guess -- never merged with confirmedLocation
  availability: PlaceAvailability;
  eligibility: string | null;
  accessibilityNotes: string | null;
  geographicConstraints: string | null;
  provenance: string; // source publisher/url/id
  confidence: EvidenceConfidence;
  lastCheckedAt: string;
};

export type PlaceMapResult = {
  entities: PlaceEntity[];
  missing: string[]; // explicit disclosure of what's missing/unavailable
};

// A real, deterministic, inspectable keyword heuristic -- not a claim of accurate NLP
// classification (see GOVERNANCE/ECOMAP_SOURCE_AND_BOUNDARY.md). Returns UNKNOWN rather than
// guessing when nothing matches.
export function classifyPlaceKind(text: string): PlaceEntityKind {
  const t = (text || "").toLowerCase();
  if (/\b(grant|fund|loan|scholarship|program(?:me)?)\b/.test(t)) return "OPPORTUNITY";
  if (/\b(workshop|training|seminar|event|conference)\b/.test(t)) return "EVENT";
  if (/\b(report|study|assessment|consultation|review)\b/.test(t)) return "REPORT";
  if (/\b(ministry|agency|authority|council|association|chamber|bank)\b/.test(t)) return "ORGANIZATION";
  if (/\b(office|centre|center|clinic|service|bureau)\b/.test(t)) return "SERVICE";
  return "UNKNOWN";
}

// Extracts the request's OWN stated jurisdiction from its own text -- never from a device/IP
// location API (none exists in this module). Deliberately a small, real, closed keyword list
// (Trinidad and Tobago place names) -- returns null rather than guessing.
const JURISDICTION_KEYWORDS = ["Tobago", "Trinidad", "Port of Spain", "Scarborough", "San Fernando", "Arima", "Chaguanas", "Point Fortin"];
export function extractStatedJurisdiction(text: string): string | null {
  for (const place of JURISDICTION_KEYWORDS) {
    if (new RegExp(`\\b${place}\\b`, "i").test(text || "")) return place;
  }
  return null;
}

// Another real, deterministic, inspectable keyword heuristic (see GOVERNANCE/
// ECOMAP_SOURCE_AND_BOUNDARY.md) -- never a guess dressed up as a confirmed fact.
export function classifyAvailability(text: string): PlaceAvailability {
  const t = (text || "").toLowerCase();
  const online = /\b(online|virtual|website|portal|e-service)\b/.test(t);
  const physical = /\b(office|centre|center|in[- ]person|visit|walk-in|branch)\b/.test(t);
  if (online && physical) return "HYBRID";
  if (online) return "ONLINE";
  if (physical) return "PHYSICAL";
  return "UNKNOWN";
}

// A real, deterministic zero-cost signal from the source's own text -- never fabricated when
// absent (returns null). Grounds the required "zero-cost alternatives appear when appropriate"
// behavior in actual evidence rather than a generic filler statement.
export function detectZeroCost(text: string): string | null {
  if (/\b(free|no[- ]cost|zero[- ]cost|no charge|at no cost)\b/i.test(text || "")) {
    return "Source text indicates this may be free/no-cost -- confirm directly before relying on it.";
  }
  return null;
}

function placeEntityFromSource(source: EcoMapSourceRecord, jurisdiction: string | null): PlaceEntity {
  return {
    id: source.id,
    name: source.title,
    kind: classifyPlaceKind(source.text),
    jurisdiction,
    locationPrecision: jurisdiction ? "JURISDICTION" : "UNSPECIFIED",
    confirmedLocation: null, // no source in this pass states a confirmed municipality-level address
    inferredCoverage: jurisdiction ? `${jurisdiction} (inferred from the request's own stated jurisdiction, not a source-confirmed service area)` : null,
    availability: classifyAvailability(source.text),
    eligibility: null,
    accessibilityNotes: null,
    geographicConstraints: null,
    provenance: source.publisher || source.url || source.id,
    confidence: source.confidence,
    lastCheckedAt: source.recordedAt,
  };
}

export function buildPlaceMap(sources: EcoMapSourceRecord[], jurisdiction: string | null): PlaceMapResult {
  const entities = sources.map((s) => placeEntityFromSource(s, jurisdiction));
  const missing: string[] = [];
  if (!jurisdiction) missing.push("No jurisdiction was stated in the request -- coverage cannot be scoped to a specific area.");
  if (entities.every((e) => e.kind === "UNKNOWN")) missing.push("Entity type (service/organization/opportunity/event/report) could not be determined for any entity from title text alone.");
  if (entities.every((e) => e.availability === "UNKNOWN")) missing.push("Physical/online/hybrid availability is not confirmed by any source.");
  if (entities.every((e) => !e.eligibility)) missing.push("Eligibility and accessibility requirements are not confirmed by any source.");
  return { entities, missing };
}

// --- EcoMap Pathway ----------------------------------------------------------------------------

export type PathwayStep = {
  id: string;
  order: number;
  description: string;
  status: EvidenceConfidence;
  eligibility: string | null;
  requiredDocuments: string[];
  cost: string | null;
  zeroCostAlternative: string | null;
  deadline: string | null;
  dependsOn: string[]; // ids of prerequisite steps
  handoffOrganization: string | null;
  bottleneck: string | null;
  provenance: string | null;
  confidence: EvidenceConfidence;
};

export type PathwayMapResult = {
  outcome: string;
  steps: PathwayStep[];
  alternativePathways: string[];
  missing: string[];
  lastVerifiedAt: string | null;
};

function pathwayStepFromSource(source: EcoMapSourceRecord, order: number): PathwayStep {
  return {
    id: source.id,
    order,
    description: `A source ("${source.title}") plausibly relates to this outcome -- exact step content is not confirmed.`,
    status: "INFERRED", // a search result never confirms an ordered, required step -- see boundary note
    eligibility: null,
    requiredDocuments: [],
    cost: null,
    zeroCostAlternative: detectZeroCost(source.text),
    deadline: null,
    dependsOn: order > 0 ? [`step-${order - 1}`] : [],
    handoffOrganization: null,
    bottleneck: null,
    provenance: source.publisher || source.url || source.id,
    confidence: source.confidence,
  };
}

// A pathway must not pretend a step is confirmed when evidence is absent (required property).
// Auto-built steps from search sources are always INFERRED; this function also always appends an
// explicit MISSING disclosure step rather than letting the caller assume the list is complete.
export function buildPathwayMap(outcome: string, sources: EcoMapSourceRecord[]): PathwayMapResult {
  const steps = sources.map((s, i) => pathwayStepFromSource(s, i));
  const missing: string[] = [
    "Exact ordered steps, eligibility and required documents are not confirmed by any source -- verify directly with the responsible organization before acting.",
  ];
  if (steps.every((s) => !s.cost && !s.zeroCostAlternative)) missing.push("Cost and zero-cost alternatives are not confirmed by any source.");
  if (steps.every((s) => !s.deadline)) missing.push("No deadline is confirmed by any source.");
  if (steps.every((s) => !s.handoffOrganization)) missing.push("No specific organization/handoff is confirmed by any source.");
  return {
    outcome,
    steps,
    alternativePathways: [],
    missing,
    lastVerifiedAt: sources.length ? sources[0].recordedAt : null,
  };
}

// --- EcoMap Relationship -------------------------------------------------------------------------

export type RelationshipDirection = "SOURCE_TO_TARGET" | "TARGET_TO_SOURCE" | "BIDIRECTIONAL" | "UNKNOWN";
export type RelationshipSensitivity = "PUBLIC" | "SENSITIVE" | "PRIVATE";

export type RelationshipEdge = {
  id: string;
  sourceEntity: string;
  targetEntity: string;
  relationType: string; // e.g. "POTENTIAL_REFERRAL" -- never a specific claim (e.g. "FUNDS") without real support
  direction: RelationshipDirection;
  influence: EvidenceConfidence;
  dependency: boolean | "UNKNOWN";
  incentive: string | null;
  reciprocalValue: string | null;
  trustConfidence: EvidenceConfidence;
  provenance: string | null;
  sensitivity: RelationshipSensitivity;
};

export type RelationshipMapResult = {
  edges: RelationshipEdge[]; // ALL edges, including SENSITIVE/PRIVATE ones, for an authorized advanced/internal caller
  publicEdgeCount: number;
  suppressedCount: number; // SENSITIVE/PRIVATE edges never named in customer-facing text
  missing: string[];
};

function relationshipEdgeFromSource(subject: string, source: EcoMapSourceRecord, index: number): RelationshipEdge {
  return {
    id: `edge-${index}`,
    sourceEntity: subject,
    targetEntity: source.title,
    // Never a specific claim (e.g. "FUNDS"/"PARTNERS_WITH") from a search snippet alone -- see
    // GOVERNANCE/ECOMAP_SOURCE_AND_BOUNDARY.md. A generic, low-confidence relation only.
    relationType: "POTENTIAL_REFERRAL",
    direction: "UNKNOWN",
    influence: "UNKNOWN",
    dependency: "UNKNOWN",
    incentive: null,
    reciprocalValue: null,
    trustConfidence: source.confidence,
    provenance: source.publisher || source.url || source.id,
    // Org-to-org / goal-to-organization relationships built from public search results are PUBLIC
    // by construction -- this module never builds a person-level edge from generic web snippets.
    sensitivity: "PUBLIC",
  };
}

// Optional caller-supplied (advanced/internal) candidate edges -- e.g. from a governance/audit
// tool with real relationship data, some of which may be SENSITIVE/PRIVATE. Auto-built edges from
// `sources` are always appended; `explicitEdges` lets an advanced caller add real edges of any
// sensitivity, which this function then correctly suppresses from customer-facing counting logic.
export function buildRelationshipMap(subject: string, sources: EcoMapSourceRecord[], explicitEdges: RelationshipEdge[] = []): RelationshipMapResult {
  const autoEdges = sources.map((s, i) => relationshipEdgeFromSource(subject, s, i));
  const edges = [...autoEdges, ...explicitEdges];
  const publicEdges = edges.filter((e) => e.sensitivity === "PUBLIC");
  const suppressed = edges.filter((e) => e.sensitivity !== "PUBLIC");
  const missing: string[] = [];
  if (edges.every((e) => e.relationType === "POTENTIAL_REFERRAL")) missing.push("No specific relationship type (funds/partners-with/refers-to) is confirmed by any source -- only a generic potential-referral link.");
  if (edges.every((e) => e.direction === "UNKNOWN")) missing.push("Direction of influence/dependency is not confirmed by any source.");
  return { edges, publicEdgeCount: publicEdges.length, suppressedCount: suppressed.length, missing };
}
