import { McpServer } from '@modelcontextprotocol/server';
import { serveStdio } from '@modelcontextprotocol/server/stdio';
import * as z from 'zod/v4';

function createServer() {
  const server = new McpServer({ name: 'ibis-ci-proof', version: '1.0.0' });
  server.registerTool(
    'echo-proof',
    {
      description: 'Deterministic MCP integration proof',
      inputSchema: z.object({ value: z.string().min(1).max(80) }),
      annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
    },
    async ({ value }) => ({
      content: [{ type: 'text', text: `MCP:${value}` }],
    }),
  );
  return server;
}

void serveStdio(createServer);
console.error('ibis MCP CI proof server ready');
