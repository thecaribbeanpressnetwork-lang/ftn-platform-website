import http from 'node:http';
import { McpServer, createMcpHandler } from '@modelcontextprotocol/server';
import { toNodeHandler } from '@modelcontextprotocol/node';
import * as z from 'zod/v4';

const port = Number(process.env.IBIS_MCP_TEST_PORT || 32145);

const handler = createMcpHandler(() => {
  const server = new McpServer({ name: 'ibis-http-ci-proof', version: '1.0.0' }, { capabilities: { tools: {} } });
  server.registerTool(
    'remote-echo-proof',
    {
      description: 'Deterministic Streamable HTTP MCP proof for ibis',
      inputSchema: z.object({ value: z.string().min(1).max(80) }),
      annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
    },
    async ({ value }) => ({ content: [{ type: 'text', text: `HTTP-MCP:${value}` }] }),
  );
  return server;
});

const nodeHandler = toNodeHandler(handler);
const server = http.createServer((req, res) => {
  if (req.url?.split('?')[0] !== '/mcp') {
    res.writeHead(404, { 'content-type': 'text/plain' });
    res.end('not found');
    return;
  }
  nodeHandler(req, res);
});

server.listen(port, '127.0.0.1', () => {
  console.log(`IBIS_MCP_HTTP_READY http://127.0.0.1:${port}/mcp`);
});

for (const signal of ['SIGTERM', 'SIGINT']) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
