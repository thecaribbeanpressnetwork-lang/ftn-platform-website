import { addEvidence, chooseNextBottleneck, createReasoningState, evidenceSummary, researchSourcePlan, type CebosEvidence, type CebosReasoningState } from "./ibis-cebos.ts";

export type IbisTurn = { role: "user" | "assistant"; content: string };
export type IbisProduct = { name: string; route: string; tagline?: string };
export type ProviderResult = { answer: string; model: string };
export type GatewayProvider = { id: string; label: string; model?: string; configured: boolean; run: (timeoutMs: number) => Promise<ProviderResult> };

type Circuit = { failures: number; openUntil: number };
const circuits = new Map<string, Circuit>();
const FAILURE_THRESHOLD = 2;
const CIRCUIT_COOLDOWN_MS = 30_000;
const TOTAL_BUDGET_MS = 24_000;
const PROVIDER_BUDGET_MS = 9_000;
export const GATEWAY_VERSION = "ibis-gateway-2026-09-11.2-cebos";

function normalized(text: string) { return text.toLowerCase().replace(/[?.!,]/g, " ").replace(/\s+/g, " ").trim(); }
function arithmetic(text: string): string | null {
  const clean = normalized(text).replace(/^(what is|calculate|compute)\s+/, "").replace(/\bplus\b/g, "+").replace(/\bminus\b/g, "-").replace(/\b(times|multiplied by)\b/g, "*").replace(/\b(divided by|over)\b/g, "/");
  const match = clean.match(/^(-?\d+(?:\.\d+)?)\s*([+*/-])\s*(-?\d+(?:\.\d+)?)$/); if (!match) return null;
  const left = Number(match[1]), right = Number(match[3]); if (match[2] === "/" && right === 0) return "Division by zero is undefined.";
  const value = match[2] === "+" ? left + right : match[2] === "-" ? left - right : match[2] === "*" ? left * right : left / right;
  return `${match[1]} ${match[2]} ${match[3]} = ${Number.isInteger(value) ? value : Number(value.toFixed(10))}.`;
}
function personLookupSubject(text: string): string | null {
  const raw = String(text || "").trim();
  const match = raw.match(/^(?:tell me about|who is|who was|what do you know about|give me (?:information|info) (?:about|on))\s+(.+?)[?.!]*$/i); if (!match) return null;
  const subject = match[1].trim().replace(/[?.!]+$/, "");
  if (!subject || subject.length > 90 || /^(?:ftn|ibis|ftn ibis|trinidad(?: and tobago)?|tobago|the caribbean|caribbean)$/i.test(subject)) return null;
  const words = subject.split(/\s+/).filter(Boolean); if (words.length < 1 || words.length > 5) return null;
  return words.every((word) => /^[A-ZÀ-ÖØ-Þ][A-Za-zÀ-ÖØ-öø-ÿ'’-]*$/.test(word)) ? subject : null;
}
function leaksInternalFramework(answer: string) {
  const labels = ["User Value", "Ecosystem Value", "Ownership", "Data Value", "Economic Value", "Execution Cost", "Future Optionality", "Challenge Weak Ideas", "Reversible Experiments", "Shared FTN Infrastructure", "Second-Order Effects"];
  return labels.reduce((count, label) => count + (new RegExp("(?:^|\\n)\\s*(?:\\*\\*)?" + label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "(?:\\*\\*)?\\s*:", "i").test(String(answer || "")) ? 1 : 0), 0) >= 2;
}

function compactCebos(state: CebosReasoningState) {
  return { version: state.version, requestClass: state.requestClass, caribbeanRelevant: state.caribbeanRelevant, evidence: evidenceSummary(state), nextBottleneck: chooseNextBottleneck(state), sourcePlan: researchSourcePlan(state).slice(0, 6) };
}

export function deterministicAnswer(text: string, products: IbisProduct[] = [], options: { hasExternalEvidence?: boolean } = {}) {
  const q = normalized(text), math = arithmetic(text);
  if (math) return { answer: math, answerClass: "CALCULATION", evidenceState: "DETERMINISTIC" };
  if (/^(hello|hi|hey|good morning|good afternoon|good evening)( ibis)?$/.test(q)) return { answer: "Good day. I’m ibis. What would you like to understand or make happen?", answerClass: "CONVERSATION", evidenceState: "DETERMINISTIC" };
  if (/^(who|what) (are|is) (ftn )?ibis$|^tell me about (ftn )?ibis$/.test(q)) return { answer: "FTN ibis is Caribbean-first intelligence infrastructure. It connects questions with FTN data, evidence, opportunities and governed AI capabilities.", answerClass: "PRODUCT_IDENTITY", evidenceState: "DETERMINISTIC" };
  const person = personLookupSubject(text);
  if (person && !options.hasExternalEvidence) return { answer: `I need a source-backed web lookup before I can reliably tell you about ${person}. I will not invent a biography, profession or credits from model memory.`, answerClass: "RESEARCH_REQUIRED", evidenceState: "NO_VERIFIED_PERSON_EVIDENCE", researchRequired: true, researchSubject: person };
  const product = products.find((item) => { const name = normalized(item.name || ""); return name.length > 3 && q.includes(name) && /what|which|where|open|find|does|about/.test(q); });
  if (product) return { answer: `${product.name} is available at ${product.route}.${product.tagline ? " " + product.tagline : ""}`, answerClass: "FTN_REGISTRY", evidenceState: "FTN_OWNED_DATA" };
  return null;
}

type FounderReasoningDomain = "BUSINESS" | "FUNDING" | "MEDIA" | "CIVIC" | "DELIVERY" | "GENERAL";
function founderDomain(q: string): FounderReasoningDomain {
  if (/fund|grant|invest|capital|pitch|sponsor|revenue|moneti[sz]|finance/.test(q)) return "FUNDING";
  if (/video|film|music|audio|image|poster|story|screen|creator|media|campaign/.test(q)) return "MEDIA";
  if (/government|public|civic|community|policy|parliament|citizen|institution/.test(q)) return "CIVIC";
  if (/deploy|launch|ship|build|implement|fix|test|release|submit|integrat/.test(q)) return "DELIVERY";
  if (/business|customer|market|product|platform|startup|company|sell|partner/.test(q)) return "BUSINESS";
  return "GENERAL";
}
function relevantProducts(text: string, domain: FounderReasoningDomain, products: IbisProduct[]) {
  const terms = normalized(text).split(" ").filter((term) => term.length > 3);
  const domainTerms: Record<FounderReasoningDomain, string[]> = { FUNDING: ["opportunit", "grant", "fund", "invest"], BUSINESS: ["business", "market", "commerce", "enterprise"], MEDIA: ["media", "screen", "riddim", "studio", "video", "music"], CIVIC: ["civic", "public", "community", "parliament", "govern"], DELIVERY: ["ibis", "build", "workspace", "deploy"], GENERAL: ["ibis"] };
  return products.map((product) => { const haystack = normalized(`${product.name} ${product.tagline || ""}`); const direct = terms.reduce((total, term) => total + (haystack.includes(term) ? 1 : 0), 0); const domainMatch = domainTerms[domain].some((term) => haystack.includes(term)) ? 1 : 0; return { product, score: direct + domainMatch }; }).filter((row) => row.score > 0).sort((a, b) => b.score - a.score).slice(0, 3).map((row) => row.product);
}

export function founderReasoningAnswer(text: string, products: IbisProduct[] = []) {
  const q = normalized(text); if (q.length < 4) return null; const domain = founderDomain(q); if (domain === "GENERAL") return null; const matched = relevantProducts(text, domain, products);
  const guidance: Record<Exclude<FounderReasoningDomain, "GENERAL">, { decision: string; objective: string; path: string; risks: string; actions: string[] }> = {
    FUNDING: { decision: "PREPARE NOW", objective: "Turn the request into an investable, evidence-backed proposition rather than a broad funding appeal.", path: "Choose one buyer or beneficiary, one urgent problem, one measurable outcome, and the smallest funded milestone that proves demand while preserving ownership.", risks: "Unverified market size, unclear use of funds, dependence on one sponsor, and giving away strategic control before evidence exists.", actions: ["Write a one-sentence problem, customer and paid outcome.", "Define a 90-day milestone, budget and proof metric.", "Build a target list split into grants, customers and aligned investors; tailor the ask to each."] },
    BUSINESS: { decision: "BUILD NOW", objective: "Convert the idea into a testable offer that creates user value and a defensible Caribbean advantage.", path: "Narrow the first customer and job-to-be-done, reuse shared FTN infrastructure, and test willingness to adopt or pay before expanding scope.", risks: "Building for everyone, confusing activity with demand, duplicating infrastructure, and collecting data without a clear trust or ownership policy.", actions: ["Name the first customer and the painful task they already try to solve.", "Define one end-to-end workflow and its success metric.", "Run a reversible pilot with five real users and record adoption, failure points and payment evidence."] },
    MEDIA: { decision: "BUILD NOW", objective: "Produce one rights-safe media asset that serves a specific audience and distribution goal.", path: "Lock the brief, rights, format and channel first; generate components through eligible providers; then perform human editorial and cultural review before release.", risks: "Unclear source rights, inconsistent characters or branding, provider lock-in, weak Caribbean specificity, and publishing output without review.", actions: ["Write the audience, message, duration, format and call to action.", "List every required asset and confirm ownership or licence for each input.", "Create a short proof, review it for quality and cultural fit, then scale only the approved approach."] },
    CIVIC: { decision: "PREPARE NOW", objective: "Frame the public-interest outcome, accountable owner and evidence standard before proposing technology.", path: "Start with the affected community, document the decision or service gap, use primary public evidence, and design consent, redress and governance into the pilot.", risks: "Speaking for communities without validation, weak source provenance, privacy harm, inaccessible delivery and no accountable institution.", actions: ["State the public outcome and who is accountable for it.", "Gather primary evidence and identify whose perspective is missing.", "Design a small consent-based pilot with an appeal or correction path and publish its measures."] },
    DELIVERY: { decision: "BUILD NOW", objective: "Get one complete user journey working in production with observable evidence, then expand.", path: "Define the acceptance test, repair the narrowest end-to-end path, verify it from the public surface, and keep optional providers behind governed fallbacks.", risks: "Counting registry entries as working integrations, testing only mocks, hidden authentication blockers and failure states that reach users as raw errors.", actions: ["Write the exact user action and visible successful result.", "Test every boundary in that path with real production configuration.", "Deploy, run the public acceptance test, and record provider, fallback and failure provenance."] },
  };
  const selected = guidance[domain as Exclude<FounderReasoningDomain, "GENERAL">];
  const routes = matched.length ? `\n\nRelevant FTN routes\n${matched.map((p) => `- ${p.name}: ${p.route}${p.tagline ? ` — ${p.tagline}` : ""}`).join("\n")}` : "";
  return { answer: `Decision: ${selected.decision}\n\nReal objective\n${selected.objective}\n\nStrongest path\n${selected.path}\n\nRisks to control\n${selected.risks}\n\nNext actions\n${selected.actions.map((action, index) => `${index + 1}. ${action}`).join("\n")}${routes}`, answerClass: "FOUNDER_REASONING_FALLBACK", evidenceState: "DETERMINISTIC_REASONING" };
}

function circuitAllows(id: string, now: number) { const circuit = circuits.get(id); return !circuit || circuit.openUntil <= now; }
function recordSuccess(id: string) { circuits.delete(id); }
function recordFailure(id: string, now: number) { const previous = circuits.get(id) || { failures: 0, openUntil: 0 }, failures = previous.failures + 1; circuits.set(id, { failures, openUntil: failures >= FAILURE_THRESHOLD ? now + CIRCUIT_COOLDOWN_MS : 0 }); }
function publicFailureCode(error: unknown) { const message = error instanceof Error ? error.message : "PROVIDER_ERROR"; if (/^HTTP_[1-5][0-9]{2}$/.test(message) || message === "EMPTY_ANSWER" || message === "POLICY_OUTPUT") return message; if (error instanceof DOMException && error.name === "TimeoutError") return "TIMEOUT"; return "PROVIDER_ERROR"; }
export function gatewayHealth(providers: GatewayProvider[]) { const now = Date.now(); return { gateway: "ready", version: GATEWAY_VERSION, cebos: true, deterministic: true, configuredProviders: providers.filter((p) => p.configured).length, availableProviders: providers.filter((p) => p.configured && circuitAllows(p.id, now)).length, providers: providers.map((p) => ({ id: p.id, label: p.label, configured: p.configured, available: p.configured && circuitAllows(p.id, now), model: p.model || null })), generatedAt: new Date(now).toISOString() }; }

export async function runGateway(input: { text: string; products?: IbisProduct[]; providers: GatewayProvider[]; requestId?: string; evidence?: CebosEvidence[]; locationContext?: string | null }) {
  const startedAt = Date.now(), requestId = input.requestId || crypto.randomUUID();
  const state = createReasoningState({ request: input.text, locationContext: input.locationContext || null });
  for (const item of input.evidence || []) addEvidence(state, item);
  const local = deterministicAnswer(input.text, input.products || [], { hasExternalEvidence: state.evidence.length > 0 });
  if (local) { chooseNextBottleneck(state); return { ...local, provider: "FTN ibis deterministic", model: "ibis-rules-v2-cebos", generatedAt: new Date().toISOString(), requestId, fallbackUsed: false, fallbackState: "NOT_NEEDED", confidence: local.evidenceState === "NO_VERIFIED_PERSON_EVIDENCE" ? "UNAVAILABLE" : "HIGH", uncertainty: local.evidenceState === "NO_VERIFIED_PERSON_EVIDENCE" ? "A web-research route is required before factual claims about this person." : null, cebos: compactCebos(state), gatewayVersion: GATEWAY_VERSION }; }
  let attempted = 0; const providerFailures: Array<{ provider: string; code: string }> = [];
  for (const provider of input.providers) {
    const now = Date.now(); if (!provider.configured || !circuitAllows(provider.id, now)) continue; const remaining = TOTAL_BUDGET_MS - (now - startedAt); if (remaining <= 500) break; attempted += 1;
    try {
      const result = await provider.run(Math.min(PROVIDER_BUDGET_MS, remaining)); if (!result?.answer?.trim()) throw new Error("EMPTY_ANSWER"); if (leaksInternalFramework(result.answer)) throw new Error("POLICY_OUTPUT"); recordSuccess(provider.id); chooseNextBottleneck(state);
      return { answer: result.answer.trim(), provider: provider.label, model: result.model, answerClass: "MODEL_RESPONSE", evidenceState: state.evidence.length ? "EVIDENCE_AWARE_MODEL_RESPONSE" : "MODEL_GENERATED", generatedAt: new Date().toISOString(), requestId, fallbackUsed: attempted > 1, fallbackState: attempted > 1 ? "SUCCEEDED" : "NOT_NEEDED", confidence: state.evidence.length ? evidenceSummary(state).strongestAuthority >= 75 ? "MODERATE" : "LOW" : "UNVERIFIED", uncertainty: state.evidence.length ? "Answer used supplied evidence; consequential claims still require source-specific verification." : "Model-generated answer; verify consequential claims against cited primary evidence.", cebos: compactCebos(state), gatewayVersion: GATEWAY_VERSION };
    } catch (error) { recordFailure(provider.id, Date.now()); const code = publicFailureCode(error); providerFailures.push({ provider: provider.id, code }); console.error("ibis provider failed", provider.id, code); }
  }
  const owned = founderReasoningAnswer(input.text, input.products || []);
  if (owned) { chooseNextBottleneck(state); return { ...owned, provider: "FTN ibis Founder Reasoning Engine", model: "ibis-founder-rules-v1", generatedAt: new Date().toISOString(), requestId, fallbackUsed: attempted > 0, fallbackState: attempted > 0 ? "SUCCEEDED" : "OWNED_FALLBACK", confidence: "MODERATE", uncertainty: "Planning guidance derived from the request and FTN-owned product metadata; validate current facts and consequential decisions with primary evidence.", providerFailures, cebos: compactCebos(state), gatewayVersion: GATEWAY_VERSION }; }
  chooseNextBottleneck(state);
  return { answer: "ibis could not reach a grounded answer provider just now. It will not substitute a planning template or invented facts for the answer.", provider: "FTN ibis gateway", model: "none", answerClass: "DEGRADED", evidenceState: "NO_ANSWER_GENERATED", generatedAt: new Date().toISOString(), requestId, fallbackUsed: attempted > 1, fallbackState: "EXHAUSTED", confidence: "UNAVAILABLE", uncertainty: "No provider produced a policy-compliant answer.", providerFailures, cebos: compactCebos(state), gatewayVersion: GATEWAY_VERSION };
}