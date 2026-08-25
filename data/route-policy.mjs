// FTN Platform — canonical route-policy config for NON-PRODUCT routes.
//
// Phase 3 service-worker route-policy consolidation (see GOVERNANCE/FTN_Repair_Ledger_2026-08-24.md).
// service-worker.js excludes two kinds of route from its public cache:
//   1. Registered FTN products whose own registry metadata already says "not public" or "has an
//      authenticated/personalized surface" (js/product-registry-data.js: publicVisibility===false,
//      status PRIVATE/VAULTED, or authRequirement !== 'guest') -- generated directly from the
//      registry, not listed here. See scripts/sync-service-worker.mjs.
//   2. Everything in this file: a route the SW must never cache that is NOT a registered product --
//      an account/auth infrastructure path, a founder-only administrative console, or a mount point
//      for a genuinely separate application. Forcing these into the Product Registry just to avoid
//      a second list would be wrong (CLAUDE.md: never modify or claim ownership of Community
//      Connect's own application; god-mode is deliberately not a public product with a
//      primaryJourney/dataSources/etc) -- this is the "smallest appropriate canonical source" for
//      that other, genuinely different kind of route instead.
//
// *** THIS IS NOT A SECURITY BOUNDARY. *** A route missing from every list below is still not
// authorized to serve or accept privileged data merely because the service worker doesn't know
// about it -- the service worker only controls this browser's local HTTP cache. Real authorization
// happens server-side: Supabase Row Level Security, RPC/Edge Function checks, and (for
// god-mode/mission-control) their own session verification. See .claude/context/security-ops.md.
// This file (and its generated output in service-worker.js) can be read, be wrong, or be bypassed
// entirely by a client that ignores the service worker altogether -- it exists to keep private
// responses out of the *cache*, not to keep anyone out of the *route*.
//
// match: 'prefix' -- path === entry, or path starts with entry + '/' (same semantics as the
//   product-route PRIVATE regex this file's entries are combined with).
export const ACCOUNT_AUTH_ROUTES = [
  { path: '/auth', match: 'prefix', reason: 'Supabase Auth redirect/callback flow (magic link, OAuth code exchange) -- session-bearing, must never enter the public cache. Not itself a page; see FTN Account (account/index.html) for the one OAuth-callback owner, per security-ops.md.' },
];

export const ADMIN_ROUTES = [
  { path: '/god-mode', match: 'prefix', reason: 'Founder-only operational console. Deliberately absent from the Product Registry (not a public product with a primaryJourney/dataSources/etc) -- excluded here instead of forcing a registry entry that would misrepresent it as a public product.' },
];

// Routes belonging to a genuinely separate application this repo does not own. CLAUDE.md: "Never
// modify Community Connect or Mission Control source code, move files inside either application,
// or rename their assets -- both are separate applications/repositories." Mission Control DOES have
// a Product Registry entry (status PRIVATE) since it is represented as a product on this site;
// Community Connect's protected app mount point is not a page this repo serves at all, so it has no
// registry entry and belongs here instead.
export const OTHER_APPLICATION_ROUTES = [
  { path: '/community-connect/app', match: 'prefix', reason: 'Mount path for the separate, protected Community Connect application (its own repo/deployment, not this one). This repo never modifies that application\'s source -- but this service worker still must never cache its authenticated responses.' },
];

// Caching-only exclusions: not tied to any specific product, account state or admin capability --
// just "this kind of response is never safe to serve from a stale cache."
export const CACHING_ONLY_ROUTES = [
  { path: '/api', match: 'prefix', reason: 'Reserved API namespace for any future FTN API endpoint -- API responses are dynamic and must never be served stale.' },
  // Enforced by its OWN line in service-worker.js's fetch handler (a `.test(url.pathname)` contains
  // check anywhere in the path, not a leading-prefix match like every other entry here), not by the
  // generated PRIVATE/NEVER regex -- documented here for the classification record regardless, per
  // the instruction to inspect and classify every existing exclusion, not just the regex-driven
  // ones. scripts/sync-service-worker.mjs's --check mode verifies this literal line is still present
  // rather than silently trusting this comment.
  { path: '/functions/v1/', match: 'contains', reason: 'Supabase Edge Function invocations -- dynamic, per-request, never cacheable. Enforced separately (see comment above), not generated into the PRIVATE/NEVER regex.' },
];

// Obsolete aliases: a route that used to need SW exclusion but no longer does (e.g. because it now
// 301s away before the SW's fetch handler would ever see it as a distinct response, or the feature
// it protected was removed). Empty is the correct, verified state as of this pass -- inspected every
// entry in the PRIVATE/NEVER regexes and found none obsolete (see the repair ledger for the
// classification of every entry, including this empty category). Left here, not deleted, so a
// future obsolete entry has an obvious place to go without re-deriving the six-category taxonomy.
export const OBSOLETE_ALIASES = [];
