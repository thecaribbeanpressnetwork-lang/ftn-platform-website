import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const root = new URL('.', import.meta.url);
const read = (name) => fs.readFileSync(new URL(name, root), 'utf8');
const manifest = JSON.parse(read('manifest.json'));
const popup = read('popup.js');
const api = read('ibis-api.js');
const browserContextFunction = fs.readFileSync(new URL('../../supabase/functions/ibis-browser-context/index.ts', root), 'utf8');

assert.equal(manifest.manifest_version, 3);
assert.equal(manifest.name, 'FTN ibis — Caribbean Intelligence');
assert.equal(manifest.version, '0.2.1');
assert.deepEqual([...manifest.permissions].sort(), ['activeTab', 'contextMenus', 'scripting'].sort());
assert.equal(manifest.host_permissions.length, 2);
assert(manifest.host_permissions.includes('https://jshmidfpqrajxtukzges.supabase.co/functions/v1/ftn-ibis-mcp'));
assert(manifest.host_permissions.includes('https://jshmidfpqrajxtukzges.supabase.co/functions/v1/ibis-browser-context'));
for (const forbidden of ['<all_urls>', 'webRequest', 'cookies', 'history', 'geolocation', 'tabs']) {
  assert(!manifest.permissions.includes(forbidden), `Extension must not request ${forbidden}`);
}
assert(manifest.host_permissions.every((value) => value.startsWith('https://jshmidfpqrajxtukzges.supabase.co/functions/v1/')));
assert.match(popup, /chrome\.scripting\.executeScript/);
assert.match(popup, /#include-browser-search/);
assert.match(popup, /google\.|bing\.com|duckduckgo\.com/);
assert.match(popup, /captureMode:\s*'USER_BROWSER'/);
assert.match(popup, /results\.length\s*>=\s*10/);
assert.doesNotMatch(popup, /document\.cookie|chrome\.cookies|chrome\.history|localStorage/);

// Independent live audit finding (confirmed against real bing.com, 2026-09-17): every Bing organic
// result anchor is wrapped in a https://www.bing.com/ck/a?...&u=a1<base64url>&... click-tracking
// redirect. Before this fix, popup.js's normalizedDestination() treated ANY bing.com-hosted URL as
// internal and discarded it -- Bing capture returned zero results in live testing, not merely
// degraded snippets. This decodes the real destination the same way Google's /url and DuckDuckGo's
// uddg wrappers are already unwrapped.
assert.match(popup, /function decodeBingRedirect/, 'popup.js must decode Bing\'s /ck/a click-tracking redirect');
{
  const start = popup.indexOf('function decodeBingRedirect');
  const end = popup.indexOf('function normalizedDestination');
  assert.ok(start > -1 && end > start, 'decodeBingRedirect() body must be extractable');
  const body = popup.slice(start, end).trim().replace(/;\s*$/, '');
  const decodeBingRedirect = new Function('atob', `return (${body.replace('function decodeBingRedirect', 'function')})`)(
    (s) => Buffer.from(s, 'base64').toString('binary'),
  );
  const real = 'a1aHR0cHM6Ly90cmluaWRhZGV4cHJlc3MuY29tL2J1c2luZXNzLw';
  assert.equal(decodeBingRedirect(real), 'https://trinidadexpress.com/business/', 'must decode a real, live-captured Bing redirect to its actual destination');
  assert.equal(decodeBingRedirect('notprefixed'), null, 'a param without the a1 prefix must not be treated as a Bing redirect');
  assert.equal(decodeBingRedirect(null), null, 'a missing u param must not throw');
}
assert.doesNotMatch(api, /localStorage|chrome\.storage|document\.cookie/);
assert.match(api, /ibis-browser-context/);
assert.match(browserContextFunction, /USER_PROVIDED_WEB_CONTEXT/);
assert.match(browserContextFunction, /SEARCH SNIPPET ONLY/);
assert.match(browserContextFunction, /You are ibis, FTN Platform's intelligent Caribbean CEO\/research assistant\. You are not a search engine\./);
assert.match(browserContextFunction, /url\.username = ""/);
assert.match(browserContextFunction, /url\.password = ""/);
assert.match(browserContextFunction, /results\.length >= 10/);
assert.doesNotMatch(browserContextFunction, /document\.cookie/);

for (const size of [16, 32, 48, 128]) {
  assert.ok(fs.statSync(new URL('icons/ibis-' + size + '.png', root)).size > 100);
}
for (const file of ['popup.html', 'results.html']) {
  const html = read(file);
  assert.doesNotMatch(html, /<script(?![^>]*src=)/);
  assert.match(html, /FTN ibis/);
}
assert.match(read('popup.html'), /Do not send passwords|never your Google cookies/i);
assert.match(read('popup.html'), /Include browser search/);

execFileSync(process.execPath, ['build-package.mjs'], { cwd: new URL('.', root), stdio: 'inherit' });
const archive = `dist/ftn-ibis-chrome-store-${manifest.version}.zip`;
const archiveEntries = execFileSync('unzip', ['-Z1', archive], { cwd: new URL('.', root), encoding: 'utf8' }).trim().split(/\r?\n/).sort();
const expectedEntries = [
  'manifest.json', 'background.js', 'popup.html', 'popup.js', 'results.html',
  'results.js', 'ibis-api.js', 'styles.css', 'icons/ibis-16.png',
  'icons/ibis-32.png', 'icons/ibis-48.png', 'icons/ibis-128.png'
].sort();
assert.deepEqual(archiveEntries, expectedEntries, 'Store ZIP must preserve every manifest-addressable path and contain no stale files.');
console.log('FTN ibis browser extension: explicit active-tab search capture, privacy boundary, snippet provenance and v0.2.0 packaging verified.');
