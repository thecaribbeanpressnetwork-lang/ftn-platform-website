import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

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
assert.equal(manifest.version, '0.1.1');
assert.match(read('popup.html'), /Do not send passwords/);
const archiveEntries = execFileSync('unzip', ['-Z1', 'dist/ftn-ibis-chrome-store-0.1.1.zip'], { cwd: new URL('.', root), encoding: 'utf8' }).trim().split(/\r?\n/).sort();
const expectedEntries = [
  'manifest.json', 'background.js', 'popup.html', 'popup.js', 'results.html',
  'results.js', 'ibis-api.js', 'styles.css', 'icons/ibis-16.png',
  'icons/ibis-32.png', 'icons/ibis-48.png', 'icons/ibis-128.png'
].sort();
assert.deepEqual(archiveEntries, expectedEntries, 'Store ZIP must preserve every manifest-addressable path and contain no stale files.');
console.log('FTN ibis browser extension: manifest, least privilege, privacy boundary, assets and extension-page CSP verified.');
