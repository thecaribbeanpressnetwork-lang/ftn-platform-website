#!/usr/bin/env node
/**
 * FTN Open-Source Scout
 *
 * A research tool, not an installer. It searches public registries, applies
 * FTN's ownership/licence gate, and writes a review report. It never downloads,
 * executes, or adds third-party code to FTN.
 *
 * Usage:
 *   node scripts/ftn-open-source-scout.mjs --out /tmp/ftn-open-source-report.json
 *   node scripts/ftn-open-source-scout.mjs --self-test
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const defaults = { limitPerQuery: 10, timeoutMs: 6_000 };
const reviewRepository = 'thecaribbeanpressnetwork-lang/ftn-platform-website';
const accepted = new Set(['mit', 'apache-2.0', 'bsd-2-clause', 'bsd-3-clause', 'isc', 'unlicense', 'cc0-1.0']);
const reviewOnly = new Set(['mpl-2.0', 'epl-2.0', 'lgpl-2.1', 'lgpl-3.0']);
const excluded = new Set(['gpl-2.0', 'gpl-3.0', 'agpl-3.0', 'sspl-1.0', 'busl-1.1']);

export function licenceGate(value) {
  const licence = String(value || '').trim().toLowerCase();
  if (!licence) return { decision: 'manual-review', reason: 'No machine-readable licence was returned.' };
  if (accepted.has(licence)) return { decision: 'review-candidate', reason: 'Permissive licence; still requires security, maintenance and provenance review.' };
  if (reviewOnly.has(licence)) return { decision: 'legal-review', reason: 'Weak-copyleft licence requires an integration-specific legal review.' };
  if (excluded.has(licence)) return { decision: 'exclude', reason: 'Strong-copyleft or source-available licence is not eligible for automatic adoption.' };
  return { decision: 'manual-review', reason: `Unrecognised licence: ${licence}.` };
}

export function score(candidate) {
  const gate = licenceGate(candidate.licence);
  let value = 0;
  if (gate.decision === 'review-candidate') value += 35;
  if (gate.decision === 'legal-review') value += 15;
  value += Math.min(20, Math.round(Math.log10(Math.max(1, Number(candidate.popularity || 0))) * 6));
  value += Math.min(30, Number(candidate.relevance || 0) * 10);
  if (candidate.updatedAt && Date.now() - Date.parse(candidate.updatedAt) < 1000 * 60 * 60 * 24 * 365) value += 8;
  if (candidate.description) value += 5;
  if (candidate.homepage) value += 3;
  return { ...candidate, gate, score: gate.decision === 'exclude' ? 0 : value };
}

export function relevance(candidate, term) {
  const ignored = new Set(['web', 'open', 'source', 'browser', 'javascript', 'typescript', 'app', 'application']);
  const needles = String(term).toLowerCase().split(/[^a-z0-9]+/).filter(word => word.length > 2 && !ignored.has(word));
  const haystack = `${candidate.name || ''} ${candidate.description || ''}`.toLowerCase();
  return needles.filter(word => haystack.includes(word)).length;
}

function reviewLink(candidate, area) {
  const title = `FTN Open-Source Scout review: ${candidate.name}`;
  const body = [
    '## Scout recommendation', '',
    `- **Candidate:** [${candidate.name}](${candidate.url})`,
    `- **FTN area:** ${area.area}`,
    `- **Why Scout found it:** ${area.why}`,
    `- **Source:** ${candidate.source}`,
    `- **Licence gate:** ${candidate.gate.decision} — ${candidate.gate.reason}`,
    `- **Scout score:** ${candidate.score}/100`, '',
    '## Required FTN adoption checks', '',
    '- [ ] Verify the upstream release, licence and contributor/data provenance directly.',
    '- [ ] Define the smallest FTN use case and named product owner.',
    '- [ ] Run security, privacy, accessibility, mobile and performance checks in an isolated branch.',
    '- [ ] Record attribution, notices, version and rollback plan in FTN governance.',
    '- [ ] Founder approves before any public release.', '',
    '> This issue starts review only. It does not install, execute, publish or grant a third party access to FTN.'
  ].join('\n');
  const query = new URLSearchParams({ title, body, labels: 'open-source-scout' });
  return `https://github.com/${reviewRepository}/issues/new?${query}`;
}

function recommendation(candidate, area) {
  return {
    ...candidate,
    ftnArea: area.area,
    ftnReason: area.why,
    actionLabel: 'Start FTN adoption review',
    actionUrl: reviewLink(candidate, area)
  };
}

async function getJson(url, headers = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), defaults.timeoutMs);
  try {
    const response = await fetch(url, { headers, signal: controller.signal });
    if (!response.ok) throw new Error(`${new URL(url).hostname} returned ${response.status}`);
    return await response.json();
  } finally { clearTimeout(timer); }
}

async function github(term, limit) {
  const token = process.env.GITHUB_TOKEN;
  const data = await getJson(`https://api.github.com/search/repositories?q=${encodeURIComponent(`${term} archived:false`)}&sort=stars&order=desc&per_page=${limit}`, {
    Accept: 'application/vnd.github+json', 'User-Agent': 'FTN-Open-Source-Scout/1.0', ...(token ? { Authorization: `Bearer ${token}` } : {})
  });
  return (data.items || []).map(item => score({ source: 'GitHub', name: item.full_name, url: item.html_url, description: item.description || '', licence: item.license?.spdx_id || '', popularity: item.stargazers_count || 0, updatedAt: item.updated_at, homepage: item.homepage || '' }));
}

async function huggingFace(term, limit) {
  const data = await getJson(`https://huggingface.co/api/models?search=${encodeURIComponent(term)}&limit=${limit}&full=true`);
  return (data || []).map(item => {
    const tags = item.tags || [];
    const licence = tags.find(tag => /^license:/i.test(tag))?.split(':').slice(1).join(':') || '';
    return score({ source: 'Hugging Face', name: item.modelId, url: `https://huggingface.co/${item.modelId}`, description: (item.pipeline_tag || 'Model') + (tags.length ? ` · ${tags.slice(0, 6).join(', ')}` : ''), licence, popularity: item.downloads || item.likes || 0, updatedAt: item.lastModified, homepage: '' });
  });
}

async function npm(term, limit) {
  const data = await getJson(`https://registry.npmjs.org/-/v1/search?text=${encodeURIComponent(term)}&size=${limit}`);
  return (data.objects || []).map(({ package: item, score: packageScore }) => score({ source: 'npm', name: item.name, url: item.links?.npm || `https://www.npmjs.com/package/${item.name}`, description: item.description || '', licence: item.license || '', popularity: Math.round((packageScore?.final || 0) * 1000), updatedAt: item.date, homepage: item.links?.homepage || '' }));
}

function markdown(report) {
  const lines = [
    '# FTN Open-Source Scout Report', '',
    `Generated: ${report.generatedAt}`, '',
    '> Research only. No candidate has been adopted, installed, or approved for production by this report.', '',
    '## Decision rules', '',
    '- **Review candidate:** permissive machine-readable licence, then FTN security, maintenance, provenance, performance, accessibility and product-fit review.',
    '- **Legal review:** weak-copyleft licence; do not integrate until review is complete.',
    '- **Exclude:** strong-copyleft/source-available licence; do not add to the public FTN website.',
    '- **Manual review:** missing or unclear licence, model/data provenance, or material rights uncertainty.', ''
  ];
  for (const area of report.areas) {
    lines.push(`## ${area.area}`, '', area.why, '');
    const visible = area.candidates.filter(item => item.gate.decision !== 'exclude').slice(0, 12);
    if (!visible.length) { lines.push('No candidates returned. Retry later; a source may have rate-limited the search.', ''); continue; }
    lines.push('| Candidate | FTN value | Licence gate | Score | Founder action |', '|---|---|---|---:|---|');
    for (const item of visible) lines.push(`| [${item.name}](${item.url}) | ${area.why.replaceAll('|', '\\|')} | ${item.gate.decision} | ${item.score} | [${item.actionLabel}](${item.actionUrl}) |`);
    lines.push('');
  }
  lines.push('## Required adoption gate', '', '1. Verify the upstream licence and release tag directly.', '2. Review code/model/data provenance and contributor rights.', '3. Run dependency/security and performance tests in an isolated branch.', '4. Record attribution, notices and version in FTN governance.', '5. Obtain founder approval before public release.', '');
  if (report.errors.length) lines.push('## Source availability', '', `${report.errors.length} source query/queries did not complete. This is normally a timeout or source rate limit; absence from this report is not a negative finding.`, '');
  return lines.join('\n');
}

export async function run({ configPath = resolve(root, 'data/open-source-scout-queries.json') } = {}) {
  const config = JSON.parse(await readFile(configPath, 'utf8'));
  const limit = Math.max(1, Math.min(20, Number(config.limitPerQuery) || defaults.limitPerQuery));
  const sourceFns = { github, huggingface: huggingFace, npm };
  const errors = [];
  const unavailableSources = new Set();
  const areas = [];
  for (const entry of config.queries) {
    const candidates = [];
    for (const term of entry.terms) {
      for (const source of config.sources) {
        if (unavailableSources.has(source)) continue;
        try {
          const results = await sourceFns[source](term, limit);
          for (const candidate of results) {
            const matched = relevance(candidate, term);
            if (matched) candidates.push(score({ ...candidate, relevance: matched, matchedTerm: term }));
          }
        }
        catch (error) {
          errors.push({ area: entry.area, term, source, error: error instanceof Error ? error.message : String(error) });
          // Avoid repeatedly waiting on a registry that is rate-limiting or unreachable.
          unavailableSources.add(source);
        }
      }
    }
    const deduped = [...new Map(candidates.map(item => [`${item.source}:${item.name}`, item])).values()].sort((a, b) => b.score - a.score);
    areas.push({ area: entry.area, why: entry.why, candidates: deduped.map(candidate => recommendation(candidate, entry)) });
  }
  const report = { schemaVersion: 1, generatedAt: new Date().toISOString(), sources: config.sources, areas, errors };
  return { report, markdown: markdown(report) };
}

async function main() {
  if (process.argv.includes('--self-test')) {
    const mit = licenceGate('MIT'), gpl = licenceGate('GPL-3.0'), unknown = licenceGate('');
    if (mit.decision !== 'review-candidate' || gpl.decision !== 'exclude' || unknown.decision !== 'manual-review') throw new Error('Licence gate self-test failed');
    if (score({ licence: 'MIT', popularity: 1000, updatedAt: new Date().toISOString(), description: 'x', homepage: 'x' }).score <= 40) throw new Error('Scoring self-test failed');
    const link = reviewLink({ name: 'Example', url: 'https://example.com', source: 'GitHub', gate: mit, score: 50 }, { area: 'FTN test', why: 'Verify deliberate founder action.' });
    if (!link.includes('/issues/new?') || !link.includes('open-source-scout')) throw new Error('Founder action link self-test failed');
    console.log('FTN Open-Source Scout self-test passed.');
    return;
  }
  const position = process.argv.indexOf('--out');
  const out = position >= 0 ? resolve(process.cwd(), process.argv[position + 1]) : resolve(root, 'GOVERNANCE/FTN_Open_Source_Scout_Latest.md');
  if (position >= 0 && !process.argv[position + 1]) throw new Error('--out requires a file path');
  const result = await run();
  await mkdir(dirname(out), { recursive: true });
  await writeFile(out, result.markdown, 'utf8');
  const jsonOut = out.replace(/\.md$/i, '.json');
  await writeFile(jsonOut, JSON.stringify(result.report, null, 2) + '\n', 'utf8');
  console.log(`FTN Open-Source Scout wrote ${out} (${result.report.areas.length} areas; ${result.report.errors.length} source errors).`);
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) main().catch(error => { console.error(error); process.exitCode = 1; });
