import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import path from 'node:path';

const ROOT = process.cwd();
const registryPath = process.argv.find(x => x.startsWith('--registry='))?.slice(11) || 'data/scout-2-source-registry.json';
const outPath = process.argv.find(x => x.startsWith('--out='))?.slice(6) || '/tmp/FTN_Scout_2_Discovery.md';
const jsonPath = process.argv.find(x => x.startsWith('--json='))?.slice(7) || '/tmp/FTN_Scout_2_Discovery.json';
const maxLinks = Number(process.argv.find(x => x.startsWith('--max-links='))?.slice(12) || 30);

const registry = JSON.parse(await fs.readFile(path.resolve(ROOT, registryPath), 'utf8'));
if (registry.policy?.llmCalls !== false || registry.policy?.paidApis !== false) {
  throw new Error('Scout discovery policy must explicitly prohibit LLM and paid API calls.');
}

const keywords = (registry.keywords || []).map(k => k.toLowerCase());
const opportunityTerms = ['grant','funding','procurement','tender','consultancy','expression of interest','eoi','accelerator','challenge','award','apply','applications','call for'];
const userAgent = 'FTN-Scout-2/2.1 (+https://ftnplatform.org/)';

function cleanText(html='') {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

function absoluteUrl(href, base) {
  try {
    const u = new URL(href, base);
    if (!['http:','https:'].includes(u.protocol)) return null;
    u.hash = '';
    return u.toString();
  } catch { return null; }
}

function extractLinks(html, base) {
  const found = [];
  const re = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = re.exec(html))) {
    const url = absoluteUrl(m[1], base);
    if (!url) continue;
    const label = cleanText(m[2]).slice(0, 240);
    if (!label) continue;
    const hay = `${label} ${url}`.toLowerCase();
    const matched = keywords.filter(k => hay.includes(k));
    const opp = opportunityTerms.filter(k => hay.includes(k));
    if (!matched.length) continue;
    found.push({ label, url, matchedKeywords: matched, opportunityTerms: opp });
  }
  const seen = new Set();
  return found.filter(x => !seen.has(x.url) && seen.add(x.url)).slice(0, maxLinks);
}

async function inspect(source) {
  const started = Date.now();
  try {
    const res = await fetch(source.url, {
      redirect: 'follow',
      headers: { 'user-agent': userAgent, 'accept': 'text/html,application/xhtml+xml' },
      signal: AbortSignal.timeout(20000)
    });
    const html = await res.text();
    const text = cleanText(html);
    const lower = text.toLowerCase();
    const matchedKeywords = keywords.filter(k => lower.includes(k));
    const opportunityHits = opportunityTerms.filter(k => lower.includes(k));
    const links = extractLinks(html, res.url || source.url);
    const highSignalLinks = links.filter(x => x.opportunityTerms.length > 0);
    return {
      ...source,
      ok: res.ok,
      status: res.status,
      finalUrl: res.url || source.url,
      fetchedAt: new Date().toISOString(),
      durationMs: Date.now() - started,
      contentHash: crypto.createHash('sha256').update(text).digest('hex'),
      matchedKeywords,
      opportunityHits,
      candidateLinks: links,
      highSignalCount: highSignalLinks.length,
      highSignalLinks
    };
  } catch (error) {
    return {
      ...source,
      ok: false,
      status: null,
      fetchedAt: new Date().toISOString(),
      durationMs: Date.now() - started,
      error: String(error?.message || error),
      matchedKeywords: [], opportunityHits: [], candidateLinks: [], highSignalCount: 0, highSignalLinks: []
    };
  }
}

const results = [];
for (const source of registry.sources || []) results.push(await inspect(source));

const ranked = results
  .flatMap(source => source.highSignalLinks.map(link => ({
    sourceId: source.id,
    sourceName: source.name,
    sourceClass: source.class,
    sourcePriority: source.priority,
    ...link
  })))
  .sort((a,b) => {
    const p = {P0:0,P1:1,P2:2,P3:3};
    return (p[a.sourcePriority] ?? 9) - (p[b.sourcePriority] ?? 9) || b.opportunityTerms.length - a.opportunityTerms.length;
  });

const report = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  policy: registry.policy,
  sourceCount: results.length,
  reachableSources: results.filter(x => x.ok).length,
  highSignalCandidateCount: ranked.length,
  candidates: ranked,
  sources: results
};

const lines = [
  '# FTN Scout 2.0 — Zero-Token Discovery Watch',
  '',
  `Generated: ${report.generatedAt}`,
  `Official/source pages checked: ${report.sourceCount}`,
  `Reachable: ${report.reachableSources}`,
  `High-signal candidate links: ${report.highSignalCandidateCount}`,
  '',
  '> This job uses deterministic HTTP crawling only. It makes no LLM calls, uses no paid search API, submits nothing, spends nothing, and does not create products.',
  '',
  '## Candidate opportunities / signals',
  ''
];
if (!ranked.length) lines.push('No high-signal candidate links were detected in this run.', '');
for (const item of ranked.slice(0, 100)) {
  lines.push(`- **${item.sourcePriority} · ${item.sourceClass} · ${item.label}**`, `  - ${item.url}`, `  - Signals: ${item.opportunityTerms.join(', ')}`, '');
}
lines.push('## Source health', '', '| Priority | Source | HTTP | High-signal links |', '|---|---|---:|---:|');
for (const s of results) lines.push(`| ${s.priority} | ${s.name} | ${s.status ?? 'ERR'} | ${s.highSignalCount} |`);
lines.push('', '## Control rules', '', '- Discovery only; verification remains mandatory before acting.', '- Founder approval required for applications, spending, partnerships and product creation.', '- Failed/blocked sources remain visible so coverage gaps are not silently ignored.', '- This crawler is intentionally independent of ChatGPT/OpenAI token usage.', '');

await fs.writeFile(outPath, lines.join('\n'));
await fs.writeFile(jsonPath, JSON.stringify(report, null, 2) + '\n');
console.log(`Scout 2.0 discovery complete: ${report.reachableSources}/${report.sourceCount} sources reachable; ${report.highSignalCandidateCount} high-signal links.`);
if (report.reachableSources < Math.ceil(report.sourceCount * 0.6)) process.exitCode = 2;
