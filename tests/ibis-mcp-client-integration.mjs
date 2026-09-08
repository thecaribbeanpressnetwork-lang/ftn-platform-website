import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { IbisMcpClient } from '../scripts/lib/ibis-mcp-client.mjs';

async function waitForReady(child, marker, timeoutMs=10000){
  return new Promise((resolve,reject)=>{
    let buf='';const timer=setTimeout(()=>reject(new Error(`Timed out waiting for ${marker}: ${buf}`)),timeoutMs);
    const onData=(chunk)=>{buf+=chunk.toString();if(buf.includes(marker)){clearTimeout(timer);resolve(buf);}};
    child.stdout.on('data',onData);child.stderr.on('data',onData);child.once('exit',(code)=>{clearTimeout(timer);reject(new Error(`MCP HTTP fixture exited ${code}: ${buf}`));});
  });
}

// Local-computer MCP proof over stdio.
const client = new IbisMcpClient({ name: 'ibis-ci', version: '1.0.0', cacheMs: 60_000 });
try {
  const health = await client.connectStdio({ command: process.execPath, args: ['tests/fixtures/ibis-mcp-test-server.mjs'] });
  assert.equal(health.state, 'CONNECTED');assert.equal(health.transport, 'STDIO');assert.equal(health.server?.name, 'ibis-ci-proof');
  const first = await client.discoverTools();assert.equal(first.cached, false);assert.equal(first.tools.length, 1);assert.equal(first.tools[0].name, 'echo-proof');assert.ok(first.tools[0].inputSchema);
  const second = await client.discoverTools();assert.equal(second.cached, true, 'tool schema should be cached');
  await assert.rejects(client.invokeTool({ name: 'echo-proof', arguments: { value: 'blocked' }, authorize: async () => 'ASK' }),(error) => error?.code === 'IBIS_PERMISSION_REQUIRED' && error?.decision === 'ASK');
  const invocation = await client.invokeTool({ name: 'echo-proof', arguments: { value: 'IBIS-MCP-LIVE' }, authorize: async () => 'ALLOW', permissionContext: { sideEffect: 'READ_ONLY' } });
  assert.equal(invocation.result?.content?.[0]?.text, 'MCP:IBIS-MCP-LIVE');assert.equal(invocation.provenance.protocol, 'MCP');assert.equal(invocation.provenance.tool, 'echo-proof');assert.equal(invocation.provenance.permissionDecision, 'ALLOW');
  const disconnected = await client.disconnect();assert.equal(disconnected.state, 'DISCONNECTED');assert.equal(client.health().state, 'DISCONNECTED');
} finally { try { await client.disconnect(); } catch {} }

// Remote-class MCP proof over real Streamable HTTP. This is deliberately local CI infrastructure:
// it proves the transport/protocol path without pretending an OAuth-protected external service is connected.
const httpServer=spawn(process.execPath,['tests/fixtures/ibis-mcp-http-test-server.mjs'],{stdio:['ignore','pipe','pipe']});
const remote = new IbisMcpClient({ name: 'ibis-http-ci', version: '1.0.0', cacheMs: 60_000 });
try {
  await waitForReady(httpServer,'IBIS_MCP_HTTP_READY');
  const health=await remote.connectRemote('http://127.0.0.1:32145/mcp');
  assert.equal(health.state,'CONNECTED');assert.equal(health.transport,'STREAMABLE_HTTP');assert.equal(health.server?.name,'ibis-http-ci-proof');
  const discovered=await remote.discoverTools();assert.equal(discovered.tools.length,1);assert.equal(discovered.tools[0].name,'remote-echo-proof');
  await assert.rejects(remote.invokeTool({name:'remote-echo-proof',arguments:{value:'blocked'},authorize:async()=> 'ASK'}),(error)=>error?.code==='IBIS_PERMISSION_REQUIRED');
  const result=await remote.invokeTool({name:'remote-echo-proof',arguments:{value:'REMOTE-LIVE'},authorize:async()=> 'ALLOW',permissionContext:{sideEffect:'READ_ONLY'}});
  assert.equal(result.result?.content?.[0]?.text,'HTTP-MCP:REMOTE-LIVE');assert.equal(result.provenance.transport,'STREAMABLE_HTTP');assert.match(result.provenance.endpoint,/127\.0\.0\.1:32145\/mcp/);
  await remote.disconnect();
  const revoked = await remote.revoke();assert.equal(revoked.state, 'REVOKED');await assert.rejects(remote.discoverTools(), /revoked/i);
} finally {
  try { await remote.disconnect(); } catch {}
  httpServer.kill('SIGTERM');
}

console.log('ibis MCP client integration passed: stdio + Streamable HTTP connect → discover/cache → permission block → invoke → provenance → disconnect/revoke');
