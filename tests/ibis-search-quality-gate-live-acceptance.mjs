// FTN Platform -- Search Quality Gate live acceptance test (2026-09-18).
//
// Runs the mission's required acceptance query plus its 5 additional queries against the LIVE
// production ibis-assistant canonical_query action, and records exactly the fields the mission
// asked for: query, normalized search query (best-effort, from providerPath/sources), SearXNG
// result count (best-effort from sources when provider is searxng), quality decision (inferred:
// did the accepted provider match searxng or fall through to Claude/Brave), Claude fallback
// invoked (inferred from providerPath containing a claude-web-search entry OR a SearXNG rejection
// implied by falling through), accepted provider, evidenceState, sources, answer, pass/fail.
//
// Run: node tests/ibis-search-quality-gate-live-acceptance.mjs
// Output: GOVERNANCE/benchmarks/search-quality-gate-<timestamp>/results.json + summary.md
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const config = JSON.parse(fs.readFileSync(path.join(root, 'config/public-runtime.json'), 'utf8'));
const base = config.supabase?.url;
const key = config.supabase?.publishableKey;
if (!base || !key) throw new Error('Public Supabase runtime configuration is incomplete.');
const endpoint = `${base}/functions/v1/ibis-assistant`;

const RUN_ID = new Date().toISOString().replace(/[:.]/g, '-');
const OUT_DIR = path.join(root, 'GOVERNANCE', 'benchmarks', `search-quality-gate-${RUN_ID}`);
fs.mkdirSync(OUT_DIR, { recursive: true });

const QUERIES = [
  'What changed in Trinidad and Tobago this week?',
  'What is happening in Trinidad and Tobago today?',
  'What changed in Tobago tourism this week?',
  'What happened in Trinidad politics this week?',
  'What major business news happened in Trinidad and Tobago this week?',
  'What changed at Trinidad and Tobago Parliament this week?',
];

const STALE_YEAR_RE = /\b(19\d{2}|20[01]\d|202[0-4])\b/; // flags any year 2024 or earlier as a red flag worth a human look, not an automatic fail
const NO_CURRENT_INFO_RE = /couldn.?t find (any )?current|no current information|cannot verify (the )?requested information|don.?t have a working live-search route/i;
const FRAMEWORK_LEAK_RE = /caribbean lens|founder reasoning|ricardo|governed doctrine|red team analysis|futureyou|value lens|truthmode|80\/20 framework/i;

async function post(body, timeoutMs = 60_000) {
  const started = Date.now();
  let response, payload, error = null;
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: { origin: 'https://ftnplatform.org', apikey: key, authorization: `Bearer ${key}`, 'content-type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });
    payload = await response.json().catch(() => ({}));
  } catch (e) {
    error = e.message;
  }
  const latencyMs = Date.now() - started;
  return { ok: !error && response?.ok, status: response?.status ?? 0, payload: payload || {}, latencyMs, error };
}

async function askCanonical(text) {
  return post({ action: 'canonical_query', messages: [{ role: 'user', content: text }], products: [] });
}

const results = [];
for (const query of QUERIES) {
  const res = await askCanonical(query);
  const p = res.payload || {};
  const providerPath = p.providerPath || [];
  const sources = p.sources || [];
  const acceptedProviderEntry = providerPath.find((e) => typeof e === 'string' && e.startsWith('search:'));
  const acceptedProvider = acceptedProviderEntry ? acceptedProviderEntry.replace('search:', '') : (p.evidenceState === 'SEARCH_GROUNDED' ? 'unknown' : 'none');
  const claudeFallbackInvoked = acceptedProvider === 'claude-web-search';
  const searxngResultCount = acceptedProvider === 'searxng' ? sources.length : null;
  const answer = p.answer || '';
  const hasStaleYearInAnswer = STALE_YEAR_RE.test(answer);
  const hasNoCurrentInfoClaim = NO_CURRENT_INFO_RE.test(answer);
  const hasFrameworkLeak = FRAMEWORK_LEAK_RE.test(answer);
  const pass = res.ok
    && p.evidenceState === 'SEARCH_GROUNDED'
    && sources.length > 0
    && !hasNoCurrentInfoClaim
    && !hasFrameworkLeak;

  results.push({
    query,
    httpOk: res.ok,
    httpStatus: res.status,
    latencyMs: res.latencyMs,
    queryClass: p.queryClass || null,
    providerPath,
    acceptedProvider,
    claudeFallbackInvoked,
    searxngResultCount,
    evidenceState: p.evidenceState || null,
    sourceCount: sources.length,
    sources: sources.map((s) => ({ title: s.title, url: s.url, publishedAt: s.publishedAt })),
    answer,
    flags: { hasStaleYearInAnswer, hasNoCurrentInfoClaim, hasFrameworkLeak },
    pass,
  });
  console.log(`${pass ? 'PASS' : 'FAIL'} | ${query} | provider=${acceptedProvider} | evidenceState=${p.evidenceState} | sources=${sources.length}${hasStaleYearInAnswer ? ' | STALE-YEAR-FLAG' : ''}${hasNoCurrentInfoClaim ? ' | NO-CURRENT-INFO-CLAIM' : ''}${hasFrameworkLeak ? ' | FRAMEWORK-LEAK' : ''}`);
}

fs.writeFileSync(path.join(OUT_DIR, 'results.json'), JSON.stringify(results, null, 2));

const summaryLines = [
  '# Search Quality Gate -- Live Acceptance Run',
  '',
  `Run: ${RUN_ID}`,
  '',
  '| Query | Provider | Evidence State | Sources | Stale-year flag | No-current-info claim | Framework leak | Pass |',
  '|---|---|---|---|---|---|---|---|',
  ...results.map((r) => `| ${r.query} | ${r.acceptedProvider} | ${r.evidenceState} | ${r.sourceCount} | ${r.flags.hasStaleYearInAnswer ? 'YES' : 'no'} | ${r.flags.hasNoCurrentInfoClaim ? 'YES' : 'no'} | ${r.flags.hasFrameworkLeak ? 'YES' : 'no'} | ${r.pass ? 'PASS' : 'FAIL'} |`),
  '',
  '## Full answers',
  '',
  ...results.map((r) => `### ${r.query}\n\nProvider path: ${JSON.stringify(r.providerPath)}\n\nSources:\n${r.sources.map((s) => `- [${s.title}](${s.url}) (publishedAt: ${s.publishedAt})`).join('\n') || '(none)'}\n\nAnswer:\n\n> ${r.answer.replace(/\n/g, '\n> ')}\n`),
];
fs.writeFileSync(path.join(OUT_DIR, 'summary.md'), summaryLines.join('\n'));

console.log(`\nSaved: ${OUT_DIR}`);
const failCount = results.filter((r) => !r.pass).length;
console.log(`${results.length - failCount}/${results.length} PASS`);
process.exit(failCount > 0 ? 1 : 0);
