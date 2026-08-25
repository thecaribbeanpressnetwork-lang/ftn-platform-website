// FTN Platform — internal-path deployment-artifact block (2026-08-25, Supabase security audit
// follow-up). Cloudflare Pages Functions run ahead of static asset serving by default on this
// project (already relied on by functions/version.json.js) -- this is the real build-time
// equivalent the audit asked for: no build step exists for this repo (Cloudflare Pages deploys the
// raw committed tree as-is, per functions/version.json.js's own header comment), so nothing here
// can be excluded from the deployed artifact itself. A request-time Function that runs before
// static-asset resolution is the correct substitute, and is strictly stronger than the prior
// `_redirects` rules: it is not limited to _redirects' glob syntax or its supported-status-code
// quirks (see the 2026-08-25 `_redirects` fix this pass preserves as defense in depth), and it
// normalizes case and percent-encoding itself instead of relying on the CDN's own path matching.
//
// Scope: every one of these paths is a real, currently-tracked, non-public engineering artifact
// with zero legitimate public consumer (verified by grepping for inbound links from any shipped
// HTML/JS before adding it here) -- not a guess. supabase/ (schema, migrations, Edge Function
// source), GOVERNANCE/ and the internal top-level engineering docs (CLAUDE.md itself,
// IBIS-MAP.md, FTN-NODES.md, CARIBBEAN-LEDGER.md, SCOUT-INTELLIGENCE-LEDGER.md,
// ANALYTICS_STANDARD.md, VERSION.md, RELEASE_NOTES_*.md, design-qa.md), tests/, scripts/,
// .claude/, .github/, 00_Phase1_Discovery/, dj-tube-prototype/ (a superseded, unlinked legacy
// prototype -- the canonical DJ Tube product is /riddim/dj/), docs/, FTN_Master_Asset_Library_v1.0/
// (CLAUDE.md's own standing rule: "reference boards -- never edited, never linked live"), and
// .mcp.json (a local MCP connection config, not shipped site content).
const BLOCKED_PREFIXES = [
  '/supabase', '/governance', '/tests', '/scripts', '/.claude', '/.github',
  '/00_phase1_discovery', '/dj-tube-prototype', '/docs', '/ftn_master_asset_library_v1.0',
  '/claude.md', '/ibis-map.md', '/ftn-nodes.md', '/caribbean-ledger.md',
  '/scout-intelligence-ledger.md', '/analytics_standard.md', '/version.md',
  '/design-qa.md', '/.mcp.json', '/release_notes_ftn_surface_repair_2026-08-19.md',
  '/release_notes_ftn_surface_system_2026-08-19.md', '/release_notes_v1.0.md',
  '/release_notes_v1.4.md', '/release_notes_v1.5.md',
];

function normalizedPathname(rawUrl) {
  let pathname = new URL(rawUrl).pathname;
  // Decode repeatedly (bounded) so a double/triple-percent-encoded segment (e.g. "%252F" ->
  // "%2F" -> "/") cannot slip past a single decode pass -- a real, tested bypass class for
  // naive path filters, not a theoretical one.
  for (let i = 0; i < 3; i++) {
    let decoded;
    try {
      decoded = decodeURIComponent(pathname);
    } catch {
      break; // malformed escape -- stop decoding, match on what we have (fail toward blocking, not past it)
    }
    if (decoded === pathname) break;
    pathname = decoded;
  }
  return pathname.toLowerCase().replace(/\/{2,}/g, '/');
}

function isBlocked(pathname) {
  return BLOCKED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(prefix + '/'));
}

export async function onRequest(context) {
  const pathname = normalizedPathname(context.request.url);
  if (isBlocked(pathname)) {
    return new Response('Not Found', {
      status: 404,
      headers: { 'content-type': 'text/plain; charset=utf-8', 'x-robots-tag': 'noindex' },
    });
  }
  return context.next();
}
