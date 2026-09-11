import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { addEvidence, createReasoningState, evidenceSummary, providerReasoningDirective, researchSourcePlan, sourceScores, type CebosEvidenceStatus, type CebosSourceClass } from "../_shared/ibis-cebos.ts";
import { scanOpportunitySignals } from "../_shared/ibis-opportunity-scanner.ts";

const ALLOWED = new Set(["https://ftnplatform.org", "https://www.ftnplatform.org", "http://localhost:3000", "http://127.0.0.1:3000"]);
function originAllowed(value: string | null) { if (!value) return true; if (ALLOWED.has(value)) return true; try { const u = new URL(value); return u.protocol === "https:" && /^(?:[a-z0-9-]+\.)?ftn-platform-website\.pages\.dev$/i.test(u.hostname); } catch { return false; } }
function cors(origin: string | null) { return { "access-control-allow-origin": origin && originAllowed(origin) ? origin : "https://ftnplatform.org", "access-control-allow-methods": "POST,OPTIONS", "access-control-allow-headers": "apikey,authorization,content-type", "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "vary": "Origin" }; }
function reply(origin: string | null, body: unknown, status = 200) { return new Response(JSON.stringify(body), { status, headers: cors(origin) }); }
function validKey(req: Request) { const supplied = req.headers.get("apikey") || ""; try { return !!supplied && Object.values(JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") || "{}")).includes(supplied); } catch { return false; } }
function decodeHtml(s: string) { return s.replace(/&amp;/g,"&").replace(/&quot;/g,'"').replace(/&#x27;|&#39;/g,"'").replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim(); }
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
function resolveDdg(raw: string) { try { const u = new URL(raw.startsWith("//") ? `https:${raw}` : raw, "https://html.duckduckgo.com"); const target = u.searchParams.get("uddg"); return target ? decodeURIComponent(target) : u.href; } catch { return raw; } }
async function ddgSearch(query: string) {
  const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
  const r = await fetch(url,{headers:{"user-agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/152 Safari/537.36","accept":"text/html"},signal:AbortSignal.timeout(12000)});
  if(!r.ok) return [] as Array<{title:string;url:string;snippet:string}>;
  const html = await r.text();
  const blocks = html.match(/<div[^>]+class="[^"]*result[^"]*results_links[^"]*"[\s\S]*?(?=<div[^>]+class="[^"]*result[^"]*results_links|<div id="links"|$)/gi) || [];
  const out:Array<{title:string;url:string;snippet:string}>=[];
  for(const block of blocks.slice(0,10)){
    const a=block.match(/<a[^>]+class="[^"]*result__a[^"]*"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i);
    if(!a) continue;
    const sn=block.match(/class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/a>/i) || block.match(/class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
    const target=resolveDdg(decodeHtml(a[1]));
    if(!/^https?:\/\//i.test(target)) continue;
    out.push({title:decodeHtml(a[2]),url:target,snippet:decodeHtml(sn?.[1]||"")});
  }
  return out;
}
async function pageText(url:string){try{const r=await fetch(url,{headers:{"user-agent":"Mozilla/5.0 (compatible; FTN-IBIS-Research/1.0)"},redirect:"follow",signal:AbortSignal.timeout(6500)});if(!r.ok)return"";const type=r.headers.get("content-type")||"";if(!/text\/(html|plain)/i.test(type))return"";const html=(await r.text()).slice(0,220000);return decodeHtml(html.replace(/<script[\s\S]*?<\/script>/gi," ").replace(/<style[\s\S]*?<\/style>/gi," ")).slice(0,4500);}catch{return"";}}
async function synthesizeFromEvidence(key:string,model:string,query:string,directive:string,items:Array<{title:string;url:string;snippet:string;text?:string}>){
  const packet=items.slice(0,7).map((x,i)=>`[${i+1}] ${x.title}\nURL: ${x.url}\n${x.snippet}${x.text?`\nPage text: ${x.text}`:""}`).join("\n\n");
  const prompt=`${directive}\nAnswer the user's question only from the evidence packet below. Be complete, practical and Caribbean-aware where relevant. If sources disagree, say so. Cite supporting items inline as [1], [2], etc. Never invent details not supported by the packet.\n\nUSER QUESTION: ${query}\n\nEVIDENCE PACKET:\n${packet}`;
  const r=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,{method:"POST",headers:{"content-type":"application/json","x-goog-api-key":key},body:JSON.stringify({contents:[{role:"user",parts:[{text:prompt}]}],generationConfig:{temperature:0.15,maxOutputTokens:1800}}),signal:AbortSignal.timeout(30000)});
  const data=await r.json().catch(()=>({})); if(!r.ok)return""; return (data?.candidates?.[0]?.content?.parts||[]).map((p:any)=>p?.text||"").join("").trim();
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
  if (payload.action === "health") return reply(origin, { capability: "WEB_RESEARCH", provider: "Google Search grounding via Gemini + independent web fallback", model, configured: !!key, ready: !!key, cebos: true, opportunityScanner: true, inferenceAttempted: false, checkedAt: new Date().toISOString() });
  if (!query) return reply(origin, { error: "query required" }, 400);
  if (!key) return reply(origin, { error: "No web-research reasoning provider is configured." }, 503);

  const state = createReasoningState({ request: query, locationContext }); scanOpportunitySignals(state);
  const directive = providerReasoningDirective(state);
  const opportunityHint = state.opportunitySignals.length ? ` Low-priority economic-shadow signals: ${state.opportunitySignals.map((s)=>s.signal).join(" | ")}. Do not derail the current task.` : "";
  const searchInstruction=[directive+opportunityHint,"You are the research worker, not the final authority. Search the broad public web using Google Search grounding.","Work backward from the user's objective. Search confirming and contradicting evidence and expected traces when useful.","For Caribbean subjects, include local newspapers, government pages/PDFs, registries, tourism/business directories, reviews, maps and public social traces when useful. Do not infer absence from poor indexing.","Prefer primary/official records for consequential claims. Distinguish source claims from inference.","Return a complete, practical answer with important context, caveats and next step. Do not expose chain-of-thought or internal CEBOS labels."].join(" ");
  let answer="",provider="Google Search grounding via Gemini",providerStatus:number|null=null,providerCode:string|null=null;
  try{
    const upstream=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,{method:"POST",headers:{"content-type":"application/json","x-goog-api-key":key},body:JSON.stringify({systemInstruction:{parts:[{text:searchInstruction}]},contents:[{role:"user",parts:[{text:query}]}],tools:[{google_search:{}}],generationConfig:{temperature:0.15,maxOutputTokens:1800}}),signal:AbortSignal.timeout(30000)});
    const data=await upstream.json().catch(()=>({})); providerStatus=upstream.status; providerCode=data?.error?.status||null;
    if(upstream.ok){const c=data?.candidates?.[0]||{};answer=(c?.content?.parts||[]).map((p:any)=>p?.text||"").join("").trim();const chunks=Array.isArray(c?.groundingMetadata?.groundingChunks)?c.groundingMetadata.groundingChunks:[];const seen=new Set<string>();for(let i=0;i<chunks.length;i++){const web=chunks[i]?.web,uri=typeof web?.uri==="string"?web.uri:"",title=typeof web?.title==="string"?web.title:uri;if(!uri||seen.has(uri))continue;seen.add(uri);const sc=sourceClassFor(uri,title),scores=sourceScores(sc);addEvidence(state,{id:`google-${i}`,claim:title||`Source for ${query}`,status:evidenceStatusFor(sc),sourceClass:sc,sourceUrl:uri,publisher:title||null,retrievedAt:new Date().toISOString(),discoveryUtility:scores.discoveryUtility,decisionAuthority:scores.decisionAuthority,geographicRelevance:state.caribbeanRelevant?"Caribbean context requested or inferred":null,contradictions:[]});}}
  }catch{}
  if(!answer||!state.evidence.length){
    const found=await ddgSearch(query).catch(()=>[]);
    const enriched=await Promise.all(found.slice(0,6).map(async x=>({...x,text:await pageText(x.url)})));
    for(let i=0;i<enriched.length;i++){const x=enriched[i],sc=sourceClassFor(x.url,x.title),scores=sourceScores(sc);addEvidence(state,{id:`web-${i}`,claim:x.title,status:evidenceStatusFor(sc),sourceClass:sc,sourceUrl:x.url,publisher:x.title,retrievedAt:new Date().toISOString(),discoveryUtility:scores.discoveryUtility,decisionAuthority:scores.decisionAuthority,geographicRelevance:state.caribbeanRelevant?"Caribbean context requested or inferred":null,contradictions:[]});}
    if(enriched.length){answer=await synthesizeFromEvidence(key,model,query,directive,enriched);provider="Independent web search + Gemini evidence synthesis";}
  }
  const compact={version:state.version,requestClass:state.requestClass,caribbeanRelevant:state.caribbeanRelevant,sourcePlan:researchSourcePlan(state).slice(0,6),evidence:evidenceSummary(state),opportunitySignals:state.opportunitySignals};
  if(!answer||!state.evidence.length)return reply(origin,{error:"Web research completed without enough reliable evidence to answer.",providerStatus,providerCode,sources:state.evidence.map(e=>({title:e.claim,url:e.sourceUrl,publisher:e.publisher,sourceClass:e.sourceClass,evidenceStatus:e.status,discoveryUtility:e.discoveryUtility,decisionAuthority:e.decisionAuthority})),cebos:compact},424);
  return reply(origin,{answer,sources:state.evidence.map(e=>({title:e.claim,url:e.sourceUrl,publisher:e.publisher,sourceClass:e.sourceClass,evidenceStatus:e.status,discoveryUtility:e.discoveryUtility,decisionAuthority:e.decisionAuthority})),provider,model,retrievedAt:new Date().toISOString(),providerStatus,providerCode,cebos:compact});
});
