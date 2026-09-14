import { recordOpportunity, type CebosReasoningState } from "./ibis-cebos.ts";

/**
 * Low-priority economic-shadow scanner. It never changes the user's active objective and never
 * invents an opportunity from silence. It records only mechanisms explicitly suggested by the
 * user's own description (friction, under-use, fragmentation, payment problems, etc.).
 */
export function scanOpportunitySignals(state: CebosReasoningState) {
  const text = state.request.toLowerCase();
  const signals: Array<{ re: RegExp; signal: string; mechanism: string; dims: Array<"CASH" | "ASSET" | "CONTROL" | "DATA" | "STRATEGIC" | "OPTION"> }> = [
    { re: /\b(bad|poor|ugly|outdated|weak)\b.{0,40}\b(marketing|branding|photos?|website|design)\b|\b(marketing|branding|photos?|website|design)\b.{0,40}\b(bad|poor|ugly|outdated|weak)\b/i, signal: "Fixable presentation/conversion friction may be an operator advantage.", mechanism: "Improve trust, conversion, direct demand and pricing through controllable presentation and distribution changes.", dims: ["CASH", "CONTROL", "OPTION"] },
    { re: /\b(manual|repetitive|slow process|paperwork|fragmented|broken link|customer confusion)\b/i, signal: "Workflow friction may support automation or service-productization.", mechanism: "Reduce time/cost/error by consolidating a repeated workflow into reusable infrastructure.", dims: ["CASH", "DATA", "STRATEGIC", "OPTION"] },
    { re: /\b(payment|bank|card|usd|foreign exchange|forex|fx)\b.{0,50}\b(problem|friction|cannot|can't|blocked|expensive|fee|fees|difficult)\b|\b(problem|friction|blocked|expensive|fees?)\b.{0,50}\b(payment|bank|card|usd|foreign exchange|forex|fx)\b/i, signal: "Payment/FX friction may reveal a regional financial-infrastructure opportunity.", mechanism: "A compliant lower-friction rail can reduce transaction loss and unlock regional/diaspora commerce.", dims: ["CASH", "CONTROL", "DATA", "STRATEGIC", "OPTION"] },
    { re: /\b(empty|unused|underused|under-used|vacant|idle capacity|low occupancy)\b/i, signal: "Under-used capacity may contain controllable upside.", mechanism: "Repackage, distribute, schedule or price existing capacity before adding new fixed cost.", dims: ["CASH", "ASSET", "OPTION"] },
    { re: /\b(no data|can't find|cannot find|hard to find|scattered|fragmented information|not indexed)\b/i, signal: "Information fragmentation may itself be a data/intelligence product opportunity.", mechanism: "Aggregate hard-to-find Caribbean evidence with provenance into a reusable discovery layer.", dims: ["DATA", "CONTROL", "STRATEGIC", "OPTION"] },
  ];
  for (const item of signals) {
    if (!item.re.test(state.request)) continue;
    recordOpportunity(state, { signal: item.signal, mechanism: item.mechanism, controllable: true, valueDimensions: item.dims, confidence: "WORKING_INFERENCE" });
  }
  return state.opportunitySignals;
}
