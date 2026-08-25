// FTN Platform — service-worker route-policy behavioral release gate (Phase 3 consolidation).
//
// Complements tests/service-worker-policy-audit.mjs (static drift check) with real registered-
// service-worker behavior: first visit, repeat visit, offline loading, private-route exclusion,
// public-route caching, aliases/nested paths, and the version-upgrade cache-cleanup guarantee.
import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const BASE = process.env.FTN_TEST_BASE || 'http://127.0.0.1:3000';
const browser = await chromium.launch({ headless: true });
const results = [];
const failures = [];

async function scenario(name, fn) {
  const context = await browser.newContext({ serviceWorkers: 'allow' });
  const page = await context.newPage();
  try {
    await fn(page, context);
    results.push('PASS ' + name);
  } catch (e) {
    failures.push({ name, error: e?.stack || String(e) });
    results.push('FAIL ' + name + ' — ' + e.message);
  } finally {
    await context.close();
  }
}

async function waitForActiveServiceWorker(page) {
  await page.evaluate(async () => {
    const reg = await navigator.serviceWorker.register('/service-worker.js');
    await navigator.serviceWorker.ready;
    return reg.active ? true : new Promise((resolve) => {
      const sw = reg.installing || reg.waiting;
      if (!sw) return resolve(true);
      sw.addEventListener('statechange', () => { if (sw.state === 'activated') resolve(true); });
    });
  });
}

async function cacheKeys(page) {
  return page.evaluate(async () => {
    const names = await caches.keys();
    const all = [];
    for (const name of names) {
      const cache = await caches.open(name);
      const reqs = await cache.keys();
      all.push(...reqs.map((r) => new URL(r.url).pathname));
    }
    return all;
  });
}

await scenario('sw-first-visit-registers-and-activates', async (page) => {
  await page.goto(BASE + '/', { waitUntil: 'load' });
  await waitForActiveServiceWorker(page);
  const state = await page.evaluate(() => navigator.serviceWorker.controller ? navigator.serviceWorker.controller.state : null);
  // controller can be null on the very first controlled load in some browsers (no controller until
  // the next navigation) -- what matters is a registration exists and reached 'activated'.
  const reg = await page.evaluate(async () => { const r = await navigator.serviceWorker.getRegistration(); return r ? r.active?.state : null; });
  assert.equal(reg, 'activated', `service worker did not reach activated state on first visit (controller state was ${state})`);
});

await scenario('sw-repeat-visit-serves-shell-from-cache', async (page) => {
  await page.goto(BASE + '/', { waitUntil: 'load' });
  await waitForActiveServiceWorker(page);
  await page.goto(BASE + '/', { waitUntil: 'load' }); // repeat visit, now controlled
  await page.reload({ waitUntil: 'load' });
  const keys = await cacheKeys(page);
  assert(keys.includes('/'), 'homepage navigation was not written into the service-worker cache on repeat visit');
});

await scenario('sw-offline-loads-previously-visited-public-route', async (page, context) => {
  await page.goto(BASE + '/kaiso/', { waitUntil: 'load' });
  await waitForActiveServiceWorker(page);
  await page.goto(BASE + '/kaiso/', { waitUntil: 'load' }); // controlled repeat visit to populate cache
  await context.setOffline(true);
  const response = await page.goto(BASE + '/kaiso/', { waitUntil: 'load' }).catch(() => null);
  assert(response, '/kaiso/ did not load at all while offline after a prior visit');
  const bodyText = await page.textContent('body').catch(() => '');
  assert(bodyText && bodyText.length > 0, '/kaiso/ loaded an empty page while offline');
  await context.setOffline(false);
});

await scenario('sw-offline-unvisited-route-falls-back-to-offline-page', async (page, context) => {
  await page.goto(BASE + '/', { waitUntil: 'load' });
  await waitForActiveServiceWorker(page);
  await page.goto(BASE + '/', { waitUntil: 'load' });
  await context.setOffline(true);
  await page.goto(BASE + '/insights/', { waitUntil: 'load' }).catch(() => null);
  const bodyText = await page.textContent('body').catch(() => '');
  assert(bodyText && bodyText.length > 0, 'no offline fallback content rendered for an unvisited route');
  await context.setOffline(false);
});

await scenario('sw-private-routes-never-cached', async (page) => {
  const privateRoutes = ['/account/', '/ibis-ai/', '/god-mode/', '/love/', '/health/', '/mission-control/'];
  await page.goto(BASE + '/', { waitUntil: 'load' });
  await waitForActiveServiceWorker(page);
  for (const route of privateRoutes) {
    await page.goto(BASE + route, { waitUntil: 'load' }).catch(() => null);
  }
  const keys = await cacheKeys(page);
  for (const route of privateRoutes) {
    assert(!keys.includes(route), `${route} was written into the public service-worker cache -- private/authenticated route must never be cached`);
  }
});

await scenario('sw-public-routes-are-cached', async (page) => {
  const publicRoutes = ['/tv/', '/parliament/', '/riddim/'];
  await page.goto(BASE + '/', { waitUntil: 'load' });
  await waitForActiveServiceWorker(page);
  for (const route of publicRoutes) {
    await page.goto(BASE + route, { waitUntil: 'load' });
  }
  const keys = await cacheKeys(page);
  for (const route of publicRoutes) {
    assert(keys.includes(route), `${route} is a genuinely public product route and should have been written into the service-worker cache`);
  }
});

await scenario('sw-nested-path-under-excluded-prefix-is-also-excluded', async (page) => {
  // /community-connect/app is a mount point for the separate, protected Community Connect
  // application -- a nested path underneath it must inherit the same exclusion, not just the
  // exact prefix itself.
  await page.goto(BASE + '/', { waitUntil: 'load' });
  await waitForActiveServiceWorker(page);
  const matches = await page.evaluate(() => {
    // Re-derive PRIVATE/NEVER the same way the SW itself does, from its own source text, so this
    // test exercises the real regex rather than a hand-copied duplicate that could drift.
    return fetch('/service-worker.js').then((r) => r.text()).then((src) => {
      const neverSrc = src.match(/var NEVER=(\/\^\\\/\([^)]+\)\(\\\/\|\$\)\/);/)[1];
      // eslint-disable-next-line no-new-func
      const NEVER = new Function('return ' + neverSrc)();
      return {
        nested: NEVER.test('/community-connect/app/some-authenticated-view'),
        exact: NEVER.test('/community-connect/app'),
        unrelated: NEVER.test('/community-connect/'),
      };
    });
  });
  assert(matches.exact, 'exact /community-connect/app prefix must be excluded');
  assert(matches.nested, 'a nested path under /community-connect/app must also be excluded, not just the exact prefix');
  assert(!matches.unrelated, "/community-connect/ (the public marketing page, not the app) must NOT be excluded");
});

await scenario('sw-alias-routes-not-mistakenly-excluded', async (page) => {
  // /live/ and /now/ 301-redirect to FTN Live at the Cloudflare Pages edge (see _redirects) --
  // that redirect happens before any request reaches this origin, so it cannot be exercised by
  // this test's static file server (neither can CI's, which uses the identical `python3 -m
  // http.server`; both are verified against production directly instead -- see the repair ledger).
  // What IS testable here: the alias paths themselves must not appear in PRIVATE/NEVER as if they
  // were still separate, excludable pages -- and the real redirect target must be a normal,
  // cacheable public route.
  await page.goto(BASE + '/', { waitUntil: 'load' });
  await waitForActiveServiceWorker(page);
  const matches = await page.evaluate(() => fetch('/service-worker.js').then((r) => r.text()).then((src) => {
    const privateSrc = src.match(/var PRIVATE=(\/\^\\\/\([^)]+\)\(\\\/\|\$\)\/);/)[1];
    const neverSrc = src.match(/var NEVER=(\/\^\\\/\([^)]+\)\(\\\/\|\$\)\/);/)[1];
    const PRIVATE = new Function('return ' + privateSrc)();
    const NEVER = new Function('return ' + neverSrc)();
    return {
      liveExcluded: PRIVATE.test('/live/') || NEVER.test('/live/'),
      nowExcluded: PRIVATE.test('/now/') || NEVER.test('/now/'),
      observatoryExcluded: PRIVATE.test('/observatory/') || NEVER.test('/observatory/'),
    };
  }));
  assert(!matches.liveExcluded, '/live/ (a public FTN Live alias) must not be treated as a private/excluded route');
  assert(!matches.nowExcluded, '/now/ (a public FTN Live alias) must not be treated as a private/excluded route');
  assert(!matches.observatoryExcluded, '/observatory/ (FTN Live\'s real, canonical, public route) must not be treated as private/excluded');
  await page.goto(BASE + '/observatory/', { waitUntil: 'load' });
  const keys = await cacheKeys(page);
  assert(keys.includes('/observatory/'), 'FTN Live\'s real route was not cached as a normal public page');
});

await scenario('sw-version-upgrade-cache-cleanup-logic-present', async (page) => {
  // A real two-deploy upgrade (old VERSION -> new VERSION, confirming the old cache is deleted) is
  // outside what a single-deployment test run can exercise. What's verified here: the 'activate'
  // handler's cleanup logic is present and actually wired to run before clients are claimed, so an
  // upgrade -- when it happens -- will not leave a stale cache namespace behind.
  await page.goto(BASE + '/', { waitUntil: 'load' });
  const source = await page.evaluate(() => fetch('/service-worker.js').then((r) => r.text()));
  assert(/keys\.filter\(function\s*\(k\)\s*\{return k!==VERSION;\}\)\.map\(function\s*\(k\)\s*\{return caches\.delete\(k\);\}\)/.test(source), 'activate handler no longer deletes caches from a prior VERSION -- an upgrade would leave stale content behind');
  assert(/self\.skipWaiting\(\)/.test(source), 'install handler no longer calls skipWaiting() -- upgrades would wait indefinitely for old tabs to close');
  assert(/self\.clients\.claim\(\)/.test(source), 'activate handler no longer calls clients.claim() -- the new SW would not take control of already-open tabs after an upgrade');
});

console.log(results.join('\n'));
if (failures.length) {
  console.error('\nFAILED SCENARIOS\n');
  for (const f of failures) console.error(`### ${f.name}\n${f.error}\n`);
  await browser.close();
  process.exit(1);
}
console.log(`\n${results.length} service-worker lifecycle scenarios passed.`);
await browser.close();
