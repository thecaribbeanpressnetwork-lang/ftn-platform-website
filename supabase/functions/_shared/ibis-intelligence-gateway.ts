export type IbisTurn = { role: "user" | "assistant"; content: string };
export type IbisProduct = { name: string; route: string; tagline?: string };
export type ProviderResult = { answer: string; model: string };
export type GatewayProvider = {
  id: string;
  label: string;
  model?: string;
  configured: boolean;
  run: (timeoutMs: number) => Promise<ProviderResult>;
};

type Circuit = { failures: number; openUntil: number };
const circuits = new Map<string, Circuit>();
const FAILURE_THRESHOLD = 2;
const CIRCUIT_COOLDOWN_MS = 30_000;
const TOTAL_BUDGET_MS = 24_000;
const PROVIDER_BUDGET_MS = 9_000;
export const GATEWAY_VERSION = "ibis-gateway-2026-09-09.2";

function normalized(text: string) {
  return text.toLowerCase().replace(/[?.!,]/g, " ").replace(/\s+/g, " ").trim();
}

function arithmetic(text: string): string | null {
  const clean = normalized(text)
    .replace(/^(what is|calculate|compute)\s+/, "")
    .replace(/\bplus\b/g, "+").replace(/\bminus\b/g, "-")
    .replace(/\b(times|multiplied by)\b/g, "*").replace(/\b(divided by|over)\b/g, "/");
  const match = clean.match(/^(-?\d+(?:\.\d+)?)\s*([+*/-])\s*(-?\d+(?:\.\d+)?)$/);
  if (!match) return null;
  const left = Number(match[1]), right = Number(match[3]);
  if (match[2] === "/" && right === 0) return "Division by zero is undefined.";
  const value = match[2] === "+" ? left + right : match[2] === "-" ? left - right : match[2] === "*" ? left * right : left / right;
  return `${match[1]} ${match[2]} ${match[3]} = ${Number.isInteger(value) ? value : Number(value.toFixed(10))}.`;
}

export function deterministicAnswer(text: string, products: IbisProduct[] = []) {
  const q = normalized(text), math = arithmetic(text);
  if (math) return { answer: math, answerClass: "CALCULATION", evidenceState: "DETERMINISTIC" };
  if (/^(hello|hi|hey|good morning|good afternoon|good evening)( ibis)?$/.test(q)) return { answer: "Good day. I’m ibis. What would you like to understand or make happen?", answerClass: "CONVERSATION", evidenceState: "DETERMINISTIC" };
  if (/^(who|what) (are|is) (ftn )?ibis$|^tell me about (ftn )?ibis$/.test(q)) return { answer: "FTN ibis is Caribbean-first intelligence infrastructure. It connects questions with FTN data, evidence, opportunities and governed AI capabilities.", answerClass: "PRODUCT_IDENTITY", evidenceState: "DETERMINISTIC" };
  const product = products.find((item) => {
    const name = normalized(item.name || "");
    return name.length > 3 && q.includes(name) && /what|which|where|open|find|does|about/.test(q);
  });
  if (product) return { answer: `${product.name} is available at ${product.route}.${product.tagline ? " " + product.tagline : ""}`, answerClass: "FTN_REGISTRY", evidenceState: "FTN_OWNED_DATA" };
  return null;
}

function circuitAllows(id: string, now: number) { const circuit = circuits.get(id); return !circuit || circuit.openUntil <= now; }
function recordSuccess(id: string) { circuits.delete(id); }
function recordFailure(id: string, now: number) {
  const previous = circuits.get(id) || { failures: 0, openUntil: 0 }, failures = previous.failures + 1;
  circuits.set(id, { failures, openUntil: failures >= FAILURE_THRESHOLD ? now + CIRCUIT_COOLDOWN_MS : 0 });
}

export function gatewayHealth(providers: GatewayProvider[]) {
  const now = Date.now();
  return {
    gateway: "ready",
    version: GATEWAY_VERSION,
    deterministic: true,
    configuredProviders: providers.filter((p) => p.configured).length,
    availableProviders: providers.filter((p) => p.configured && circuitAllows(p.id, now)).length,
    providers: providers.map((p) => ({ id: p.id, label: p.label, configured: p.configured, available: p.configured && circuitAllows(p.id, now), model: p.model || null })),
    generatedAt: new Date(now).toISOString(),
  };
}

export async function runGateway(input: { text: string; products?: IbisProduct[]; providers: GatewayProvider[]; requestId?: string }) {
  const startedAt = Date.now(), requestId = input.requestId || crypto.randomUUID();
  const local = deterministicAnswer(input.text, input.products || []);
  if (local) return { ...local, provider: "FTN ibis deterministic", model: "ibis-rules-v1", generatedAt: new Date().toISOString(), requestId, fallbackUsed: false, fallbackState: "NOT_NEEDED", confidence: "HIGH", uncertainty: null, gatewayVersion: GATEWAY_VERSION };
  let attempted = 0;
  for (const provider of input.providers) {
    const now = Date.now();
    if (!provider.configured || !circuitAllows(provider.id, now)) continue;
    const remaining = TOTAL_BUDGET_MS - (now - startedAt);
    if (remaining <= 500) break;
    attempted += 1;
    try {
      const result = await provider.run(Math.min(PROVIDER_BUDGET_MS, remaining));
      if (!result?.answer?.trim()) throw new Error("EMPTY_ANSWER");
      recordSuccess(provider.id);
      return { answer: result.answer.trim(), provider: provider.label, model: result.model, answerClass: "MODEL_RESPONSE", evidenceState: "MODEL_GENERATED", generatedAt: new Date().toISOString(), requestId, fallbackUsed: attempted > 1, fallbackState: attempted > 1 ? "SUCCEEDED" : "NOT_NEEDED", confidence: "UNVERIFIED", uncertainty: "Model-generated answer; verify consequential claims against cited primary evidence.", gatewayVersion: GATEWAY_VERSION };
    } catch (error) {
      recordFailure(provider.id, Date.now());
      console.error("ibis provider failed", provider.id, error instanceof Error ? error.message : "UNKNOWN_ERROR");
    }
  }
  return { answer: "ibis could not reach an answer provider just now. Your question was preserved; please retry shortly.", provider: "FTN ibis gateway", model: "none", answerClass: "DEGRADED", evidenceState: "NO_ANSWER_GENERATED", generatedAt: new Date().toISOString(), requestId, fallbackUsed: attempted > 1, fallbackState: "EXHAUSTED", confidence: "UNAVAILABLE", uncertainty: "No provider produced an answer.", gatewayVersion: GATEWAY_VERSION };
}
