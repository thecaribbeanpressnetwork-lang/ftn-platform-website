// FTN Platform — Founder reasoning lenses (Truthmode / Red Team / Pareto / FutureYou / Value Lens /
// Caribbean lens).
//
// Every lens here is a PURE, DETERMINISTIC function over data this canonical brain has already
// computed for real this request (search sources, the FOUNDER_THINKING/ECOMAP_*/BUTTERFLY engine
// results, the intent classification) -- never a second LLM call, never free-text re-analysis, and
// never an invented fact. This follows the exact same discipline as every adapter in
// ibis-reasoning-engines.ts: a lens with nothing real to work from returns an honestly empty/null
// result, never a fabricated one. These are surfaced under FOUNDER_THINKING's structured output
// (see ibis-reasoning-synthesis.ts), not registered as separate CapabilityKind values, because none
// of them performs its own retrieval or execution -- they interpret results other engines already
// produced.
import type { QueryClass } from "./ibis-response-envelope.ts";
import type { EngineResult } from "./ibis-reasoning-engines.ts";
import type { SourceRecord } from "./ibis-response-envelope.ts";

// --- Truthmode --------------------------------------------------------------------------------
// Distinguishes VERIFIED / INFERRED / ASSUMED / UNKNOWN. Never collapses uncertainty into
// certainty: a search snippet is always INFERRED (never VERIFIED -- no adapter in this codebase
// inspects a full page yet), a Founder Thinking/heuristic judgment is always ASSUMED, and an
// explicit "missing"/uncertainty disclosure from any engine is always UNKNOWN. VERIFIED is reserved
// for a deterministic calculation or an EBR-admissible, mechanism-gated candidate -- the two cases
// in this codebase where a claim has passed a real, inspectable gate rather than merely being
// retrieved or inferred.
export type TruthmodeResult = { verified: string[]; inferred: string[]; assumed: string[]; unknown: string[] };

export function computeTruthmode(input: {
  sources: SourceRecord[];
  ebrResult: EngineResult | null;
  founderResult: EngineResult | null;
  uncertainties: string[];
  deterministicAnswer: boolean;
}): TruthmodeResult {
  const verified: string[] = [];
  const inferred: string[] = [];
  const assumed: string[] = [];
  const unknown: string[] = [];

  if (input.deterministicAnswer) verified.push("The answer itself is a deterministic calculation, not a model judgment.");

  if (input.ebrResult && input.ebrResult.executed) {
    const admissibleFinding = input.ebrResult.findings.find((f) => f.startsWith("Strongest admissible candidate"));
    if (admissibleFinding) verified.push(`EBR: ${admissibleFinding}`);
    const abstainedFinding = input.ebrResult.findings.find((f) => f.includes("abstains") || f.includes("Unmodeled-history reserve"));
    if (abstainedFinding) unknown.push(`EBR: ${abstainedFinding}`);
  }

  for (const s of input.sources.slice(0, 8)) {
    inferred.push(`"${s.title}" (${s.publisher || s.url}) -- a search-result snippet, not an independently verified fact.`);
  }

  if (input.founderResult && input.founderResult.executed) {
    assumed.push(...input.founderResult.assumptions.map((a) => `Founder Thinking: ${a}`));
  }

  unknown.push(...input.uncertainties.slice(0, 6));

  return { verified, inferred, assumed, unknown };
}

// --- Red Team ---------------------------------------------------------------------------------
// Only meaningful for a strategy/outcome/planning decision -- computeRedTeam() itself enforces this
// gate (the caller does not have to remember to check queryClass). Derives its failure mode and
// weak assumption directly from Founder Thinking's own real, already-computed risk statement
// (FOUNDER_GUIDANCE's `risks` field, surfaced as `founderResult.assumptions[0]`) -- never invents a
// new risk. The mitigation prefers a real, source-grounded zero-cost alternative from EcoMap
// Pathway when one exists; otherwise falls back to the one generic, always-true mitigation this
// codebase's own Founder Reasoning discipline already recommends everywhere: the smallest
// reversible experiment.
export type RedTeamResult = { failureMode: string; weakAssumption: string; mitigation: string };

export function computeRedTeam(input: {
  queryClass: QueryClass;
  founderThinkingPlanned: boolean;
  founderResult: EngineResult | null;
  ecoMapPathwayResult: EngineResult | null;
}): RedTeamResult | null {
  if (input.queryClass !== "FOUNDER_STRATEGY" && !input.founderThinkingPlanned) return null;
  if (!input.founderResult || !input.founderResult.executed) return null;
  const weakAssumption = input.founderResult.assumptions[0] || "No specific risk was classified for this request's domain.";
  const decisionFinding = input.founderResult.findings.find((f) => f.startsWith("Decision:")) || "";
  const objectiveFinding = input.founderResult.findings.find((f) => f.startsWith("Objective:")) || "";
  const failureMode = `If "${weakAssumption}" is left unaddressed, the ${decisionFinding.replace("Decision: ", "").toLowerCase() || "planned"} path toward "${objectiveFinding.replace("Objective: ", "") || "the stated objective"}" is the most likely point of stall or embarrassment.`;
  const zeroCostAlternative = input.ecoMapPathwayResult?.findings.find((f) => f.toLowerCase().includes("zero-cost alternative:"));
  const mitigation = zeroCostAlternative
    ? `Mitigate with the zero-cost path already surfaced by EcoMap Pathway: ${zeroCostAlternative.split("Zero-cost alternative:")[1]?.trim() || zeroCostAlternative}`
    : "Mitigate by running the smallest reversible experiment that would surface this specific risk before committing real budget, time or public commitment to it.";
  return { failureMode, weakAssumption, mitigation };
}

// --- Pareto (80/20) -----------------------------------------------------------------------------
// Prevents a bloated action plan: returns at most the top 3 highest-leverage actions from
// whatever this request's engines already produced (Founder Thinking's own downstreamEffects,
// EcoMap Pathway's step/zero-cost actions) -- never invents a new action. A zero-cost or explicit
// "first"/"start" action is ranked above a generic one; ties keep original engine order.
export type ParetoResult = { highestLeverageActions: string[] };

export function computePareto(candidateActions: string[]): ParetoResult | null {
  const deduped = Array.from(new Set(candidateActions.filter((a) => a && a.trim())));
  if (!deduped.length) return null;
  const score = (a: string): number => {
    const lower = a.toLowerCase();
    let s = 0;
    if (/zero[- ]cost|free|no[- ]cost/.test(lower)) s += 2;
    if (/^(1\.|step 1|name the|state the|write the|choose one)/i.test(a.trim())) s += 2;
    if (/verify|confirm|test/.test(lower)) s += 1;
    return s;
  };
  const ranked = deduped.map((a, i) => ({ a, i, s: score(a) })).sort((x, y) => y.s - x.s || x.i - y.i);
  return { highestLeverageActions: ranked.slice(0, 3).map((r) => r.a) };
}

// --- FutureYou --------------------------------------------------------------------------------
// Evaluates whether the decision on the table improves future optionality, control, recurring
// value and reversibility -- derived from Founder Thinking's own decision (BUILD_NOW/PREPARE_NOW/
// EXPERIMENT already means something specific about commitment level in FOUNDER_GUIDANCE) and any
// zero-cost/ownership signal already surfaced elsewhere. A short, real, disclosed judgment string
// per dimension -- never a numeric score dressed up as measurement.
export type FutureYouResult = { optionality: string; control: string; recurringValue: string; reversibility: string };

export function computeFutureYou(input: { founderResult: EngineResult | null; hasZeroCostSignal: boolean; text: string }): FutureYouResult | null {
  if (!input.founderResult || !input.founderResult.executed) return null;
  const decisionFinding = input.founderResult.findings.find((f) => f.startsWith("Decision:")) || "";
  const decision = decisionFinding.replace("Decision: ", "").trim();
  const dependencyRisk = /\b(depend|reliance|reliant|single provider|free ai|free-tier|only provider)\b/i.test(input.text);
  return {
    reversibility: decision === "EXPERIMENT" ? "High -- an experiment is explicitly the smallest reversible step, easy to abandon without sunk commitment." : decision === "PREPARE_NOW" ? "Moderate -- preparation work is mostly reversible but consumes real time before any commitment." : "Lower -- BUILD NOW implies real resource commitment; keep the first milestone small enough to still be reversible.",
    control: dependencyRisk ? "At risk -- the request itself names a dependency on a single external/free provider, which reduces control if that provider changes terms or availability." : "Not flagged as at-risk by this request's own text; no single-dependency signal was detected.",
    recurringValue: input.hasZeroCostSignal ? "A zero-cost path was found in this request's own evidence -- recurring value is not gated behind ongoing spend." : "Not established by this request's evidence either way.",
    optionality: decision === "EXPERIMENT" ? "Preserved -- nothing here forecloses a different path if the experiment's evidence points elsewhere." : "Partially spent by design -- BUILD/PREPARE NOW means committing to one path; keep the smallest viable version of it to protect the rest.",
  };
}

// --- Value Lens (Hormozi-style abstract business logic; never personality imitation) ------------
// dream outcome / perceived likelihood / time delay / effort-sacrifice -- purely the decision-table
// shape, never invented numbers. Deterministic mapping from Founder Thinking's own decision.
export type ValueLensResult = { outcome: string; likelihood: string; delay: string; effort: string };

const VALUE_LENS_BY_DECISION: Record<string, Omit<ValueLensResult, "outcome">> = {
  BUILD_NOW: { likelihood: "Moderate-to-high, conditional on narrowing to one real customer and one job-to-be-done first.", delay: "Low if scope stays narrow; rises sharply if the first milestone tries to serve everyone.", effort: "Real build effort is required now; effort is reduced by reusing existing FTN-owned infrastructure rather than duplicating it." },
  PREPARE_NOW: { likelihood: "Moderate -- depends on evidence gathered during preparation, not yet demonstrated.", delay: "Moderate -- preparation is a real time cost before any outcome is realized.", effort: "Lower near-term effort than building, but does not yet produce the outcome itself." },
  EXPERIMENT: { likelihood: "Low-to-uncertain by design -- the point of an experiment is to find out, not to assume.", delay: "Low -- an experiment is deliberately the smallest, fastest test available.", effort: "Minimal by design; the whole premise fails if the experiment itself is expensive." },
};

export function computeValueLens(founderResult: EngineResult | null): ValueLensResult | null {
  if (!founderResult || !founderResult.executed) return null;
  const decisionFinding = founderResult.findings.find((f) => f.startsWith("Decision:")) || "";
  const decision = decisionFinding.replace("Decision: ", "").trim();
  const objectiveFinding = founderResult.findings.find((f) => f.startsWith("Objective:")) || "";
  const shape = VALUE_LENS_BY_DECISION[decision] || VALUE_LENS_BY_DECISION.EXPERIMENT;
  return { outcome: objectiveFinding.replace("Objective: ", "") || "Not classified.", ...shape };
}

// --- Caribbean lens -----------------------------------------------------------------------------
// Strengthens the existing partial Caribbean framing into structured reasoning. Gated on real
// relevance signals (a stated jurisdiction, an explicit Trinidad/Tobago/Caribbean mention, or the
// request already invoking Founder Thinking on a business/civic/delivery domain that names the
// region) -- never forced onto an unrelated question. Constraints/advantages/ownership lines are a
// fixed, disclosed, non-exhaustive list drawn from the same real considerations FOUNDER_GUIDANCE
// already encodes (small-market economics, ownership/control, zero-cost alternatives), not invented
// per-request.
export type CaribbeanLensResult = { relevance: "HIGH" | "MODERATE" | "NONE"; constraints: string[]; regionalAdvantages: string[]; ownershipImplications: string[] };

const CARIBBEAN_MENTION = /\b(trinidad|tobago|caribbean|t&t|port of spain|scarborough|san fernando|arima|chaguanas|point fortin)\b/i;

export function computeCaribbeanLens(input: { text: string; jurisdiction: string | null; founderThinkingPlanned: boolean; hasZeroCostSignal: boolean; ecosystemConnections: string[] }): CaribbeanLensResult {
  const mentioned = input.jurisdiction || CARIBBEAN_MENTION.test(input.text);
  if (!mentioned) return { relevance: "NONE", constraints: [], regionalAdvantages: [], ownershipImplications: [] };
  const relevance: "HIGH" | "MODERATE" = input.jurisdiction ? "HIGH" : "MODERATE";
  const constraints: string[] = [];
  const regionalAdvantages: string[] = [];
  const ownershipImplications: string[] = [];
  if (input.founderThinkingPlanned) {
    constraints.push("Small-market economics -- a Trinidad & Tobago/Caribbean customer base is real but small; a plan that only works at large-market scale may not clear its own break-even here.");
    constraints.push("Regional payment/infrastructure friction (card acceptance, hosting latency, connectivity cost) should be checked directly rather than assumed away.");
    regionalAdvantages.push("Diaspora leverage: Caribbean diaspora networks are a real, underused distribution and funding channel worth naming explicitly rather than treating the market as local-only.");
    if (input.hasZeroCostSignal) regionalAdvantages.push("A zero-cost path was already found in this request's own evidence -- worth prioritizing over a paid alternative for a small-market launch.");
    ownershipImplications.push("Prefer FTN-owned or regionally-controlled infrastructure over a single foreign free-tier provider where the choice is real -- data sovereignty and continuity of service both depend on who actually controls the dependency.");
  }
  if (input.ecosystemConnections.length) regionalAdvantages.push(`${input.ecosystemConnections.length} regional ecosystem connection(s) were already found by EcoMap Relationship for this request -- see ecosystemConnections.`);
  return { relevance, constraints, regionalAdvantages, ownershipImplications };
}
