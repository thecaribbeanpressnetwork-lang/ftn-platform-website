const endpoint = process.env.FTN_IBIS_MCP_ENDPOINT || 'https://jshmidfpqrajxtukzges.supabase.co/functions/v1/ftn-ibis-mcp';

async function request(body) {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { accept: 'application/json, text/event-stream', 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* report raw response below */ }
  return { status: response.status, json, text };
}

const health = await fetch(endpoint);
if (!health.ok) throw new Error(`health failed: ${health.status} ${await health.text()}`);
const healthBody = await health.json();
if (!healthBody.ok || healthBody.name !== 'FTN ibis — Caribbean Intelligence') throw new Error(`unexpected health payload: ${JSON.stringify(healthBody)}`);

const initialized = await request({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'ftn-ibis-live-check', version: '1.0.0' } } });
if (initialized.status !== 200 || initialized.json?.result?.serverInfo?.name !== 'ftn-ibis-mcp') throw new Error(`initialize failed: ${JSON.stringify(initialized)}`);

const listed = await request({ jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} });
const tools = listed.json?.result?.tools || [];
const names = tools.map((tool) => tool.name);
const expected = ['search', 'fetch', 'opportunity_scout', 'route_intent', 'get_entity_profile', 'get_service_tiers'];
if (listed.status !== 200 || expected.some((name) => !names.includes(name))) throw new Error(`tools/list failed: ${JSON.stringify(listed)}`);

for (const tool of tools) {
  const annotations = tool.annotations || {};
  if (
    annotations.readOnlyHint !== true ||
    annotations.openWorldHint !== false ||
    annotations.destructiveHint !== false ||
    annotations.idempotentHint !== true
  ) {
    throw new Error(`unsafe or incomplete annotations for ${tool.name}: ${JSON.stringify(annotations)}`);
  }
}

console.log(JSON.stringify({ ok: true, endpoint, health: healthBody, tools: names }));
