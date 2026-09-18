// FTN / IBIS Canonical Architecture -- Phase 6: the Release Validator.
//
// See the Phase 6 directive's Items 2-9. This is the ONE deterministic final stage that decides
// whether a draft answer may leave ibis. It does NOT retrieve, select a provider, reason, or compute
// a deterministic answer -- it only compares an already-produced draft against canonical truth
// (RequestFrame, EvidenceContract, EvidencePacket, ClaimsLedger, capability-execution truth) and
// returns one of three decisions: RELEASE, REVISE, WITHHOLD.
//
// Explicit non-goal (Item 4): this is NOT an LLM-based omniscient fact checker. It never re-reads the
// draft with a model to judge truthfulness. Every check below is a deterministic regex/structural
// test against a small, disclosed set of known-risky patterns (internal-vocabulary leakage, a
// missing temporal/eligibility/action qualifier where the canonical packet says one is required,
// confident language claiming a capability outcome the receipt shows never happened). This can never
// catch every possible overclaim in arbitrary prose -- that limitation is real and stated in every
// result's `limitations` field, never hidden.
//
// REVISE is deliberately a DETERMINISTIC text transformation (jargon-sentence removal, a canned
// qualifying sentence appended), never a second, unpredictable LLM call: Item 3 requires "a bounded
// revision... maximum one synthesis revision" and Item 4 forbids inventing an LLM fact-checker. A
// second free-form model call to "please revise this" would itself need re-validating (what if the
// revision introduces a NEW leak or overclaim?), which risks exactly the unbounded loop Item 3
// prohibits. A deterministic transformation is trivially bounded (applied at most once, the result is
// re-validated at most once, and a still-failing result becomes WITHHOLD -- never a third attempt).

import type { RequestFrame } from "./ibis-request-frame.ts";
import type { EvidenceContract } from "./ibis-evidence-contract.ts";
import type { EvidencePacket, ClaimsLedger, EvidenceState } from "./ibis-evidence-processor.ts";
import type { EngineResult } from "./ibis-reasoning-engines.ts";

export type ReleaseDecision = "RELEASE" | "REVISE" | "WITHHOLD";

export type ValidationFailureType =
  | "FRAMEWORK_LEAKAGE"
  | "TEMPORAL_OVERCLAIM"
  | "UNSUPPORTED_CLAIM_STRENGTH"
  | "CAPABILITY_OVERCLAIM_CORRELATION"
  | "CAPABILITY_OVERCLAIM_ACTION"
  | "CAPABILITY_OVERCLAIM_ELIGIBILITY";

export type ValidationFailure = {
  type: ValidationFailureType;
  detail: string;
  // Whether this specific failure can be safely fixed by a deterministic text transformation
  // (jargon removal, a qualifier sentence appended) versus one that requires withholding the
  // assertion outright (a categorically false claim -- e.g. "the action completed" when it did not
  // -- cannot be rescued by adding a caveat; the sentence itself must not exist).
  revisable: boolean;
};

export type ReleaseValidationResult = {
  decision: ReleaseDecision;
  failures: ValidationFailure[];
  // The canonical, packet-derived evidence state this validation was performed against -- see
  // computeCanonicalPublicEvidenceState() below, the Item 6/7/8 authority migration.
  canonicalEvidenceState: EvidenceState;
  limitations: string[];
};

// --- Item 6/7/8: canonical evidenceState becomes the ONE authority for the public-facing field ----

// Item 7: SEARCH_GROUNDED must mean "canonical evidence requirements were actually met," never
// "the search API returned something" or "the quality gate accepted snippets." Item 8: VERIFIED may
// now be reached via a real deterministic engine, a real structured/authoritative dataset, OR
// genuinely inspected primary/official evidence -- never merely because a URL looks official or
// several snippets agree.
export function computeCanonicalPublicEvidenceState(
  packet: EvidencePacket,
  hadAnswer: boolean,
): "DETERMINISTIC" | "VERIFIED" | "MODEL_GENERATED" | "SEARCH_GROUNDED" | "INSUFFICIENT" | "NO_ANSWER_GENERATED" {
  if (!hadAnswer) return "NO_ANSWER_GENERATED";
  switch (packet.evidenceState) {
    case "VERIFIED": {
      const isDeterministic = packet.items.some((i) => i.origin === "DETERMINISTIC_ENGINE");
      return isDeterministic ? "DETERMINISTIC" : "VERIFIED";
    }
    case "CORROBORATED":
    case "SUPPORTED":
      // Item 7: only when the contract was actually satisfied by this evidence -- a SUPPORTED/
      // CORROBORATED state that still failed a hard contract requirement (contractSatisfied: false)
      // must never be relabeled SEARCH_GROUNDED merely because some relevant sources exist.
      return packet.contractSatisfied === true ? "SEARCH_GROUNDED" : "MODEL_GENERATED";
    case "PARTIAL":
      return "MODEL_GENERATED";
    case "NONE":
      return "MODEL_GENERATED";
    case "INSUFFICIENT":
      return "INSUFFICIENT";
  }
}

// --- Deterministic pattern libraries (Item 4: "the strongest safely detectable rules") ------------

// Known internal-vocabulary leaks -- the exact terms the Phase 5 FCL prompt instructions already ask
// the model never to print. The Release Validator is the SAFETY NET for when that instruction is not
// followed, not the primary defense (see Phase 5's FOUNDER_COGNITIVE_LAYER_INSTRUCTION).
const FRAMEWORK_LEAK_PATTERNS: RegExp[] = [
  /ricardo founder reasoning model/i,
  /founder cognitive layer/i,
  /\bevidencecontract\b/i,
  /\bevidencepacket\b/i,
  /\bclaimsledger\b/i,
  /\brequestframe\b/i,
  /\brelease validator\b/i,
  /\[R\d+\]/, // reasoning-synthesis line labels
  /reasoning synthesis for this request/i,
];

const TEMPORAL_QUALIFIER_PATTERNS =
  /couldn'?t verify|could not verify|cannot confirm|can'?t confirm|not (?:been )?confirmed|hasn'?t been verified|has not been verified|uncertain whether|not certain (?:that|whether)|no real-time|don'?t have (?:current|real-time)|as of my (?:last|latest)|might not (?:be|reflect)|may not (?:be|reflect)|unable to verify|couldn'?t confirm/i;

const HEDGE_PATTERNS = /\b(may|might|possibly|reportedly|unclear|unverified|appears?|seems?|likely|potentially)\b/i;

// Broadened after a live acceptance-testing finding (Phase 6): a model asked about correlation
// without a real executed series does not always use the literal word "correlation" -- common
// paraphrases ("research suggests a link," "studies have found," "is associated with," "can lead
// to") make the same confident relationship claim just as much in need of catching. Still bounded
// and disclosed (Item 4): this remains a fixed pattern list, not semantic understanding, and can
// still miss a paraphrase this list does not anticipate -- see this module's own `limitations` field.
const CORRELATION_OVERCLAIM_PATTERNS = /there(?:'s| is) a (?:strong |clear |significant |real )?(?:correlation|link|relationship)|the correlation (?:is|shows|between)|r\s*=\s*-?0?\.\d|suggests? a (?:strong |clear |significant |real )?link|studies (?:have |has )?(?:found|shown)|is (?:linked|associated) (?:to|with)|can lead to increased|research (?:suggests|shows|indicates)/i;

const ACTION_COMPLETION_OVERCLAIM_PATTERNS = /i'?ve connected|i have connected|successfully connected|the action (?:is|was) complete|has been completed|connected your (?:account|slack|app)/i;

const ELIGIBILITY_OVERCLAIM_PATTERNS = /you(?:'re| are) eligible\b|you (?:qualify|will qualify)\b/i;
const ELIGIBILITY_HEDGE_PATTERNS = /appears? (?:potentially )?eligible|may qualify|might qualify|criteria (?:still need|need) (?:to be )?verif|eligibility (?:still needs?|needs?) (?:to be )?verif/i;

function splitSentences(text: string): string[] {
  return text.split(/(?<=[.!?])\s+/).filter((s) => s.trim().length > 0);
}

// --- Main entry point --------------------------------------------------------------------------

export type ValidateReleaseInput = {
  draftAnswer: string;
  requestFrame: RequestFrame;
  evidenceContract: EvidenceContract;
  evidencePacket: EvidencePacket;
  claimsLedger: ClaimsLedger;
  engineResults: EngineResult[];
  actionExecuted: boolean; // real, already-computed truth (see ibis-evidence-processor.ts's own ACTION_NOT_EXECUTED_GAP logic) -- never recomputed here
};

export function validateRelease(input: ValidateReleaseInput): ReleaseValidationResult {
  const { draftAnswer, requestFrame, evidenceContract, evidencePacket, claimsLedger, engineResults, actionExecuted } = input;
  const failures: ValidationFailure[] = [];
  const limitations: string[] = [
    "Deterministic/regex-based validation only -- this cannot detect every possible overclaim phrased in prose the pattern library does not anticipate. It is a bounded safety net, not an omniscient fact checker (see Item 4 of the Phase 6 directive).",
  ];

  // Framework leakage -- checked unconditionally, even for a deterministic-only answer.
  for (const pattern of FRAMEWORK_LEAK_PATTERNS) {
    if (pattern.test(draftAnswer)) {
      failures.push({ type: "FRAMEWORK_LEAKAGE", detail: `Draft matched internal-vocabulary pattern ${pattern}.`, revisable: true });
      break; // one flag is enough to trigger revision; the revision step strips every matching sentence, not just the first
    }
  }

  const temporal = requestFrame.temporalRequirement;
  const canonicalState = evidencePacket.evidenceState;

  // Deterministic engine answers skip every other check -- there is no evidence/temporal/capability
  // question left to validate once a pure calculation has produced the answer.
  const isPureDeterministic = canonicalState === "VERIFIED" && evidencePacket.items.some((i) => i.origin === "DETERMINISTIC_ENGINE") && evidencePacket.items.every((i) => i.origin !== "SEARCH_RESULT");
  if (!isPureDeterministic) {
    // Item 5: temporal authority. A HIGH-strictness request whose packet did NOT confirm temporal
    // satisfaction must not present the claim as verified-current without a qualifier.
    if (temporal.strictness === "HIGH" && evidencePacket.temporal.required && evidencePacket.temporal.satisfied !== true) {
      if (!TEMPORAL_QUALIFIER_PATTERNS.test(draftAnswer)) {
        failures.push({
          type: "TEMPORAL_OVERCLAIM",
          detail: `Temporal strictness is HIGH and the packet's temporal.satisfied is ${evidencePacket.temporal.satisfied} (unresolved=${evidencePacket.temporal.unresolved}), but the draft carries no qualifying language.`,
          revisable: true,
        });
      }
    }

    // Item 4: claim-strength enforcement via ClaimsLedger. The aggregate topical claim is the only
    // one this architecture can reliably map to "the answer's overall factual assertion" (see
    // ibis-evidence-processor.ts RULE 10/11 -- no per-sentence claim extraction exists). Deliberately
    // skipped when the contract permits STRATEGIC_JUDGMENT claims (FOUNDER_STRATEGY): a planning/
    // decision-framework answer is not a factual assertion needing evidentiary hedging in the first
    // place, and the coarse, single, whole-answer "topical claim" cannot distinguish a strategic
    // opinion from a factual one within the same answer (a real, disclosed ClaimsLedger limitation,
    // not a new one introduced here) -- found via a real test failure during Phase 6 development
    // (a FOUNDER_STRATEGY answer using the rules-based founder-reasoning fallback was being
    // incorrectly withheld for lacking evidentiary hedging it was never meant to carry).
    const topical = evidenceContract.permittedClaimTypes.includes("STRATEGIC_JUDGMENT") ? undefined : claimsLedger.find((c) => c.id === "claim-topical");
    if (topical && (topical.allowedStrength === "DO_NOT_ASSERT" || topical.allowedStrength === "HYPOTHETICAL")) {
      const hasHedge = HEDGE_PATTERNS.test(draftAnswer) || TEMPORAL_QUALIFIER_PATTERNS.test(draftAnswer);
      if (!hasHedge) {
        failures.push({
          type: "UNSUPPORTED_CLAIM_STRENGTH",
          detail: `ClaimsLedger's topical claim is only ${topical.status}/${topical.allowedStrength}, but the draft asserts it with no hedging/qualifying language.`,
          revisable: true,
        });
      }
    }

    // Item 9: capability-truth enforcement -- a MODEL_TEXT provider can never self-certify these.
    if (evidenceContract.queryClass === "CORRELATION") {
      const correlationRan = engineResults.some((e) => e.engine === "CORRELATION" && e.status === "OK");
      if (!correlationRan && CORRELATION_OVERCLAIM_PATTERNS.test(draftAnswer)) {
        failures.push({ type: "CAPABILITY_OVERCLAIM_CORRELATION", detail: "Draft asserts a computed correlation/statistic, but no CORRELATION engine genuinely executed.", revisable: false });
      }
    }
    if (requestFrame.requiresExternalAction && !actionExecuted && ACTION_COMPLETION_OVERCLAIM_PATTERNS.test(draftAnswer)) {
      failures.push({ type: "CAPABILITY_OVERCLAIM_ACTION", detail: "Draft claims an external action completed, but no executor confirmed it.", revisable: false });
    }
    if (evidenceContract.queryClass === "PATHWAY") {
      const anyInspected = evidencePacket.items.some((i) => i.evidenceDepth === "PRIMARY_DOCUMENT" || i.evidenceDepth === "RETRIEVED_PAGE");
      if (!anyInspected && ELIGIBILITY_OVERCLAIM_PATTERNS.test(draftAnswer) && !ELIGIBILITY_HEDGE_PATTERNS.test(draftAnswer)) {
        failures.push({ type: "CAPABILITY_OVERCLAIM_ELIGIBILITY", detail: "Draft asserts confirmed eligibility, but no primary/official page was actually inspected.", revisable: false });
      }
    }
  }

  const hasNonRevisable = failures.some((f) => !f.revisable);
  const decision: ReleaseDecision = hasNonRevisable ? "WITHHOLD" : failures.length > 0 ? "REVISE" : "RELEASE";

  return { decision, failures, canonicalEvidenceState: canonicalState, limitations };
}

// --- Bounded deterministic revision (Item 3) -----------------------------------------------------

// Sentence-level removal first (the common case: a leak confined to its own throwaway sentence,
// e.g. "Based on the EvidenceContract, ..."), but falling back to phrase-level replacement when
// removing every offending sentence would empty the answer (the leak IS the whole sentence and the
// whole sentence is the whole answer) -- an empty or wholly-reverted answer would either violate
// Item 18 (never a bare refusal) or silently let the exact leaked term back through. Phrase
// replacement guarantees the leaked vocabulary itself never survives, in every case.
function stripLeakedSentences(text: string): string {
  const sentences = splitSentences(text);
  const kept = sentences.filter((sentence) => !FRAMEWORK_LEAK_PATTERNS.some((p) => p.test(sentence)));
  if (kept.length > 0) return kept.join(" ").trim();
  let phraseReplaced = text;
  for (const pattern of FRAMEWORK_LEAK_PATTERNS) {
    phraseReplaced = phraseReplaced.replace(new RegExp(pattern.source, pattern.flags.includes("g") ? pattern.flags : pattern.flags + "g"), "the available information");
  }
  return phraseReplaced.trim();
}

function temporalQualifierSentence(temporal: RequestFrame["temporalRequirement"]): string {
  if (temporal.type === "HISTORICAL") return "I found information about this period, but could not fully verify every detail against a primary source.";
  return "I found relevant information, but could not verify that it falls within the requested time period, so I can't confirm this as fully current.";
}

// Applies exactly the deterministic fixes the failures call for, once. Never re-invoked in a loop by
// this module itself -- the caller (ibis-canonical-brain.ts) re-validates the result and, if it still
// fails, withholds rather than revising again (Item 3: "Do not create unbounded loops").
export function applyDeterministicRevision(draftAnswer: string, failures: ValidationFailure[], requestFrame: RequestFrame): string {
  let revised = draftAnswer;
  if (failures.some((f) => f.type === "FRAMEWORK_LEAKAGE")) {
    revised = stripLeakedSentences(revised); // guaranteed non-empty and guaranteed leak-free -- see its own doc comment
  }
  if (failures.some((f) => f.type === "TEMPORAL_OVERCLAIM")) {
    revised = `${revised} ${temporalQualifierSentence(requestFrame.temporalRequirement)}`.trim();
  }
  if (failures.some((f) => f.type === "UNSUPPORTED_CLAIM_STRENGTH")) {
    // "unverified" deliberately matches HEDGE_PATTERNS -- the revision must satisfy the very check
    // that triggered it, or re-validation would fail again and this would always end in WITHHOLD.
    revised = `${revised} This is based on limited, unverified evidence and should be treated as provisional.`.trim();
  }
  return revised;
}

// --- WITHHOLD: the strongest honest answer, never a generic refusal (Items 3/18) -------------------

export function buildWithholdAnswer(input: {
  requestFrame: RequestFrame;
  evidencePacket: EvidencePacket;
  failures: ValidationFailure[];
  originalText: string;
}): string {
  const { evidencePacket, failures, requestFrame } = input;
  if (failures.some((f) => f.type === "CAPABILITY_OVERCLAIM_ACTION")) {
    return "The action wasn't completed because the connected service didn't confirm it -- I can't report it as done.";
  }
  if (failures.some((f) => f.type === "CAPABILITY_OVERCLAIM_CORRELATION")) {
    return "I don't have a valid, comparable data series to compute a real correlation for this, so I can't state one -- only that a relationship might exist, unverified.";
  }
  if (failures.some((f) => f.type === "CAPABILITY_OVERCLAIM_ELIGIBILITY")) {
    return "This programme or opportunity appears potentially relevant, but I couldn't verify the exact eligibility requirements from an official source -- the criteria still need to be confirmed directly.";
  }
  const sourceCount = evidencePacket.items.filter((i) => i.origin === "SEARCH_RESULT").length;
  if (requestFrame.temporalRequirement.strictness === "HIGH") {
    return sourceCount > 0
      ? `I found ${sourceCount} report${sourceCount === 1 ? "" : "s"} that may be relevant, but I couldn't verify they fall within the requested time period, so I can't confirm this as a current development.`
      : "I couldn't find verifiable, current information for this -- I don't want to state something unconfirmed as current fact.";
  }
  return sourceCount > 0
    ? `I found some relevant information, but couldn't independently verify it well enough to state it as confirmed.`
    : "I don't have verifiable evidence for this one -- I don't want to state something unconfirmed as fact.";
}
