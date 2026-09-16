// FTN Platform — Evidence-Bounded Retrodiction (EBR) engine.
//
// SOURCE/BOUNDARY: see GOVERNANCE/EBR_SOURCE_AND_BOUNDARY.md before extending this file. This is
// Ricardo Gill's published EBR protocol (DOI: https://doi.org/10.5281/zenodo.22681856), formalized
// in research/evidence-bounded-retrodiction/mathematics/index.html (K_att/K_rec/R, Φ(h),
// Admissible(h), RankKey(h), the ⊥ unmodeled-history reserve). This module implements ONLY that
// epistemic/causal-reconstruction protocol -- never the separate, speculative Gill Cohesive
// Consciousness Hypothesis. No output of this module may claim consciousness, sentience, digital
// immortality or mind-reading; a reconstructed actor-access assertion is an evidential claim, not
// a claim about what someone actually experienced.
//
// Honesty discipline (same as every other engine in ibis-reasoning-engines.ts): this module
// evaluates evidence and candidate causal histories a caller supplies. It does NOT retrieve
// evidence or generate hypotheses from live data -- no such data source is wired into the
// canonical brain for any engine yet. Absent real structured input, the adapter in
// ibis-reasoning-engines.ts honestly reports SKIPPED, never a fabricated reconstruction.
//
// Never produced by this module: a probability, a percentage confidence for a candidate history,
// a single collapsed "likelihood" score, or a claim that the examined candidates are exhaustive.

export type EpistemicStatus = "DOCUMENTED" | "INFERRED" | "SPECULATIVE" | "UNKNOWN";

// A(a,x,t): evidence that actor `actor` had access to item x by `accessTime`. `assertedAt` is when
// THIS ASSERTION ITSELF entered the record -- it may be later than accessTime (a late-discovered
// archive proving early access), which is exactly the case K_rec exists to capture honestly.
export type ActorAccessAssertion = {
  actor: string;
  accessTime: string; // ISO 8601
  assertedAt: string; // ISO 8601
  basis: EpistemicStatus;
};

// A single evidence item. Iv(x) is approximated here by eventTime (a point; the mathematics note's
// interval form is not needed for the discrete cases this pass evaluates). r(x) is recordTime.
// π(x) is provenance. σ(x) is epistemicStatus.
export type EvidenceItem = {
  id: string;
  eventTime: string; // ISO 8601 -- when the underlying event occurred
  recordTime: string; // ISO 8601 -- when THIS SYSTEM recorded/ingested the item (append-only)
  provenance: string;
  epistemicStatus: EpistemicStatus;
  scope?: string; // retrieval-scope tag used by retrospectiveEvidence()'s scope filter
  actorAccess?: ActorAccessAssertion[];
  observerMetadata?: Record<string, unknown> | null;
  contradicts?: string[]; // ids of OTHER evidence items this item conflicts with
  contradictionSeverity?: "HARD" | "SOFT"; // meaningful only when contradicts is non-empty
  supersedes?: string | null; // id of an earlier item this appends a correction to (never mutates it)
};

// --- Three-view evidence separation (mathematics note, section 4) -------------------------------

// K_att(a,tᵢ) = { x : r(x) ≤ tᵢ and C(a,x,tᵢ)=1 } -- the contemporaneously attested actor state:
// what the record ALREADY supported as accessible to `actor` by `decisionTime`. C(a,x,tᵢ) is
// implemented here as: an access assertion for `actor` whose accessTime AND assertedAt are both
// ≤ decisionTime -- i.e. the assertion itself, not only the access, existed by the decision time.
export function attestedKnowledge(actor: string, decisionTime: string, items: EvidenceItem[]): EvidenceItem[] {
  const t_i = Date.parse(decisionTime);
  return items.filter((x) => {
    if (Date.parse(x.recordTime) > t_i) return false;
    return (x.actorAccess || []).some((a) => a.actor === actor && Date.parse(a.accessTime) <= t_i && Date.parse(a.assertedAt) <= t_i);
  });
}

// K_rec(a,tᵢ;c) = { x : r(x) ≤ c and H_c(a,x,tᵢ)=1 } -- a LATER reconstruction (as of audit cutoff
// `c`) of what `actor` had access to by the OLD decision time `decisionTime`. This can legitimately
// include an access assertion whose assertedAt is AFTER decisionTime (but no later than the audit
// cutoff) -- a late-discovered archive proving earlier access. It never changes K_att itself.
export function reconstructedKnowledge(actor: string, decisionTime: string, auditCutoff: string, items: EvidenceItem[]): EvidenceItem[] {
  const t_i = Date.parse(decisionTime);
  const c = Date.parse(auditCutoff);
  return items.filter((x) => {
    if (Date.parse(x.recordTime) > c) return false;
    return (x.actorAccess || []).some((a) => a.actor === actor && Date.parse(a.accessTime) <= t_i && Date.parse(a.assertedAt) <= c);
  });
}

// R(c) = { x : r(x) ≤ c } ∩ S -- the retrospective evidence available by audit cutoff `c` within
// declared retrieval scope S. Not limited to what any historical actor knew -- this is the
// detective's evidence set, used only for causal reconstruction, never for appraising a historical
// decision (that appraisal must use K_att, not R).
export function retrospectiveEvidence(auditCutoff: string, items: EvidenceItem[], scope?: string[] | null): EvidenceItem[] {
  const c = Date.parse(auditCutoff);
  return items.filter((x) => Date.parse(x.recordTime) <= c && (!scope || !x.scope || scope.includes(x.scope)));
}

// --- Contradictions (never resolved automatically) ----------------------------------------------

export type ContradictionPair = { a: string; b: string; severity: "HARD" | "SOFT" };

// Preserves every declared contradiction as a pair, deduplicated by unordered id pair. Contradicts
// nothing implicitly, invents nothing, and resolves nothing -- required property 9 ("Preserve
// contradictions and incomparable candidates. Do not collapse them into an invented scalar score.").
export function findContradictions(items: EvidenceItem[]): ContradictionPair[] {
  const byId = new Map(items.map((i) => [i.id, i] as const));
  const pairs: ContradictionPair[] = [];
  const seen = new Set<string>();
  for (const item of items) {
    for (const otherId of item.contradicts || []) {
      if (!byId.has(otherId)) continue;
      const key = [item.id, otherId].sort().join("|");
      if (seen.has(key)) continue;
      seen.add(key);
      pairs.push({ a: item.id, b: otherId, severity: item.contradictionSeverity || "SOFT" });
    }
  }
  return pairs;
}

// --- Candidate causal histories (mathematics note, sections 6-9) --------------------------------

export type NominationSource = "CHRONOLOGY" | "CORRELATION" | "MECHANISM";

// A single proposed causal edge u -> v. Required property 7: a supported edge needs a mechanism
// class, temporal status, provenance roots, a testable intermediate implication, known
// contradictions (an explicit list, even if empty), and an epistemic label.
export type CausalEdgeProposal = {
  id: string;
  from: string;
  to: string;
  nominatedBy: NominationSource[];
  mechanismClass: string | null;
  temporalStatus: "BEFORE" | "CONCURRENT" | "UNKNOWN" | null;
  provenanceRoots: string[];
  testableImplication: string | null;
  knownContradictions: string[]; // ids of evidence items known to contradict this edge
  epistemicLabel: EpistemicStatus;
};

export type MechanismGateResult = { supported: boolean; reason: string };

// Required property 6: "Chronology, similarity and correlation may nominate a causal edge but
// cannot establish it." An edge nominated only by CHRONOLOGY/CORRELATION with no mechanismClass is
// UNSUPPORTED -- this is the one hard rule this function must never relax.
export function mechanismGate(edge: CausalEdgeProposal): MechanismGateResult {
  const label = `Edge ${edge.from} -> ${edge.to}`;
  const onlyWeakNomination = edge.nominatedBy.length > 0 && edge.nominatedBy.every((n) => n === "CHRONOLOGY" || n === "CORRELATION");
  if (!edge.mechanismClass) {
    return {
      supported: false,
      reason: onlyWeakNomination
        ? `${label} was nominated only by ${edge.nominatedBy.join("/")} -- chronology or correlation alone cannot establish a causal edge; a mechanism class is required.`
        : `${label} has no mechanism class.`,
    };
  }
  if (!edge.testableImplication) return { supported: false, reason: `${label} has a mechanism class but no testable intermediate implication.` };
  if (!edge.provenanceRoots || edge.provenanceRoots.length === 0) return { supported: false, reason: `${label} has no provenance root.` };
  if (!edge.temporalStatus) return { supported: false, reason: `${label} has no declared temporal status.` };
  if (edge.epistemicLabel === "UNKNOWN") return { supported: false, reason: `${label} carries an UNKNOWN epistemic label -- cannot be treated as supported.` };
  return { supported: true, reason: `${label} has mechanism class "${edge.mechanismClass}", a testable implication, ${edge.provenanceRoots.length} provenance root(s), and epistemic label ${edge.epistemicLabel}.` };
}

export type CandidateHistory = { id: string; label: string; edges: CausalEdgeProposal[] };

// Φ(h) = ⟨ m(h), n_π(h), c(h), u(h) ⟩ -- deliberately NOT a probability vector, never collapsed into
// one universal weighted score (mathematics note, section 7).
export type EvidenceProfile = {
  mechanismCoverage: number; // m(h): supported edges / total edges, in [0,1]
  provenanceRootCount: number; // n_π(h): distinct provenance roots across SUPPORTED edges
  contradictionBurden: number; // c(h): count of distinct known contradictions across all edges
  hardContradictionCount: number; // count of those contradictions adjudicated HARD
  unresolvedRequiredBridges: number; // u(h): edges failing the mechanism gate
};

export function evidenceProfile(history: CandidateHistory, items: EvidenceItem[]): EvidenceProfile {
  const byId = new Map(items.map((i) => [i.id, i] as const));
  let supported = 0;
  let unresolved = 0;
  const roots = new Set<string>();
  let contradictionBurden = 0;
  let hardContradictionCount = 0;
  const contradictionsSeen = new Set<string>();
  for (const edge of history.edges) {
    const gate = mechanismGate(edge);
    if (gate.supported) {
      supported += 1;
      edge.provenanceRoots.forEach((r) => roots.add(r));
    } else {
      unresolved += 1;
    }
    for (const contradictingId of edge.knownContradictions) {
      const key = `${edge.id}|${contradictingId}`;
      if (contradictionsSeen.has(key)) continue;
      contradictionsSeen.add(key);
      contradictionBurden += 1;
      const contradictingItem = byId.get(contradictingId);
      if (contradictingItem && contradictingItem.contradictionSeverity === "HARD") hardContradictionCount += 1;
    }
  }
  return {
    mechanismCoverage: history.edges.length ? supported / history.edges.length : 0,
    provenanceRootCount: roots.size,
    contradictionBurden,
    hardContradictionCount,
    unresolvedRequiredBridges: unresolved,
  };
}

// Admissible(h) = 1 only if u(h)=0 and c_hard(h)=0 (section 8). A missing required bridge is never
// "paid for" by unrelated supporting evidence; an adjudicated hard contradiction is never
// outweighed by volume of correlated reports.
export function isAdmissible(profile: EvidenceProfile): boolean {
  return profile.unresolvedRequiredBridges === 0 && profile.hardContradictionCount === 0;
}

// RankKey(h) = (Admissible(h), −c(h), coverage(h), n_π(h), −u(h)) -- a transparent DISPLAY ordering
// only (section 8's own caveat: "A stronger formal treatment may use a partial order or dominance
// relation so that genuinely incomparable histories remain incomparable" -- this lexicographic key
// is the prototype convention this implementation follows, not a claim of a resolved total order).
export type RankKey = readonly [number, number, number, number, number];

export function rankKey(profile: EvidenceProfile): RankKey {
  return [isAdmissible(profile) ? 1 : 0, -profile.contradictionBurden, profile.mechanismCoverage, profile.provenanceRootCount, -profile.unresolvedRequiredBridges] as const;
}

export function compareRankKeys(a: RankKey, b: RankKey): number {
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return b[i] - a[i]; // descending
  return 0;
}

export type RankedCandidate = { history: CandidateHistory; profile: EvidenceProfile; admissible: boolean };

export function rankCandidates(histories: CandidateHistory[], items: EvidenceItem[]): RankedCandidate[] {
  return histories
    .map((history) => {
      const profile = evidenceProfile(history, items);
      return { history, profile, admissible: isAdmissible(profile) };
    })
    .sort((a, b) => compareRankKeys(rankKey(a.profile), rankKey(b.profile)));
}
