import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const port = 8788;
const child = spawn(process.execPath, ['server.mjs'], { cwd: fileURLToPath(new URL('.', import.meta.url)), env: { ...process.env, PORT: String(port) }, stdio: ['ignore', 'pipe', 'pipe'] });
let output = '';
child.stdout.on('data', (chunk) => { output += chunk.toString(); });
child.stderr.on('data', (chunk) => { output += chunk.toString(); });

async function waitForReady() {
  const start = Date.now();
  while (!output.includes('FTN_IBIS_MCP_READY')) {
    if (Date.now() - start > 10000) throw new Error(`Timed out starting MCP server: ${output}`);
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
}

try {
  await waitForReady();
  async function envelope(response) {
    const body = await response.text();
    const dataLine = body.split(/\r?\n/).find((line) => line.startsWith('data: '));
    return JSON.parse(dataLine ? dataLine.slice(6) : body);
  }
  const health = await fetch(`http://127.0.0.1:${port}/health`).then((response) => response.json());
  assert.equal(health.ok, true);
  assert.equal(health.mcpPath, '/mcp');
  const initialize = await fetch(`http://127.0.0.1:${port}/mcp`, {
    method: 'POST',
    headers: { accept: 'application/json, text/event-stream', 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'ftn-ibis-test', version: '0.1.0' } } }),
  });
  assert.equal(initialize.status, 200);
  const session = initialize.headers.get('mcp-session-id');
  assert.equal(session, null, 'Legacy HTTP fallback must remain stateless');
  const toolsResponse = await fetch(`http://127.0.0.1:${port}/mcp`, {
    method: 'POST',
    headers: { accept: 'application/json, text/event-stream', 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} }),
  }).then(envelope);
  const tools = toolsResponse.result?.tools || [];
  const expected = ['search', 'fetch', 'opportunity_scout', 'route_intent', 'get_entity_profile', 'get_service_tiers'];
  assert.deepEqual(tools.map((tool) => tool.name), expected);
  for (const tool of tools) {
    assert.equal(tool.annotations?.readOnlyHint, true);
    assert.equal(tool.annotations?.destructiveHint, false);
    assert.equal(tool.annotations?.openWorldHint, false);
    assert.equal(tool.annotations?.idempotentHint, true);
  }
  async function call(id, name, args = {}) {
    return fetch(`http://127.0.0.1:${port}/mcp`, {
      method: 'POST',
      headers: { accept: 'application/json, text/event-stream', 'content-type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id, method: 'tools/call', params: { name, arguments: args } }),
    }).then(envelope);
  }
  const search = await call(3, 'search', { query: '', limit: 1 });
  const record = search.result?.structuredContent?.results?.[0];
  assert.ok(record?.id, 'search must return an indexed record for the fetch proof');
  const calls = [
    search,
    await call(4, 'fetch', { id: record.id }),
    await call(5, 'opportunity_scout', { query: '', limit: 1 }),
    await call(6, 'route_intent', { intent: 'I need official Caribbean statistics.' }),
    await call(7, 'get_entity_profile', { entity: 'FTN ibis' }),
    await call(8, 'get_service_tiers', {}),
  ];
  for (const response of calls) {
    assert.ok(response.result?.structuredContent?.provenance?.sourceUrl, 'Every public tool result must carry provenance.');
    assert.match(response.result.structuredContent.provenance.notice, /verify/i);
  }
  console.log('FTN ibis MCP server health + initialize + six read-only tool calls + provenance passed');
} finally {
  child.kill('SIGTERM');
}
