// FTN Platform -- regression guard for the source-link scheme-validation correction.
//
// Independent security audit finding: js/ibis-ai-workspace.js's canonicalSourceCardHTML()/
// sourceCardHTML()/canonicalAlternativesHTML() and js/ibis-headspace-universal.js's
// renderSourcesAndAlternatives() all put a search result's `url` directly into an anchor's href
// with no scheme check. A javascript:/data: URL would be clickable and would EXECUTE in the page
// when clicked -- target="_blank"/rel="noopener noreferrer" do not stop a non-http(s) href from
// running in the current document. The server now filters non-https source URLs before they reach
// either file (see supabase/functions/_shared/ibis-canonical-brain.test.ts's own regression test
// for that), but this is the second, independent check at the actual DOM-insertion point in each
// browser file -- this test proves that check exists and behaves correctly on its own.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

function repoPath(rel) { return fileURLToPath(new URL('../' + rel, import.meta.url)); }

function extractSafeHref(sourcePath) {
  const source = fs.readFileSync(sourcePath, 'utf8');
  const match = source.match(/function safeHref\(url\)\{.*\}/);
  assert.ok(match, `safeHref() must exist in ${sourcePath}`);
  // eslint-disable-next-line no-new-func
  return new Function(`return (${match[0].replace('function safeHref', 'function')})`)();
}

for (const file of ['js/ibis-ai-workspace.js', 'js/ibis-headspace-universal.js']) {
  const safeHref = extractSafeHref(repoPath(file));
  assert.equal(safeHref('https://www.trinidadexpress.com/story'), 'https://www.trinidadexpress.com/story', `${file}: a genuine https URL must pass through unchanged`);
  assert.equal(safeHref('javascript:alert(document.cookie)'), '#', `${file}: a javascript: URL must never reach an href`);
  assert.equal(safeHref('data:text/html,<script>alert(1)</script>'), '#', `${file}: a data: URL must never reach an href`);
  assert.equal(safeHref('vbscript:msgbox(1)'), '#', `${file}: a vbscript: URL must never reach an href`);
  assert.equal(safeHref(''), '#', `${file}: an empty URL must fall back safely`);
  assert.equal(safeHref(undefined), '#', `${file}: a missing URL must fall back safely, not throw`);
  assert.equal(safeHref('http://insecure.example/story'), '#', `${file}: a plain http (non-https) URL is also rejected -- https-only, matching the server-side filter`);
}

// Both files must actually CALL safeHref() at every source-derived href site, not merely define it
// unused -- a text-pattern check on top of the behavioral one above, guarding against the fix being
// defined but not wired in.
for (const file of ['js/ibis-ai-workspace.js', 'js/ibis-headspace-universal.js']) {
  const source = fs.readFileSync(repoPath(file), 'utf8');
  const callSites = (source.match(/safeHref\(/g) || []).length - 1; // -1 for the definition itself
  assert.ok(callSites >= 2, `${file}: safeHref() must be called at multiple source-link render sites (sources and alternatives), found ${callSites}`);
}

console.log('ibis-source-href-scheme-audit: both ibis-ai-workspace.js and ibis-headspace-universal.js reject a non-https source URL at the actual DOM-insertion point, independent of the server-side filter.');
