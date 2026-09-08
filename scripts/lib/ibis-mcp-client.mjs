// ibis MCP client adapter — provider-neutral, permission-gated, provenance-preserving.
// Runtime targets: Node/Bun/Deno for remote HTTP. Stdio is local-computer only.

import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';

const DEFAULT_CACHE_MS = 5 * 60 * 1000;

export class IbisMcpClient {
  #client;
  #transport;
  #endpoint = null;
  #transportKind = null;
  #schemaCache = null;
  #connectedAt = null;
  #revoked = false;

  constructor({ name = 'ibis-mcp-client', version = '0.1.0', cacheMs = DEFAULT_CACHE_MS } = {}) {
    this.name = name;
    this.version = version;
    this.cacheMs = cacheMs;
  }

  async connectRemote(url, { headers = {}, authProvider } = {}) {
    this.#assertNotRevoked();
    const endpoint = new URL(url);
    const client = new Client({ name: this.name, version: this.version }, { versionNegotiation: { mode: 'auto' } });
    const transport = new StreamableHTTPClientTransport(endpoint, {
      ...(authProvider ? { authProvider } : {}),
      requestInit: { headers },
    });
    await client.connect(transport);
    this.#client = client;
    this.#transport = transport;
    this.#endpoint = endpoint.toString();
    this.#transportKind = 'STREAMABLE_HTTP';
    this.#connectedAt = new Date().toISOString();
    this.#schemaCache = null;
    return this.health();
  }

  async connectStdio({ command, args = [], env } = {}) {
    this.#assertNotRevoked();
    if (!command) throw new Error('MCP stdio command is required');
    const client = new Client({ name: this.name, version: this.version }, { versionNegotiation: { mode: 'auto' } });
    const transport = new StdioClientTransport({ command, args, ...(env ? { env } : {}) });
    await client.connect(transport);
    this.#client = client;
    this.#transport = transport;
    this.#endpoint = command;
    this.#transportKind = 'STDIO';
    this.#connectedAt = new Date().toISOString();
    this.#schemaCache = null;
    return this.health();
  }

  health() {
    if (!this.#client || !this.#transport || this.#revoked) {
      return { state: 'DISCONNECTED', transport: this.#transportKind, endpoint: this.#endpoint };
    }
    return {
      state: 'CONNECTED',
      transport: this.#transportKind,
      endpoint: this.#endpoint,
      connectedAt: this.#connectedAt,
      protocolEra: this.#client.getProtocolEra?.() ?? null,
      server: this.#client.getServerVersion?.() ?? null,
      capabilities: this.#client.getServerCapabilities?.() ?? null,
    };
  }

  async discoverTools({ force = false } = {}) {
    this.#assertConnected();
    const now = Date.now();
    if (!force && this.#schemaCache && now - this.#schemaCache.cachedAt < this.cacheMs) {
      return { tools: this.#schemaCache.tools, cached: true, cachedAt: new Date(this.#schemaCache.cachedAt).toISOString() };
    }
    const { tools } = await this.#client.listTools();
    this.#schemaCache = { tools, cachedAt: now };
    return { tools, cached: false, cachedAt: new Date(now).toISOString() };
  }

  async invokeTool({ name, arguments: args = {}, authorize, permissionContext = {} } = {}) {
    this.#assertConnected();
    if (!name) throw new Error('MCP tool name is required');
    if (typeof authorize !== 'function') throw new Error('MCP invocation requires an explicit permission authorizer');

    const decision = await authorize({
      subject: `mcp:${this.#endpoint}`,
      action: `tool:${name}`,
      sideEffect: permissionContext.sideEffect || 'EXTERNAL',
      constraints: permissionContext.constraints || {},
    });
    if (decision !== 'ALLOW') {
      const error = new Error(`MCP tool invocation blocked by permission decision: ${decision || 'ASK'}`);
      error.code = 'IBIS_PERMISSION_REQUIRED';
      error.decision = decision || 'ASK';
      throw error;
    }

    const discovered = await this.discoverTools();
    const tool = discovered.tools.find((candidate) => candidate.name === name);
    if (!tool) throw new Error(`MCP tool not discovered: ${name}`);

    const startedAt = new Date().toISOString();
    const result = await this.#client.callTool({ name, arguments: args }, { toolDefinition: tool });
    const completedAt = new Date().toISOString();
    return {
      result,
      provenance: {
        protocol: 'MCP',
        endpoint: this.#endpoint,
        transport: this.#transportKind,
        server: this.#client.getServerVersion?.() ?? null,
        tool: name,
        startedAt,
        completedAt,
        permissionDecision: 'ALLOW',
      },
    };
  }

  async disconnect() {
    if (this.#client) await this.#client.close();
    this.#client = null;
    this.#transport = null;
    this.#schemaCache = null;
    return { state: 'DISCONNECTED' };
  }

  async revoke() {
    await this.disconnect();
    this.#revoked = true;
    this.#endpoint = null;
    this.#transportKind = null;
    this.#connectedAt = null;
    return { state: 'REVOKED' };
  }

  #assertConnected() {
    this.#assertNotRevoked();
    if (!this.#client || !this.#transport) throw new Error('MCP client is not connected');
  }

  #assertNotRevoked() {
    if (this.#revoked) throw new Error('MCP connection has been revoked');
  }
}
