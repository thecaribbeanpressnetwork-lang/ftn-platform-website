import assert from 'node:assert/strict';
import fs from 'node:fs';

const root = new URL('.', import.meta.url);
const read = (name) => fs.readFileSync(new URL(name, root), 'utf8');
const manifest = JSON.parse(read('manifest.json'));

assert.equal(manifest.manifest_version, 3);
assert.equal(manifest.name, 'FTN ibis — Caribbean Intelligence');
assert.deepEqual(manifest.permissions, ['contextMenus']);
assert.equal(manifest.host_permissions.length, 1);
assert.match(manifest.host_permissions[0], /^https:\/\/jshmidfpqrajxtukzges\.supabase\.co\/functions\/v1\/ftn-ibis-mcp$/);
assert.doesNotMatch(JSON.stringify(manifest), /<all_urls>|webRequest|cookies|history|geolocation/);
assert.doesNotMatch(read('background.js'), /executeScript|scripting/);
assert.doesNotMatch(read('ibis-api.js'), /localStorage|chrome\.storage|document\.cookie/);
for (const size of [16, 32, 48, 128]) {
  assert.ok(fs.statSync(new URL('icons/ibis-' + size + '.png', root)).size > 100);
}
for (const file of ['popup.html', 'results.html']) {
  const html = read(file);
  assert.doesNotMatch(html, /<script(?![^>]*src=)/);
  assert.match(html, /FTN ibis/);
}
console.log('FTN ibis browser extension: manifest, least privilege, privacy boundary, assets and extension-page CSP verified.');
