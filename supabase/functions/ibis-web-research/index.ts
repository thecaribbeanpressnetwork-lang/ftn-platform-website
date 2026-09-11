import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { addEvidence, createReasoningState, evidenceSummary, providerReasoningDirective, researchSourcePlan, sourceScores, type CebosEvidenceStatus, type CebosSourceClass } from "../_shared/ibis-cebos.ts";
import { scanOpportunitySignals } from "../_shared/ibis-opportunity-scanner.ts";

const ALLOWED = new Set(["https://ftnplatform.org", "https://www.ftnplatform.org", "http://localhost:3000", "http://127.0.0.1:3000"]);
function originAllowed(value: string | null) { if (!value) return true; if (ALLOWED.has(value)) return true; try { const u = new URL(value); return u.protocol === "https:" && /^(?:[a-z0-9-]+\.)?ftn-platform-website\.pages\.dev$/i.test(u.hostname); } catch { return false; } }
function cors(origin: string | null) { return { "access-control-allow-origin": origin && originAllowed(origin) ? origin : "https://ftnplatform.org", "access-control-allow-methods": "POST,OPTIONS", "access-control-allow-headers": "apikey,authorization,content-type", "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "vary": "Origin" }; }
function reply(origin: string | null, body: unknown, status = 200) { return new Response(JSON.stringify(body), { status, headers: cors(origin) }); }
function validKey(req: Request) { const supplied = req.headers.get("apikey") || ""; try { return !!supplied && Object.values(JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") || "{}")).includes(supplied); } catch { return false; } }
function sourceClassFor(uri: string, title: string): CebosSourceClass {
  let host = ""; try { host = new URL(uri).hostname.toLowerCase(); } catch {}
  const text = `${host} ${title}`.toLowerCase();
  if (/\.gov\.|\.gov$|gov\.tt$|ttparliament\.org|caricom\.org|caribank\.org/.test(host)) return "OFFICIAL_GOVERNMENT";
  if (/court|judiciary|legislation|gazette|laws?\b/.test(text)) return "LEGISLATION_PUBLIC_RECORD";
  if (/\.edu\.|\.ac\.|university|journal|doi\.org/.test(text)) return "ACADEMIC";
  if (/newsday|guardian\.co\.tt|trinidadexpress|loopnews|reuters|apnews|bbc|cnn|nytimes|washingtonpost|jamaicaobserver|jamaica-gleaner/.test(text)) return "REPUTABLE_JOURNALISM";
  if (/facebook|instagram|x\.com|twitter|tiktok|youtube/.test(host)) return "CREATOR_SOCIAL";
  if (/reddit|forum|community/.test(text)) return "COMMUNITY_DISCUSSION";
  if (/linkedin|company|official/.test(text)) return "CORPORATE_STATEMENT";
  return "UNKNOWN";
}
function evidenceStatusFor(sourceClass: CebosSourceClass): CebosEvidenceStatus {
  if (sourceClass === "OFFICIAL_GOVERNMENT" || sourceClass === "LEGISLATION_PUBLIC_RECORD" || sourceClass === "PRIMARY_EVIDENCE") return "VERIFIED";
  if (sourceClass === "ACADEMIC" || sourceClass === "REPUTABLE_JOURNALISM") return "CORROBORATED";
  if (sourceClass === "CORPORATE_STATEMENT") return "WORKING_INFERENCE";
  return "SPECULATIVE_LEAD";
}
Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  if (req.method === "OPTIONS") return new Response(null, { status: originAllowed(origin) ? 204 : 403, headers: cors(origin) });
  if (req.method !== "POST") return reply(origin, { error: "POST required" }, 405);
  if (!originAllowed(origin)) return reply(origin, { error: "Origin not allowed" }, 403);
  if (!validKey(req)) return reply(origin, { error: "Invalid FTN client key" }, 401);
  let payload: { query?: unknown; locationContext?: unknown; action?: unknown };
  try { payload = await req.json(); } catch { return reply(origin, { error: "Invalid request" }, 400); }
  const query = typeof payload.query === "string" ? payload.query.trim().slice(0, 2000) : "";
  const locationContext = typeof payload.locationContext === "string" ? payload.locationContext.trim().slice(0, 200) : null;
  const key = Deno.env.get("GEMINI_API_KEY") || "";
  const model = Deno.env.get("IBIS_WEB_RESEARCH_MODEL") || Deno.env.get("GEMINI_MODEL") || "gemini-2.5-flash";
  if (payload.action === "health") return reply(origin, { capability: "WEB_RESEARCH", provider: "Google Search grounding via Gemini", model, configured: !!key, ready: !!key, cebos: true, opportunityScanner: true, inferenceAttempted: false, checkedAt: new Date().toISOString() });
  if (!query) return reply(origin, { error: "query required" }, 400);
  if (!key) return reply(origin, { error: "No web-research provider is configured." }, 503);

  const state = createReasoningState({ request: query, locationContext });
  scanOpportunitySignals(state);
  const directive = providerReasoningDirective(state);
  const opportunityHint = state.opportunitySignals.length ? ` Low-priority economic-shadow signals from the user's own wording: ${state.opportunitySignals.map((s) => s.signal).join(" | ")}. Do not derail the current task; surface only if materially useful.` : "";
  const searchInstruction = [
    directive + opportunityHint,
    "You are the research worker, not the final authority. Search the broad public web using Google Search grounding.",
    "Work backward from the user's objective. Search for both confirming and contradicting evidence and expected traces when useful.",
    "For Caribbean subjects, do not stop at conventional databases: local newspapers, government pages/PDFs, registries, tourism/business directories, reviews, maps and public social traces can be valuable discovery leads. Do not treat lack of indexing as lack of activity.",
    "Prefer primary/official records for consequential claims. Use weaker sources to discover stronger evidence. Distinguish what a source directly supports from inference.",
    "Return a concise but complete answer useful to the user, with the important context, caveats and next step when one is clear. Do not expose chain-of-thought or internal CEBOS labels. Do not invent facts when search evidence is weak or contradictory."
  ].join(" ");
  try {
    const upstream = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: "POST", headers: { "content-type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({ systemInstruction: { parts: [{ text: searchInstruction }] }, contents: [{ role: "user", parts: [{ text: query }] }], tools: [{ google_search: {} }], generationConfig: { temperature: 0.15, maxOutputTokens: 1600 } }), signal: AbortSignal.timeout(30000),
    });
    const data = await upstream.json().catch(() => ({}));
    if (!upstream.ok) return reply(origin, { error: "Web research provider failed.", providerStatus: upstream.status, providerCode: data?.error?.status || null }, 502);
    const candidate = data?.candidates?.[0] || {};
    const answer = Array.isArray(candidate?.content?.parts) ? candidate.content.parts.map((p: any) => typeof p?.text === "string" ? p.text : "").join("").trim() : "";
    const chunks = Array.isArray(candidate?.groundingMetadata?.groundingChunks) ? candidate.groundingMetadata.groundingChunks : [];
    const seen = new Set<string>();
    for (let i = 0; i < chunks.length; i++) {
      const web = chunks[i]?.web; const uri = typeof web?.uri === "string" ? web.uri : ""; const title = typeof web?.title === "string" ? web.title : uri;
      if (!uri || seen.has(uri)) continue; seen.add(uri);
      const sourceClass = sourceClassFor(uri, title), scores = sourceScores(sourceClass);
      addEvidence(state, { id: `web-${i}`, claim: title || `Source discovered for ${query}`, status: evidenceStatusFor(sourceClass), sourceClass, sourceUrl: uri, publisher: title || null, retrievedAt: new Date().toISOString(), discoveryUtility: scores.discoveryUtility, decisionAuthority: scores.decisionAuthority, geographicRelevance: state.caribbeanRelevant ? "Caribbean context requested or inferred" : null, contradictions: [] });
    }
    const compact = { version: state.version, requestClass: state.requestClass, caribbeanRelevant: state.caribbeanRelevant, sourcePlan: researchSourcePlan(state).slice(0, 6), evidence: evidenceSummary(state), opportunitySignals: state.opportunitySignals };
    if (!answer || !state.evidence.length) return reply(origin, { error: "Search completed but did not return enough grounded evidence to answer reliably.", answer: answer || null, sources: [], cebos: compact }, 424);
    return reply(origin, { answer, sources: state.evidence.map((e) => ({ title: e.claim, url: e.sourceUrl, publisher: e.publisher, sourceClass: e.sourceClass, evidenceStatus: e.status, discoveryUtility: e.discoveryUtility, decisionAuthority: e.decisionAuthority })), provider: "Google Search grounding via Gemini", model, retrievedAt: new Date().toISOString(), cebos: compact });
  } catch (error) { console.error("ibis-web-research failed", error); return reply(origin, { error: "Web research is temporarily unavailable." }, 502); }
});
