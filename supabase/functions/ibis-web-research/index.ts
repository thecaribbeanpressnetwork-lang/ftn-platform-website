import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {
  addEvidence,
  createReasoningState,
  evidenceSummary,
  providerReasoningDirective,
  researchSourcePlan,
  sourceScores,
  type CebosEvidenceStatus,
  type CebosSourceClass,
} from "../_shared/ibis-cebos.ts";
import { scanOpportunitySignals } from "../_shared/ibis-opportunity-scanner.ts";

const ALLOWED = new Set([
  "https://ftnplatform.org",
  "https://www.ftnplatform.org",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
]);

const SEARCH_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/152 Safari/537.36";

type SearchResult = { title: string; url: string; snippet: string; text?: string };

function originAllowed(value: string | null) {
  if (!value) return true;
  if (ALLOWED.has(value)) return true;
  try {
    const u = new URL(value);
    return u.protocol === "https:" && /^(?:[a-z0-9-]+\.)?ftn-platform-website\.pages\.dev$/i.test(u.hostname);
  } catch {
    return false;
  }
}

function cors(origin: string | null) {
  return {
    "access-control-allow-origin": origin && originAllowed(origin) ? origin : "https://ftnplatform.org",
    "access-control-allow-methods": "POST,OPTIONS",
    "access-control-allow-headers": "apikey,authorization,content-type",
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    vary: "Origin",
  };
}

function reply(origin: string | null, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: cors(origin) });
}

function validKey(req: Request) {
  const supplied = req.headers.get("apikey") || "";
  try {
    return !!supplied && Object.values(JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") || "{}")).includes(supplied);
  } catch {
    return false;
  }
}

function decodeHtml(s: string) {
  return String(s || "")
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanAnswer(s: string) {
  return String(s || "")
    .split(/\n+/)
    .map((x) => x.trim())
    .filter(Boolean)
    .map((line) =>
      line.replace(
        /^(?:CLASS|EVIDENCE BOUNDARY|USEFUL CONCLUSION|WHAT COULD CHANGE IT|NEXT ACTION|CONSEQUENCES FOR MONEY, RISK, TIME, CONTROL, OWNERSHIP, DATA, FEASIBILITY, AND OPTIONALITY)\s*:\s*/i,
        "",
      )
    )
    .filter((line) => line && !/^Request class\s*:/i.test(line))
    .join("\n\n")
    .trim();
}

function normalizedSubject(q: string) {
  let s = String(q || "").trim().replace(/[?!.,]+$/g, "");
  const wrappers = [
    /^(?:please\s+)?tell me about\s+/i,
    /^(?:please\s+)?who (?:is|was)\s+/i,
    /^(?:please\s+)?what do you know about\s+/i,
    /^(?:please\s+)?give me (?:information|info) (?:about|on)\s+/i,
    /^(?:please\s+)?look up\s+/i,
    /^(?:please\s+)?search (?:the )?web for\s+/i,
    /^(?:please\s+)?google\s+/i,
    /^(?:please\s+)?research\s+/i,
  ];
  for (const p of wrappers) s = s.replace(p, "");
  return s.trim() || q.trim();
}

function looksLikePersonSubject(subject: string) {
  return /^[\p{L}'’-]+(?:\s+[\p{L}'’-]+){1,5}$/u.test(subject) &&
    !/\b(news|weather|price|rate|law|election|today|latest|current)\b/i.test(subject);
}

function searchQueries(q: string) {
  const subject = normalizedSubject(q);
  if (looksLikePersonSubject(subject)) {
    return [`"${subject}"`, `"${subject}" Trinidad Tobago`, `"${subject}" Caribbean`];
  }
  const news = /\b(news|today|latest|current|right now|recent)\b/i.test(q);
  return Array.from(
    new Set([
      subject,
      news ? subject.replace(/^(?:what(?:'s| is)?|tell me|show me)\s+/i, "") : subject,
      q,
    ]),
  ).filter(Boolean).slice(0, 3);
}

function requiredTerms(q: string) {
  const subject = normalizedSubject(q);
  if (!looksLikePersonSubject(subject)) return [] as string[];
  return subject.toLowerCase().split(/\s+/).filter((w) => w.length > 1);
}

function relevantResult(x: SearchResult, terms: string[]) {
  if (!terms.length) return true;
  const hay = `${x.title} ${x.snippet} ${x.text || ""}`.toLowerCase();
  return terms.every((t) => hay.includes(t));
}

function sourceClassFor(uri: string, title: string): CebosSourceClass {
  let host = "";
  try { host = new URL(uri).hostname.toLowerCase(); } catch {}
  const text = `${host} ${title}`.toLowerCase();
  if (/\.gov\.|\.gov$|gov\.tt$|ttparliament\.org|caricom\.org|caribank\.org/.test(host)) return "OFFICIAL_GOVERNMENT";
  if (/court|judiciary|legislation|gazette|laws?\b/.test(text)) return "LEGISLATION_PUBLIC_RECORD";
  if (/\.edu\.|\.ac\.|university|journal|doi\.org/.test(text)) return "ACADEMIC";
  if (/newsday|guardian\.co\.tt|trinidadexpress|loopnews|reuters|apnews|bbc|cnn|nytimes|washingtonpost|jamaicaobserver|jamaica-gleaner|film festival|ttfilmfestival|wevibes/.test(text)) return "REPUTABLE_JOURNALISM";
  if (/imdb\.com|filmfreeway|rottentomatoes|linkedin|company|official|linktr\.ee/.test(text)) return "CORPORATE_STATEMENT";
  if (/facebook|instagram|x\.com|twitter|tiktok|youtube/.test(host)) return "CREATOR_SOCIAL";
  if (/reddit|forum|community/.test(text)) return "COMMUNITY_DISCUSSION";
  return "UNKNOWN";
}

function evidenceStatusFor(sourceClass: CebosSourceClass): CebosEvidenceStatus {
  if (["OFFICIAL_GOVERNMENT", "LEGISLATION_PUBLIC_RECORD", "PRIMARY_EVIDENCE"].includes(sourceClass)) return "VERIFIED";
  if (["ACADEMIC", "REPUTABLE_JOURNALISM"].includes(sourceClass)) return "CORROBORATED";
  if (sourceClass === "CORPORATE_STATEMENT") return "WORKING_INFERENCE";
  return "SPECULATIVE_LEAD";
}

function decodeBingTarget(raw: string) {
  try {
    const u = new URL(raw, "https://www.bing.com");
    const encoded = u.searchParams.get("u");
    if (!encoded) return u.href;
    if (/^a1/i.test(encoded)) {
      let b64 = encoded.slice(2).replace(/-/g, "+").replace(/_/g, "/");
      while (b64.length % 4) b64 += "=";
      const decoded = atob(b64);
      if (/^https?:\/\//i.test(decoded)) return decoded;
    }
    return u.href;
  } catch {
    return raw;
  }
}

function resolveDdg(raw: string) {
  try {
    const u = new URL(raw.startsWith("//") ? `https:${raw}` : raw, "https://html.duckduckgo.com");
    const target = u.searchParams.get("uddg");
    return target ? decodeURIComponent(target) : u.href;
  } catch {
    return raw;
  }
}

async function bingSearch(query: string): Promise<SearchResult[]> {
  try {
    const r = await fetch(`https://www.bing.com/search?q=${encodeURIComponent(query)}&count=12`, {
      headers: { "user-agent": SEARCH_UA, accept: "text/html,application/xhtml+xml" },
      signal: AbortSignal.timeout(12000),
    });
    if (!r.ok) return [];
    const html = await r.text();
    const blocks = html.match(/<li[^>]+class=["'][^"']*\bb_algo\b[^"']*["'][^>]*>[\s\S]*?<\/li>/gi) || [];
    const out: SearchResult[] = [];
    for (const block of blocks.slice(0, 12)) {
      const a = block.match(/<h2[^>]*>[\s\S]*?<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>[\s\S]*?<\/h2>/i);
      if (!a) continue;
      const p = block.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
      const url = decodeBingTarget(decodeHtml(a[1]));
      if (!/^https?:\/\//i.test(url)) continue;
      out.push({ title: decodeHtml(a[2]), url, snippet: decodeHtml(p?.[1] || "") });
    }
    return out;
  } catch {
    return [];
  }
}

async function searxSearch(query: string): Promise<SearchResult[]> {
  try {
    const base = "https://search.inetol.net";
    const r = await fetch(`${base}/search?q=${encodeURIComponent(query)}`, {
      headers: { "user-agent": SEARCH_UA, accept: "text/html" },
      signal: AbortSignal.timeout(12000),
    });
    if (!r.ok) return [];
    const html = await r.text();
    const articles = html.match(/<article\b[\s\S]*?<\/article>/gi) || [];
    const out: SearchResult[] = [];
    for (const article of articles.slice(0, 12)) {
      const a = article.match(/<h3[^>]*>[\s\S]*?<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>[\s\S]*?<\/h3>/i);
      if (!a) continue;
      let url = decodeHtml(a[1]);
      try { url = new URL(url, base).href; } catch {}
      if (!/^https?:\/\//i.test(url) || url.startsWith(base)) continue;
      const p = article.match(/<p[^>]+class=["'][^"']*(?:content|result-content)[^"']*["'][^>]*>([\s\S]*?)<\/p>/i) || article.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
      out.push({ title: decodeHtml(a[2]), url, snippet: decodeHtml(p?.[1] || "") });
    }
    return out;
  } catch {
    return [];
  }
}

async function ddgSearch(query: string): Promise<SearchResult[]> {
  try {
    const r = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`, {
      headers: { "user-agent": SEARCH_UA, accept: "text/html" },
      signal: AbortSignal.timeout(12000),
    });
    if (!r.ok) return [];
    const html = await r.text();
    const blocks = html.match(/<div[^>]+class="[^"]*result[^"]*results_links[^"]*"[\s\S]*?(?=<div[^>]+class="[^"]*result[^"]*results_links|<div id="links"|$)/gi) || [];
    const out: SearchResult[] = [];
    for (const block of blocks.slice(0, 10)) {
      const a = block.match(/<a[^>]+class="[^"]*result__a[^"]*"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i);
      if (!a) continue;
      const sn = block.match(/class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/a>/i) || block.match(/class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
      const target = resolveDdg(decodeHtml(a[1]));
      if (/^https?:\/\//i.test(target)) out.push({ title: decodeHtml(a[2]), url: target, snippet: decodeHtml(sn?.[1] || "") });
    }
    return out;
  } catch {
    return [];
  }
}

async function pageText(url: string) {
  try {
    const r = await fetch(url, {
      headers: { "user-agent": "Mozilla/5.0 (compatible; FTN-IBIS-Research/1.0)" },
      redirect: "follow",
      signal: AbortSignal.timeout(6500),
    });
    if (!r.ok) return "";
    const type = r.headers.get("content-type") || "";
    if (!/text\/(html|plain)/i.test(type)) return "";
    const html = (await r.text()).slice(0, 220000);
    return decodeHtml(html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ")).slice(0, 4500);
  } catch {
    return "";
  }
}

function dedupe(items: SearchResult[]) {
  const seen = new Set<string>();
  const out: SearchResult[] = [];
  for (const item of items) {
    let key = item.url;
    try {
      const u = new URL(item.url);
      u.hash = "";
      key = `${u.hostname}${u.pathname}`.toLowerCase();
    } catch {}
    if (!item.title || !item.url || seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

function evidencePacket(items: SearchResult[]) {
  return items.slice(0, 8).map((x, i) => `[${i + 1}] ${x.title}\nURL: ${x.url}\n${x.snippet}${x.text ? `\nPage text: ${x.text}` : ""}`).join("\n\n");
}

async function synthesizeGemini(key: string, model: string, query: string, directive: string, items: SearchResult[]) {
  if (!key) return "";
  try {
    const prompt = `${directive}\nWrite a natural research answer in the style of a strong search assistant: answer the user's actual question first, then give the most useful supporting context. Use only the evidence packet. Cite [1], [2], etc. Do not expose internal labels, CEBOS, EBR, chain-of-thought, or generic money/risk/control checklists. Never invent unsupported facts.\n\nQUESTION: ${query}\n\nEVIDENCE:\n${evidencePacket(items)}`;
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: { temperature: 0.15, maxOutputTokens: 1800 } }),
      signal: AbortSignal.timeout(30000),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) return "";
    return cleanAnswer((data?.candidates?.[0]?.content?.parts || []).map((p: any) => p?.text || "").join(""));
  } catch {
    return "";
  }
}

async function synthesizeCloudflare(query: string, directive: string, items: SearchResult[]) {
  try {
    const account = Deno.env.get("CLOUDFLARE_ACCOUNT_ID") || "";
    const token = Deno.env.get("CLOUDFLARE_API_TOKEN") || "";
    const model = "@cf/meta/llama-3.1-8b-instruct";
    if (!account || !token) return "";
    const prompt = `${directive}\nWrite a natural evidence-backed answer. Direct answer first, then useful context. Cite [1], [2], etc. Use only the evidence packet. Do not expose internal labels, CEBOS, EBR, chain-of-thought, or generic framework/checklist headings. Never invent unsupported facts.\n\nQUESTION: ${query}\n\nEVIDENCE:\n${evidencePacket(items)}`;
    const r = await fetch(`https://api.cloudflare.com/client/v4/accounts/${account}/ai/run/${model}`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify({ messages: [{ role: "user", content: prompt }], temperature: 0.15 }),
      signal: AbortSignal.timeout(22000),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok || data?.success === false) return "";
    return cleanAnswer(typeof data?.result?.response === "string" ? data.result.response : "");
  } catch {
    return "";
  }
}

async function tryGoogleGrounding(key: string, model: string, query: string, directive: string) {
  const empty = { answer: "", sources: [] as SearchResult[], status: null as number | null, code: null as string | null };
  if (!key) return empty;
  try {
    const system = [
      directive,
      "Search the broad public web for the actual subject of the question, not conversational wrapper words.",
      "For Caribbean subjects, include local media, official records, directories, social traces and specialist databases where relevant.",
      "Return a natural answer with grounded source evidence. Never expose internal CEBOS/EBR labels.",
    ].join(" ");
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts: [{ text: query }] }],
        tools: [{ google_search: {} }],
        generationConfig: { temperature: 0.15, maxOutputTokens: 1800 },
      }),
      signal: AbortSignal.timeout(30000),
    });
    const data = await r.json().catch(() => ({}));
    const status = r.status;
    const code = data?.error?.status || null;
    if (!r.ok) return { ...empty, status, code };
    const c = data?.candidates?.[0] || {};
    const answer = cleanAnswer((c?.content?.parts || []).map((p: any) => p?.text || "").join(""));
    const chunks = Array.isArray(c?.groundingMetadata?.groundingChunks) ? c.groundingMetadata.groundingChunks : [];
    const sources: SearchResult[] = [];
    for (const chunk of chunks) {
      const web = chunk?.web;
      const url = typeof web?.uri === "string" ? web.uri : "";
      const title = typeof web?.title === "string" ? web.title : url;
      if (url) sources.push({ title, url, snippet: "" });
    }
    return { answer, sources: dedupe(sources), status, code };
  } catch {
    return empty;
  }
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
  const geminiKey = Deno.env.get("GEMINI_API_KEY") || "";
  const geminiModel = Deno.env.get("IBIS_WEB_RESEARCH_MODEL") || Deno.env.get("GEMINI_MODEL") || "gemini-2.5-flash";
  const cloudflareConfigured = !!(Deno.env.get("CLOUDFLARE_ACCOUNT_ID") && Deno.env.get("CLOUDFLARE_API_TOKEN"));

  if (payload.action === "health") {
    return reply(origin, {
      capability: "WEB_RESEARCH",
      provider: "Google Search grounding + Bing HTML + SearXNG + DuckDuckGo + Gemini/Cloudflare synthesis",
      model: geminiModel,
      configured: !!(geminiKey || cloudflareConfigured),
      ready: !!(geminiKey || cloudflareConfigured),
      cebos: true,
      opportunityScanner: true,
      inferenceAttempted: false,
      checkedAt: new Date().toISOString(),
    });
  }

  if (!query) return reply(origin, { error: "query required" }, 400);
  if (!geminiKey && !cloudflareConfigured) return reply(origin, { error: "No web-research reasoning provider is configured." }, 503);

  const state = createReasoningState({ request: query, locationContext });
  scanOpportunitySignals(state);
  const directive = providerReasoningDirective(state);
  const queries = searchQueries(query);
  const terms = requiredTerms(query);

  let providerStatus: number | null = null;
  let providerCode: string | null = null;
  let answer = "";
  let provider = "";
  let raw: SearchResult[] = [];

  const grounded = await tryGoogleGrounding(geminiKey, geminiModel, query, directive);
  providerStatus = grounded.status;
  providerCode = grounded.code;
  if (grounded.answer && grounded.sources.length) {
    answer = grounded.answer;
    raw = grounded.sources;
    provider = "Google Search grounding via Gemini";
  }

  if (!answer || !raw.length) {
    for (const q of queries) {
      const [bing, searx, ddg] = await Promise.all([bingSearch(q), searxSearch(q), ddgSearch(q)]);
      raw.push(...bing, ...searx, ...ddg);
      raw = dedupe(raw);
      if (terms.length && raw.filter((x) => relevantResult(x, terms)).length >= 4) break;
      if (!terms.length && raw.length >= 8) break;
    }

    let relevant = terms.length ? raw.filter((x) => relevantResult(x, terms)) : raw;
    relevant = dedupe(relevant).slice(0, 10);

    if (relevant.length) {
      const enriched = await Promise.all(
        relevant.slice(0, 7).map(async (x) => ({ ...x, text: await pageText(x.url) })),
      );
      raw = enriched;
      answer = await synthesizeGemini(geminiKey, geminiModel, query, directive, enriched);
      if (!answer) answer = await synthesizeCloudflare(query, directive, enriched);
      provider = "Bing/SearXNG/DuckDuckGo retrieval + evidence synthesis";
    }
  }

  const finalSources = dedupe(raw).filter((x) => relevantResult(x, terms)).slice(0, 10);
  for (let i = 0; i < finalSources.length; i++) {
    const x = finalSources[i];
    const sourceClass = sourceClassFor(x.url, x.title);
    const scores = sourceScores(sourceClass);
    addEvidence(state, {
      id: `web-${i}`,
      claim: x.title,
      status: evidenceStatusFor(sourceClass),
      sourceClass,
      sourceUrl: x.url,
      publisher: x.title,
      retrievedAt: new Date().toISOString(),
      discoveryUtility: scores.discoveryUtility,
      decisionAuthority: scores.decisionAuthority,
      geographicRelevance: state.caribbeanRelevant ? "Caribbean context requested or inferred" : null,
      contradictions: [],
    });
  }

  const compact = {
    version: state.version,
    requestClass: state.requestClass,
    caribbeanRelevant: state.caribbeanRelevant,
    sourcePlan: researchSourcePlan(state).slice(0, 6),
    evidence: evidenceSummary(state),
    opportunitySignals: state.opportunitySignals,
    searchQueries: queries,
  };

  const sources = state.evidence.map((e) => ({
    title: e.claim,
    url: e.sourceUrl,
    publisher: e.publisher,
    sourceClass: e.sourceClass,
    evidenceStatus: e.status,
    discoveryUtility: e.discoveryUtility,
    decisionAuthority: e.decisionAuthority,
  }));

  if (!answer || !sources.length) {
    return reply(origin, {
      error: "Web research completed without enough relevant evidence to answer.",
      providerStatus,
      providerCode,
      sources,
      cebos: compact,
    }, 424);
  }

  return reply(origin, {
    answer: cleanAnswer(answer),
    sources,
    provider,
    model: geminiModel,
    retrievedAt: new Date().toISOString(),
    providerStatus,
    providerCode,
    cebos: compact,
  });
});
