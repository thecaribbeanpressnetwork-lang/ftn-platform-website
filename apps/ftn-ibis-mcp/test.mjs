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
  const tools = await fetch(`http://127.0.0.1:${port}/mcp`, {
    method: 'POST',
    headers: { accept: 'application/json, text/event-stream', 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} }),
  }).then((response) => response.text());
  assert.match(tools, /opportunity_scout/);
  assert.match(tools, /get_entity_profile/);
  assert.match(tools, /destructiveHint/);
  assert.match(tools, /readOnlyHint/);
  console.log('FTN ibis MCP server health + initialize + tools/list passed');
} finally {
  child.kill('SIGTERM');
}
