import assert from 'node:assert/strict';
import fs from 'node:fs';

const html = fs.readFileSync('ibis-ai/index.html', 'utf8');
const css = fs.readFileSync('css/components/ibis-investor-landing.css', 'utf8');
const workspaceCss = fs.readFileSync('css/components/ibis-ai.css', 'utf8');
const workspaceJs = fs.readFileSync('js/ibis-ai-workspace.js', 'utf8');
const widgetJs = fs.readFileSync('js/ibis-widget.js', 'utf8');

assert.match(html, /aria-label="IBIS workspace"/);
assert.match(html, />IBIS workspace</);
assert.doesNotMatch(html, /investor demo/i);
assert.doesNotMatch(html, /legacy \/ibis-ai/i);
assert.match(css, /#workspace-root\{min-height:640px/);
assert.match(css, /#workspace-root \.workspace__content\{width:100%;padding:0/);
assert.match(css, /#workspace-root \.workspace__header/);
assert.match(css, /#workspace-root \.workspace__footer/);
assert.match(workspaceCss, /\.ibis-chat\{[^}]*height:min\(76vh,820px\);min-height:640px/);
assert.match(workspaceCss, /\.ibis-mode-row button\{min-height:44px/);
assert.match(workspaceJs, /data-ftn-no-draft="true"/);
assert.match(workspaceJs, /function revealAnswer\(out\)/);
assert.match(workspaceJs, /replace\(\/\\\*\\\*\(\[\^\*\]\+\)\\\*\\\*\/g,'<strong>\$1<\/strong>'\)/);
// Count history: 5 -> 4 (removed the client-side quickLooksLikeLiveRequest() freshness shortcut
// and its own revealAnswer(out) call site) -> 5 again (the Slice 1 architecture correction added a
// new render path for the canonical server's own answer, used whenever the server does not
// authorize/local execution does not apply -- a genuinely new call site, not a reversion).
assert.equal((workspaceJs.match(/revealAnswer\(out\);/g) || []).length, 5);
assert.doesNotMatch(workspaceJs, /function quickLooksLikeLiveRequest/, 'the freshness pre-filter function must not exist -- the browser must never decide a question is too current for canonical orchestration');
assert.doesNotMatch(workspaceJs, /if\(quickLooksLikeLiveRequest/, 'nothing may call the freshness pre-filter as a bypass gate');
assert.ok(widgetJs.includes("if (/^\\/ibis-ai\\/?$/.test(global.location.pathname)) return;"));

console.log('IBIS UX release: full workspace, answer reveal, safe inline formatting, touch targets and public copy verified.');
