import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { McpServer, createMcpHandler } from '@modelcontextprotocol/server';
import { toNodeHandler } from '@modelcontextprotocol/node';
import * as z from 'zod/v4';

const APP_NAME = 'FTN ibis — Caribbean Intelligence';
const APP_VERSION = '0.1.0';
const CANONICAL_PAGE = 'https://ftnplatform.org/ibis/';
const CONTACT = 'facethenationtt@gmail.com';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const registryPath = resolve(root, 'data/scout-2-current.json');
const identityPath = resolve(root, 'ibis/ibis.json');

const TYPES = ['MONEY', 'PROCUREMENT', 'ACCELERATOR', 'AWARD', 'PARTNER', 'COMPETITOR'];
const ROUTES = [
  { id: 'opportunities', label: 'FTN Opportunities', terms: ['grant', 'funding', 'procurement', 'tender', 'opportunity', 'award', 'accelerator'] },
  { id: 'statistics', label: 'FTN Statistics', terms: ['statistics', 'data', 'indicator', 'crime', 'population', 'evidence'] },
  { id: 'ftn-index', label: 'FTN Index', terms: ['business', 'entity', 'organization', 'directory', 'company', 'profile'] },
  { id: 'community-connect', label: 'Community Connect', terms: ['community', 'report', 'civic', 'issue', 'municipal', 'citizen'] },
  { id: 'ibis', label: 'FTN ibis', terms: ['caribbean intelligence', 'research', 'scout', 'source', 'provenance', 'strategy'] },
];

let cache = null;

async function loadData() {
  if (cache) return cache;
  const [registry, identity] = await Promise.all([
    readFile(registryPath, 'utf8').then(JSON.parse),
    readFile(identityPath, 'utf8').then(JSON.parse),
  ]);
  cache = {
    registry,
    identity,
    findings: Array.isArray(registry.findings) ? registry.findings : [],
    loadedAt: new Date().toISOString(),
  };
  return cache;
}

function provenance(extra = {}) {
  return {
    source: 'FTN founder-reviewed intelligence registry',
    sourceUrl: CANONICAL_PAGE,
    verifiedAt: cache?.registry?.runDate || null,
    retrievalMode: 'curated-static-record',
    notice: 'FTN indexes source metadata for discovery. Verify eligibility, deadlines and terms at the original source before acting.',
    ...extra,
  };
}

function text(value) {
  return String(value ?? '').trim();
}

function normalize(record) {
  return {
    id: text(record.id),
    type: text(record.type),
    status: text(record.status),
    title: text(record.title),
    organization: text(record.organization),
    geography: text(record.geography),
    summary: text(record.summary),
    sourceUrl: text(record.sourceUrl),
    verifiedAt: text(record.verifiedAt),
    deadline: record.deadline || null,
    amount: record.amount || null,
    eligibility: record.eligibility || null,
    directive: record.directive || null,
    ftnProducts: Array.isArray(record.ftnProducts) ? record.ftnProducts : [],
    signals: record.signals || {},
  };
}

function matches(record, query) {
  if (!query) return true;
  const haystack = [record.title, record.organization, record.geography, record.summary, record.type, record.status, ...(record.ftnProducts || [])]
    .join(' ')
    .toLowerCase();
  return query.toLowerCase().split(/\s+/).filter(Boolean).every((term) => haystack.includes(term));
}

function priorityScore(record) {
  const signals = record.signals || {};
  const keys = ['userValue', 'ecosystemValue', 'ownership', 'dataValue', 'economicValue', 'futureOptionality'];
  const values = keys.map((key) => Number(signals[key])).filter(Number.isFinite);
  if (!values.length) return null;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length * 20);
}

function resultContent(label, payload) {
  return {
    content: [{ type: 'text', text: `${label}\n${JSON.stringify(payload)}` }],
    structuredContent: payload,
  };
}

async function reportUsage(eventKind, toolName, startedAt, resultState = '') {
  const endpoint = process.env.FTN_IBIS_USAGE_WEBHOOK_URL || '';
  const token = process.env.FTN_IBIS_USAGE_TOKEN || '';
  if (!endpoint || !token) return;
  try {
    await fetch(endpoint, {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify({ eventKind, toolName, hostName: 'mcp', resultState, latencyMs: Math.max(0, Date.now() - startedAt) }),
      signal: AbortSignal.timeout(1500),
    });
  } catch {
    // Usage evidence must never make the intelligence tool fail.
  }
}

function createServer() {
  const server = new McpServer({ name: 'ftn-ibis-mcp', version: APP_VERSION }, { capabilities: { tools: {} } });
  const registerTool = (name, config, handler) => server.registerTool(name, config, async (args) => {
    const startedAt = Date.now();
    await reportUsage('tool-call', name, startedAt);
    try {
      const result = await handler(args);
      await reportUsage('tool-success', name, startedAt, 'success');
      return result;
    } catch (error) {
      await reportUsage('tool-error', name, startedAt, error instanceof Error ? error.name : 'error');
      throw error;
    }
  });

  registerTool('search', {
    title: 'Search FTN ibis',
    description: 'Use this when the user wants source-backed Caribbean intelligence, entities, projects or opportunities. Returns only FTN-indexed records with provenance.',
    inputSchema: z.object({
      query: z.string().max(160).default('').describe('Keywords such as Caribbean funding, Trinidad, digital public infrastructure or cultural registry.'),
      type: z.enum(TYPES).optional().describe('Optional record type filter.'),
      limit: z.number().int().min(1).max(20).default(10),
    }),
    annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false, destructiveHint: false },
  }, async ({ query, type, limit }) => {
    const data = await loadData();
    const rows = data.findings.map(normalize)
      .filter((record) => !type || record.type === type)
      .filter((record) => matches(record, query))
      .slice(0, limit);
    const payload = { query, type: type || null, count: rows.length, results: rows, provenance: provenance({ recordCount: rows.length }) };
    return resultContent(`FTN ibis search returned ${rows.length} source-backed record(s).`, payload);
  });

  registerTool('fetch', {
    title: 'Fetch an FTN ibis record',
    description: 'Use this when the user wants the full source-backed record for an FTN ibis search result. Pass its record id or exact source URL.',
    inputSchema: z.object({
      id: z.string().max(160).optional(),
      sourceUrl: z.string().url().max(500).optional(),
    }).refine((value) => value.id || value.sourceUrl, { message: 'Provide id or sourceUrl.' }),
    annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false, destructiveHint: false },
  }, async ({ id, sourceUrl }) => {
    const data = await loadData();
    const record = data.findings.map(normalize).find((item) => (id && item.id === id) || (sourceUrl && item.sourceUrl === sourceUrl));
    if (!record) {
      return resultContent('FTN ibis did not find that indexed record.', { found: false, id: id || null, sourceUrl: sourceUrl || null, provenance: provenance() });
    }
    return resultContent(`FTN ibis record: ${record.title}`, { found: true, record, provenance: provenance({ recordId: record.id }) });
  });

  registerTool('opportunity_scout', {
    title: 'Scout Caribbean opportunities',
    description: 'Use this when the user wants grants, procurement, accelerators, awards or partnership opportunities relevant to the Caribbean. Scores are priority signals, not success probabilities.',
    inputSchema: z.object({
      query: z.string().max(160).default('').describe('Optional goal, sector, country or keyword.'),
      territory: z.string().max(80).default('').describe('Optional territory such as Trinidad and Tobago or Caribbean.'),
      limit: z.number().int().min(1).max(10).default(8),
    }),
    annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false, destructiveHint: false },
  }, async ({ query, territory, limit }) => {
    const data = await loadData();
    const rows = data.findings.map(normalize)
      .filter((record) => ['MONEY', 'PROCUREMENT', 'ACCELERATOR', 'AWARD', 'PARTNER'].includes(record.type))
      .filter((record) => !territory || record.geography.toLowerCase().includes(territory.toLowerCase()))
      .filter((record) => matches(record, query))
      .map((record) => ({ ...record, priorityScore: priorityScore(record), scoreMeaning: 'Deterministic FTN priority signal; not a probability of funding or acceptance.' }))
      .sort((a, b) => (b.priorityScore || 0) - (a.priorityScore || 0) || a.title.localeCompare(b.title))
      .slice(0, limit);
    const payload = { query, territory, count: rows.length, opportunities: rows, provenance: provenance({ lane: 'opportunity-scout' }) };
    return resultContent(`FTN ibis opportunity scout found ${rows.length} candidate(s).`, payload);
  });

  registerTool('route_intent', {
    title: 'Route an FTN intent',
    description: 'Use this when the user expresses a Caribbean goal and needs the most relevant FTN product or ibis workflow. Routing is deterministic and transparent.',
    inputSchema: z.object({ intent: z.string().min(1).max(240) }),
    annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false, destructiveHint: false },
  }, async ({ intent }) => {
    const lower = intent.toLowerCase();
    const ranked = ROUTES.map((route) => ({ route, score: route.terms.reduce((sum, term) => sum + (lower.includes(term) ? 1 : 0), 0) }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score);
    const top = ranked[0]?.route || ROUTES.find((route) => route.id === 'ibis');
    const payload = { intent, route: { id: top.id, label: top.label, publicUrl: top.id === 'ibis' ? CANONICAL_PAGE : `https://ftnplatform.org/${top.id}/` }, matchedTerms: ranked[0]?.score || 0, method: 'deterministic-keyword-routing', provenance: provenance({ lane: 'intent-routing' }) };
    return resultContent(`FTN ibis routed the intent to ${top.label}.`, payload);
  });

  registerTool('get_entity_profile', {
    title: 'Get the FTN ibis profile',
    description: 'Use this when the user asks what FTN ibis is, who owns it, what it connects to, or how to verify it.',
    inputSchema: z.object({ entity: z.string().max(120).default('FTN ibis') }),
    annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false, destructiveHint: false },
  }, async ({ entity }) => {
    const data = await loadData();
    const payload = {
      requestedEntity: entity,
      profile: {
        name: data.identity.name,
        shortName: data.identity.shortName,
        alternateNames: data.identity.alternateNames,
        description: data.identity.description,
        publisher: data.identity.publisher,
        founder: data.identity.founder,
        publicBrief: data.identity.publicBrief,
        repository: data.identity.repository,
        researchTopics: data.identity.researchTopics,
        ownershipNotice: data.identity.ownershipNotice,
      },
      provenance: provenance({ lane: 'entity-profile' }),
    };
    return resultContent('FTN ibis profile', payload);
  });

  registerTool('get_service_tiers', {
    title: 'Compare FTN ibis Standard and Pro',
    description: 'Use this when the user asks what FTN ibis costs or what the free and paid tiers include. This tool only describes plans; it cannot charge the user.',
    inputSchema: z.object({}),
    annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false, destructiveHint: false },
  }, async () => resultContent('FTN ibis has a free Standard tier and an optional Pro pass.', {
    plans: [
      { id: 'ibis-standard', name: 'FTN ibis Standard', price: 'TT$0', features: ['Five public source-backed tools', 'Caribbean opportunity search', 'Provenance and original source links'] },
      { id: 'ibis-pro-30d', name: 'FTN ibis Pro — 30 days', price: 'TT$99', renewal: 'One-time; no automatic renewal', features: ['Everything in Standard', 'Private saved watchlists', 'International capital brief matching'] },
    ],
    pricingUrl: 'https://ftnplatform.org/ibis/pricing/',
    paymentNotice: 'Checkout is WAM-hosted. This read-only tool cannot create a charge.',
    provenance: provenance({ lane: 'service-tiers' }),
  }));

  return server;
}

const handler = createMcpHandler(createServer);
const nodeHandler = toNodeHandler(handler);
const port = Number(process.env.PORT || process.env.IBIS_MCP_PORT || 8787);
const host = process.env.HOST || '127.0.0.1';

const httpServer = http.createServer((req, res) => {
  const path = req.url?.split('?')[0] || '/';
  if (path === '/health') {
    res.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
    res.end(JSON.stringify({ ok: true, name: APP_NAME, version: APP_VERSION, mcpPath: '/mcp', canonicalPage: CANONICAL_PAGE, contact: CONTACT }));
    return;
  }
  if (path !== '/mcp') {
    res.writeHead(404, { 'content-type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ error: 'Not found', expected: ['/health', '/mcp'] }));
    return;
  }
  res.setHeader('access-control-allow-origin', '*');
  res.setHeader('access-control-allow-methods', 'GET,POST,DELETE,OPTIONS');
  res.setHeader('access-control-allow-headers', 'content-type,accept,mcp-session-id,last-event-id');
  res.setHeader('access-control-expose-headers', 'mcp-session-id');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }
  nodeHandler(req, res);
});

httpServer.listen(port, host, () => {
  console.log(`FTN_IBIS_MCP_READY http://${host}:${port}/mcp`);
});

for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, () => httpServer.close(() => process.exit(0)));
