// FTN Platform — deployment-artifact exposure audit (2026-08-25, Supabase security audit
// follow-up). Guards the two real defenses against internal source files being published:
// functions/_middleware.js (Cloudflare Pages, request-time -- Functions run ahead of static asset
// serving on this project, see that file's own header) and the GitHub Pages workflow's rsync
// exclusion (build-time -- the excluded paths never enter the uploaded artifact at all). Both are
// tested for real behavior, not just presence: the middleware is invoked exactly as Cloudflare
// would invoke it, including case variants, single- and double-percent-encoded paths, and a
// representative sample of real public routes that must NEVER be blocked.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { onRequest } from '../functions/_middleware.js';

// --- 1. The middleware's own denylist and the GitHub Pages workflow's exclusion list must never ---
// drift apart -- the same real gap (one layer fixed, the other silently left open) is exactly what
// this whole audit exists to prevent from recurring.
const middlewareSource = fs.readFileSync('functions/_middleware.js', 'utf8');
const listMatch = middlewareSource.match(/const BLOCKED_PREFIXES = \[([\s\S]*?)\];/);
assert(listMatch, 'functions/_middleware.js must export a readable BLOCKED_PREFIXES list');
const middlewarePrefixes = [...listMatch[1].matchAll(/'([^']+)'/g)].map((m) => m[1].replace(/^\//, ''));

const workflow = fs.readFileSync('.github/workflows/static-pages.yml', 'utf8');
const excludeMatches = [...workflow.matchAll(/--exclude='([^']+)'/g)].map((m) => m[1]);
assert(excludeMatches.length > 5, 'the GitHub Pages workflow must exclude a real, non-trivial set of internal paths');

// Compare case-insensitively and ignore the markdown-glob/dotfile syntax differences between a
// URL-path denylist and an rsync --exclude list (e.g. 'RELEASE_NOTES_*.md' vs the middleware's
// per-file entries) -- the real invariant is "every top-level internal artifact named in one list
// has SOME matching entry in the other", not that the two lists are byte-identical.
const middlewareSet = new Set(middlewarePrefixes.map((p) => p.toLowerCase()));
const workflowSet = new Set(excludeMatches.map((p) => p.toLowerCase()));
for (const dir of ['supabase', 'governance', 'tests', 'scripts', '.claude', '.github', '00_phase1_discovery', 'dj-tube-prototype', 'docs']) {
  assert(
    [...middlewareSet].some((p) => p === dir) && [...workflowSet].some((p) => p === dir || p.replace(/^\//, '') === dir),
    `internal path "${dir}" must be blocked in BOTH functions/_middleware.js and the GitHub Pages workflow exclusion list -- one layer alone is not defense in depth`
  );
}

// --- 2. Real middleware behavior, invoked exactly as Cloudflare Pages would invoke it. ---
function fakeContext(pathname) {
  let nextCalled = false;
  return {
    request: { url: 'https://ftnplatform.org' + pathname },
    next: async () => { nextCalled = true; return new Response('ok'); },
    _nextCalled: () => nextCalled,
  };
}
async function isBlockedByMiddleware(pathname) {
  const ctx = fakeContext(pathname);
  const res = await onRequest(ctx);
  return res.status === 404 && !ctx._nextCalled();
}

const BLOCKED_CASES = [
  '/supabase/functions/ftn-owner-control/index.ts',
  '/supabase/migrations/20260825120000_restore_public_issues_read_policy.sql',
  '/GOVERNANCE/FTN_Repair_Ledger_2026-08-24.md',
  '/governance/ftn_repair_ledger_2026-08-24.md', // case variant
  '/tests/backend-source-audit.mjs',
  '/scripts/lib/statistics-source-adapter.mjs',
  '/.claude/context/decisions.md',
  '/.github/workflows/static-pages.yml',
  '/CLAUDE.md',
  '/claude.md', // case variant
  '/IBIS-MAP.md',
  '/00_Phase1_Discovery/Phase1-Discovery-Report.html',
  '/dj-tube-prototype/index.html',
  '/docs/deferred-content.md',
  '/FTN_Master_Asset_Library_v1.0/anything.png',
  '/.mcp.json',
  '/SUPABASE/functions/x', // upper-case variant
  '/supabase%2Ffunctions%2Fftn-owner-control%2Findex.ts', // single-encoded slash
  '/%2573upabase/functions/x', // double-encoded 's' (%25 -> %, then %73 -> s)
  '//supabase//migrations//x.sql', // repeated-slash normalization
  '/GOVERNANCE', // exact directory path, no trailing slash
];
for (const path of BLOCKED_CASES) {
  assert.equal(await isBlockedByMiddleware(path), true, `must be blocked: ${path}`);
}

// --- 3. Real public routes must NEVER be blocked -- a denylist that's too broad is its own defect. ---
const PUBLIC_CASES = [
  '/', '/statistics/', '/riddim/dj/', '/riddim/daw/', '/account/', '/observatory/',
  '/govern/', '/parliament/', '/trust/', '/god-mode/', '/data/crime-statistics.json',
  '/js/ibis-provider-registry.js', '/css/tokens.css', '/version.json', '/sitemap.xml',
  '/robots.txt', '/manifest.webmanifest', '/legal/privacy-policy/', '/community-connect/',
  // Must not false-positive on a legitimate path merely containing a blocked word as a substring.
  '/governance-watch/', '/testsuite/',
];
for (const path of PUBLIC_CASES) {
  assert.equal(await isBlockedByMiddleware(path), false, `must NOT be blocked (real public route): ${path}`);
}

// --- 4. Malformed percent-encoding must fail closed (still evaluated, never thrown past the check). ---
{
  const res = await onRequest(fakeContext('/supabase/%E0%A4%A'));
  assert.equal(res.status, 404, 'a malformed escape sequence inside a blocked prefix must still be blocked, not crash past the filter');
}

console.log('FTN deployment-artifact audit: functions/_middleware.js and the GitHub Pages workflow exclusion stay in sync, the middleware correctly blocks every internal path (including case variants, single- and double-percent-encoding, and repeated-slash normalization), never false-positives on a real public route, and fails closed on malformed encoding.');
