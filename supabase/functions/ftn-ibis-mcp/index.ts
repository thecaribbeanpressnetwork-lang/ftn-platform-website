import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import registry from "./registry.json" with { type: "json" };
import identity from "./identity.json" with { type: "json" };

const CANONICAL_PAGE = "https://ftnplatform.org/ibis/";
const TYPES = ["MONEY", "PROCUREMENT", "ACCELERATOR", "AWARD", "PARTNER", "COMPETITOR"];
const ROUTES = [
  { id: "opportunities", label: "FTN Opportunities", terms: ["grant", "funding", "procurement", "tender", "opportunity", "award", "accelerator"] },
  { id: "statistics", label: "FTN Statistics", terms: ["statistics", "data", "indicator", "crime", "population", "evidence"] },
  { id: "ftn-index", label: "FTN Index", terms: ["business", "entity", "organization", "directory", "company", "profile"] },
  { id: "community-connect", label: "Community Connect", terms: ["community", "report", "civic", "issue", "municipal", "citizen"] },
  { id: "ibis", label: "FTN ibis", terms: ["caribbean intelligence", "research", "scout", "source", "provenance", "strategy"] },
];

const findings = Array.isArray((registry as any).findings) ? (registry as any).findings : [];
const clean = (v: unknown) => String(v ?? "").trim();
const normalize = (r: any) => ({ id: clean(r.id), type: clean(r.type), status: clean(r.status), title: clean(r.title), organization: clean(r.organization), geography: clean(r.geography), summary: clean(r.summary), sourceUrl: clean(r.sourceUrl), verifiedAt: clean(r.verifiedAt), deadline: r.deadline ?? null, amount: r.amount ?? null, eligibility: r.eligibility ?? null, directive: r.directive ?? null, ftnProducts: Array.isArray(r.ftnProducts) ? r.ftnProducts : [], signals: r.signals || {} });
const matches = (r: any, q: string) => !q || q.toLowerCase().split(/\s+/).filter(Boolean).every((t) => [r.title, r.organization, r.geography, r.summary, r.type, r.status, ...(r.ftnProducts || [])].join(" ").toLowerCase().includes(t));
const score = (r: any) => { const vals = ["userValue", "ecosystemValue", "ownership", "dataValue", "economicValue", "futureOptionality"].map((k) => Number(r.signals?.[k])).filter(Number.isFinite); return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length * 20) : null; };
const provenance = (extra: any = {}) => ({ source: "FTN founder-reviewed intelligence registry", sourceUrl: CANONICAL_PAGE, verifiedAt: (registry as any).runDate || null, retrievalMode: "curated-static-record", notice: "Verify eligibility, deadlines and terms at the original source before acting.", ...extra });
const output = (text: string, data: any) => ({ content: [{ type: "text", text: `${text}\n${JSON.stringify(data)}` }], structuredContent: data });

const tools = [
  { name: "search", description: "Use this when the user wants source-backed Caribbean intelligence, entities, projects or opportunities.", inputSchema: { type: "object", properties: { query: { type: "string" }, type: { type: "string", enum: TYPES }, limit: { type: "integer", minimum: 1, maximum: 20 } } } },
  { name: "fetch", description: "Use this when the user wants the full source-backed record for an FTN ibis search result.", inputSchema: { type: "object", properties: { id: { type: "string" }, sourceUrl: { type: "string" } } } },
  { name: "opportunity_scout", description: "Use this when the user wants Caribbean grants, procurement, accelerators, awards or partnerships. Scores are priority signals, not probabilities.", inputSchema: { type: "object", properties: { query: { type: "string" }, territory: { type: "string" }, limit: { type: "integer", minimum: 1, maximum: 10 } } } },
  { name: "route_intent", description: "Use this when the user expresses a Caribbean goal and needs the most relevant FTN workflow.", inputSchema: { type: "object", required: ["intent"], properties: { intent: { type: "string" } } } },
  { name: "get_entity_profile", description: "Use this when the user asks what FTN ibis is, who owns it, what it connects to, or how to verify it.", inputSchema: { type: "object", properties: { entity: { type: "string" } } } },
];

function callTool(name: string, a: any = {}) {
  if (name === "search") { const q = clean(a.query), type = clean(a.type), limit = Math.min(20, Math.max(1, Number(a.limit) || 10)); const rows = findings.map(normalize).filter((r: any) => !type || r.type === type).filter((r: any) => matches(r, q)).slice(0, limit); return output(`FTN ibis search returned ${rows.length} source-backed record(s).`, { query: q, type: type || null, count: rows.length, results: rows, provenance: provenance({ recordCount: rows.length }) }); }
  if (name === "fetch") { const id = clean(a.id), sourceUrl = clean(a.sourceUrl), r = findings.map(normalize).find((x: any) => (id && x.id === id) || (sourceUrl && x.sourceUrl === sourceUrl)); return output(r ? `FTN ibis record: ${r.title}` : "FTN ibis did not find that indexed record.", { found: !!r, record: r || null, id: id || null, sourceUrl: sourceUrl || null, provenance: provenance(r ? { recordId: r.id } : {}) }); }
  if (name === "opportunity_scout") { const q = clean(a.query), territory = clean(a.territory), limit = Math.min(10, Math.max(1, Number(a.limit) || 8)); const rows = findings.map(normalize).filter((r: any) => ["MONEY", "PROCUREMENT", "ACCELERATOR", "AWARD", "PARTNER"].includes(r.type)).filter((r: any) => !territory || r.geography.toLowerCase().includes(territory.toLowerCase())).filter((r: any) => matches(r, q)).map((r: any) => ({ ...r, priorityScore: score(r), scoreMeaning: "Deterministic FTN priority signal; not a probability of funding or acceptance." })).sort((x: any, y: any) => (y.priorityScore || 0) - (x.priorityScore || 0) || x.title.localeCompare(y.title)).slice(0, limit); return output(`FTN ibis opportunity scout found ${rows.length} candidate(s).`, { query: q, territory, count: rows.length, opportunities: rows, provenance: provenance({ lane: "opportunity-scout" }) }); }
  if (name === "route_intent") { const intent = clean(a.intent), ranked = ROUTES.map((r) => ({ r, score: r.terms.reduce((n, t) => n + (intent.toLowerCase().includes(t) ? 1 : 0), 0) })).filter((x) => x.score).sort((x, y) => y.score - x.score), top = ranked[0]?.r || ROUTES[4]; return output(`FTN ibis routed the intent to ${top.label}.`, { intent, route: { id: top.id, label: top.label, publicUrl: top.id === "ibis" ? CANONICAL_PAGE : `https://ftnplatform.org/${top.id}/` }, matchedTerms: ranked[0]?.score || 0, method: "deterministic-keyword-routing", provenance: provenance({ lane: "intent-routing" }) }); }
  if (name === "get_entity_profile") return output("FTN ibis profile", { requestedEntity: clean(a.entity) || "FTN ibis", profile: identity, provenance: provenance({ lane: "entity-profile" }) });
  throw new Error(`Unknown tool: ${name}`);
}

function jsonRpc(id: any, result: any) { return { jsonrpc: "2.0", id, result }; }
function error(id: any, code: number, message: string) { return { jsonrpc: "2.0", id, error: { code, message } }; }

Deno.serve(async (req) => {
  const headers = { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "access-control-allow-origin": "*", "access-control-allow-methods": "GET,POST,OPTIONS", "access-control-allow-headers": "content-type,accept,mcp-session-id" };
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers });
  if (req.method === "GET") return new Response(JSON.stringify({ ok: true, name: "FTN ibis — Caribbean Intelligence", version: "0.1.0", mcpPath: "/functions/v1/ftn-ibis-mcp", canonicalPage: CANONICAL_PAGE }), { headers });
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "POST required" }), { status: 405, headers });
  let body: any; try { body = await req.json(); } catch { return new Response(JSON.stringify(error(null, -32700, "Invalid JSON")), { status: 400, headers }); }
  const id = body.id ?? null;
  if (body.method === "notifications/initialized" || body.method?.startsWith("notifications/")) return new Response(null, { status: 202, headers });
  if (body.method === "initialize") return new Response(JSON.stringify(jsonRpc(id, { protocolVersion: "2025-06-18", capabilities: { tools: {} }, serverInfo: { name: "ftn-ibis-mcp", version: "0.1.0" } })), { headers });
  if (body.method === "tools/list") return new Response(JSON.stringify(jsonRpc(id, { tools })), { headers });
  if (body.method === "tools/call") { try { return new Response(JSON.stringify(jsonRpc(id, callTool(body.params?.name, body.params?.arguments))), { headers }); } catch (e) { return new Response(JSON.stringify(error(id, -32602, e instanceof Error ? e.message : "Tool call failed")), { status: 200, headers }); } }
  return new Response(JSON.stringify(error(id, -32601, "Method not found")), { status: 200, headers });
});
