// Scarlett Search / Find: the SAME canonical FTN ibis MCP endpoint and tool names the production
// ftn-ibis-browser-extension already calls (apps/ftn-ibis-browser-extension/ibis-api.js) -- not a
// new, disconnected retrieval stack. Search provider selection, ranking and evidence handling stay
// entirely behind FTN's own Search Broker; this module only ever forwards a user-typed query and
// renders what comes back.
const MCP_ENDPOINT = 'https://jshmidfpqrajxtukzges.supabase.co/functions/v1/ftn-ibis-mcp';

// Bug found live (this session, via a real cross-origin request from an extension popup, not a
// guess): ftn-ibis-mcp's own CORS preflight (supabase/functions/ftn-ibis-mcp/index.ts) only allows
// `content-type, accept, mcp-session-id` in access-control-allow-headers -- an `apikey`/
// `authorization` header (sent by the shipped ftn-ibis-browser-extension's own ibis-api.js) gets
// the whole request blocked by the browser before it ever reaches the function. The function's own
// handler never reads either header (confirmed by reading index.ts, and by a direct curl call with
// no such headers, which returns 200 identically) -- this endpoint's `search`/`opportunity_scout`
// tools are intentionally public/read-only. Sending only the headers the server's own CORS policy
// actually allows fixes this for Scarlett without touching shared ibis infrastructure; the same fix
// belongs in the shipped ibis extension too (or the function's CORS header list should simply
// include apikey/authorization) -- flagged separately, not changed here.
function publicHeaders() {
  return {
    accept: 'application/json',
    'content-type': 'application/json',
  };
}

export async function callIbis(tool, args) {
  const response = await fetch(MCP_ENDPOINT, {
    method: 'POST',
    headers: publicHeaders(),
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: crypto.randomUUID(),
      method: 'tools/call',
      params: { name: tool, arguments: args },
    }),
  });
  if (!response.ok) throw new Error('FTN ibis returned HTTP ' + response.status + '.');
  const envelope = await response.json();
  if (envelope.error) throw new Error(envelope.error.message || 'FTN ibis could not complete the request.');
  return envelope.result?.structuredContent || {};
}

export function resultRows(payload) {
  if (Array.isArray(payload.opportunities)) return payload.opportunities;
  if (Array.isArray(payload.results)) return payload.results;
  return [];
}

export function sourceLink(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' ? url.href : '';
  } catch {
    return '';
  }
}

// Search retrieves; Find pursues an objective. Both hit the same canonical `search` tool in V2 --
// there is no separate verified "planning" tool on the MCP server to call honestly, so the
// difference V2 actually delivers is: Find sends the user's full stated objective (not just
// keywords) and Scarlett adapts how results are PRESENTED to that objective, via this local,
// deterministic intent classifier. This is disclosed as the real scope in the V2 architecture doc
// -- it does not claim a deeper ibis planning integration that isn't actually wired yet.
const INTENT_PATTERNS = [
  { intent: 'SHOPPING', representation: 'comparison-grid', test: /\b(buy|laptop|phone|price|cost|under\s*(?:tt\$|us\$|\$)|cheapest|best.*(?:for|under)|budget)\b/i },
  { intent: 'OPPORTUNITY', representation: 'opportunity-cards', tool: 'opportunity_scout', test: /\b(grant|scholarship|funding|opportunity|apply|application|job|hiring)\b/i },
  { intent: 'LOCATION', representation: 'map', test: /\b(near me|in trinidad|in tobago|in barbados|properties?\s+(?:in|near)|location|address)\b/i },
  { intent: 'CURRENT_EVENTS', representation: 'timeline', test: /\b(this week|latest|today|breaking|news|update)\b/i },
  { intent: 'RESEARCH', representation: 'evidence', test: /\b(why|how does|explain|evidence|research|compare .* (?:vs|versus))\b/i },
];

export function classifyIntent(query) {
  const text = String(query || '');
  for (const p of INTENT_PATTERNS) {
    if (p.test.test(text)) return { intent: p.intent, representation: p.representation, tool: p.tool || 'search' };
  }
  return { intent: 'GENERAL', representation: 'links', tool: 'search' };
}

export async function search(query, { mode = 'SEARCH' } = {}) {
  const trimmed = String(query || '').trim().slice(0, 400);
  if (!trimmed) throw new Error('Enter a search or a task to find.');
  const classification = mode === 'FIND' ? classifyIntent(trimmed) : { intent: 'GENERAL', representation: 'links', tool: 'search' };
  const payload = await callIbis(classification.tool, { query: trimmed, limit: 10 });
  return { rows: resultRows(payload), classification, tool: classification.tool };
}
