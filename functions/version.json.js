// Root cause: the custom domain (ftnplatform.org) is served by Cloudflare Pages, a completely
// separate deploy pipeline from GitHub Pages. GitHub Pages gets a freshly-generated version.json
// baked in by .github/workflows/static-pages.yml at CI build time -- but that workflow's runner
// never touches Cloudflare's deployment, which deploys the raw committed files as-is (no build
// command is configured, matching this repo's "no build step" doctrine). So the custom domain was
// always serving the static, all-zero placeholder committed at version.json, regardless of which
// commit was actually live.
//
// Fix: intercept /version.json with a Pages Function (Functions take precedence over the static
// file of the same name by default) and answer from Cloudflare's own system environment variables,
// which are populated per-deployment and therefore always describe what Cloudflare itself actually
// deployed -- no CI step, no manual hardcoding, self-updating on every push.
export async function onRequestGet(context) {
  const sha = context.env.CF_PAGES_COMMIT_SHA || null;
  const branch = context.env.CF_PAGES_BRANCH || null;

  let builtAt = null;
  if (sha) {
    // The commit's own committer date is a real, verifiable timestamp -- not a guess -- and it
    // never changes for a given SHA, so caching it indefinitely per-SHA costs at most one GitHub
    // API call per deployment, not per request (unauthenticated GitHub API is rate-limited per
    // source IP, and this endpoint must stay correct under real traffic).
    const cacheKey = new Request(`https://cache.internal/version-builtat/${sha}`);
    const cache = caches.default;
    let cached = await cache.match(cacheKey);
    if (cached) {
      builtAt = await cached.text();
    } else {
      try {
        const res = await fetch(
          `https://api.github.com/repos/thecaribbeanpressnetwork-lang/ftn-platform-website/commits/${sha}`,
          { headers: { 'User-Agent': 'ftn-platform-version-endpoint', Accept: 'application/vnd.github+json' } }
        );
        if (res.ok) {
          const data = await res.json();
          builtAt = data?.commit?.committer?.date || data?.commit?.author?.date || null;
          if (builtAt) {
            context.waitUntil(
              cache.put(cacheKey, new Response(builtAt, { headers: { 'cache-control': 'max-age=2592000' } }))
            );
          }
        }
      } catch {
        // Honest degradation -- no fabricated timestamp if GitHub is unreachable.
        builtAt = null;
      }
    }
  }

  const body = {
    product: 'FTN Platform',
    commit: sha,
    shortCommit: sha ? sha.slice(0, 7) : null,
    builtAt,
    environment: sha ? (branch === 'main' ? 'production' : 'preview') : 'unknown',
  };

  return new Response(JSON.stringify(body, null, 2) + '\n', {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'access-control-allow-origin': '*',
    },
  });
}
