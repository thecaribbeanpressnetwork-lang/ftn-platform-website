import assert from 'node:assert/strict';
import { IbisMcpClient } from '../scripts/lib/ibis-mcp-client.mjs';

const projectRef=process.env.SUPABASE_PROJECT_REF;
const token=process.env.SUPABASE_ACCESS_TOKEN;
if(!projectRef||!token)throw new Error('SUPABASE_PROJECT_REF and SUPABASE_ACCESS_TOKEN are required');

const endpoint=`https://mcp.supabase.com/mcp?project_ref=${encodeURIComponent(projectRef)}&read_only=true&features=database,debugging,docs`;
const client=new IbisMcpClient({name:'ibis-funding-demo',version:'1.0.0',cacheMs:60_000});

try{
  const health=await client.connectRemote(endpoint,{headers:{Authorization:`Bearer ${token}`}});
  assert.equal(health.state,'CONNECTED');
  assert.equal(health.transport,'STREAMABLE_HTTP');

  const discovery=await client.discoverTools();
  const names=discovery.tools.map(t=>t.name);
  assert.ok(names.includes('list_tables'),`Supabase MCP list_tables not discovered. Found: ${names.join(', ')}`);
  // Project-scoped mode must not expose account-management tools.
  assert.equal(names.includes('list_projects'),false,'project-scoped MCP unexpectedly exposed account-wide list_projects');

  const tool=discovery.tools.find(t=>t.name==='list_tables');
  const required=Array.isArray(tool?.inputSchema?.required)?tool.inputSchema.required:[];
  const args={};
  if(required.includes('schemas'))args.schemas=['public'];
  if(required.includes('schema'))args.schema='public';

  const invocation=await client.invokeTool({
    name:'list_tables',arguments:args,
    authorize:async()=> 'ALLOW',
    permissionContext:{sideEffect:'READ_ONLY',constraints:{projectRef,readOnly:true,featureGroups:['database','debugging','docs']}},
  });
  assert.ok(Array.isArray(invocation.result?.content)&&invocation.result.content.length>0,'Supabase list_tables returned no MCP content');
  assert.equal(invocation.provenance.protocol,'MCP');
  assert.equal(invocation.provenance.transport,'STREAMABLE_HTTP');
  assert.equal(invocation.provenance.tool,'list_tables');
  assert.equal(invocation.provenance.permissionDecision,'ALLOW');
  console.log(`ibis real Supabase MCP proof passed: project=${projectRef} tools=${names.length} list_tables returned content; project-scoped + read-only + restricted features`);
}finally{
  try{await client.disconnect();}catch{}
}
