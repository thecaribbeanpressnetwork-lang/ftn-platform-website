import assert from 'node:assert/strict';
import fs from 'node:fs';

const html = fs.readFileSync('ibis-headspace-preview/index.html', 'utf8');
const preview = fs.readFileSync('js/ibis-headspace-preview.js', 'utf8');
const fabric = fs.readFileSync('js/ibis-headspace-fabric.js', 'utf8');

const fabricIndex = html.indexOf('/js/ibis-headspace-fabric.js');
const universalIndex = html.indexOf('/js/ibis-headspace-universal.js');
const previewIndex = html.indexOf('/js/ibis-headspace-preview.js');
assert(fabricIndex >= 0 && universalIndex > fabricIndex && previewIndex > universalIndex,
  'Headspace must load its fabric, universal runtime bridge, then local spatial-command handler in that order.');

const submitStart = preview.indexOf("document.getElementById('inputOrbit')?.addEventListener('submit'");
const submitSource = preview.slice(submitStart, submitStart + 320);
assert.match(submitSource, /if\(!interpret\(text\)\)return/,
  'The local spatial-command handler must release ordinary questions to universal IBIS.');
assert.doesNotMatch(submitSource, /answerFromPrompt\(text\)/,
  'Ordinary questions must not be answered by prototype copy.');
assert.match(submitSource, /,true\)/,
  'Spatial commands must be claimed during capture before the universal fallback.');
assert.match(fabric, /document\.querySelector\('script\[src\^=/,
  'Dynamic fabric loading must not duplicate the statically loaded universal bridge.');

console.log('IBIS Headspace routing: ordinary questions reach universal runtime; only spatial commands are locally intercepted.');
