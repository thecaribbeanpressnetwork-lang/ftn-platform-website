import assert from 'node:assert/strict';
import { IbisMcpClient } from '../scripts/lib/ibis-mcp-client.mjs';

const client = new IbisMcpClient({ name: 'ibis-ci', version: '1.0.0', cacheMs: 60_000 });

try {
  const health = await client.connectStdio({
    command: process.execPath,
    args: ['tests/fixtures/ibis-mcp-test-server.mjs'],
  });
  assert.equal(health.state, 'CONNECTED');
  assert.equal(health.transport, 'STDIO');
  assert.equal(health.server?.name, 'ibis-ci-proof');

  const first = await client.discoverTools();
  assert.equal(first.cached, false);
  assert.equal(first.tools.length, 1);
  assert.equal(first.tools[0].name, 'echo-proof');
  assert.ok(first.tools[0].inputSchema);

  const second = await client.discoverTools();
  assert.equal(second.cached, true, 'tool schema should be cached');

  await assert.rejects(
    client.invokeTool({ name: 'echo-proof', arguments: { value: 'blocked' }, authorize: async () => 'ASK' }),
    (error) => error?.code === 'IBIS_PERMISSION_REQUIRED' && error?.decision === 'ASK',
  );

  const invocation = await client.invokeTool({
    name: 'echo-proof',
    arguments: { value: 'IBIS-MCP-LIVE' },
    authorize: async () => 'ALLOW',
    permissionContext: { sideEffect: 'READ_ONLY' },
  });
  assert.equal(invocation.result?.content?.[0]?.text, 'MCP:IBIS-MCP-LIVE');
  assert.equal(invocation.provenance.protocol, 'MCP');
  assert.equal(invocation.provenance.tool, 'echo-proof');
  assert.equal(invocation.provenance.permissionDecision, 'ALLOW');

  const disconnected = await client.disconnect();
  assert.equal(disconnected.state, 'DISCONNECTED');
  assert.equal(client.health().state, 'DISCONNECTED');

  const revoked = await client.revoke();
  assert.equal(revoked.state, 'REVOKED');
  await assert.rejects(client.discoverTools(), /revoked/i);

  console.log('ibis MCP client integration passed: connect → discover/cache → permission block → invoke → provenance → disconnect/revoke');
} finally {
  try { await client.disconnect(); } catch {}
}
