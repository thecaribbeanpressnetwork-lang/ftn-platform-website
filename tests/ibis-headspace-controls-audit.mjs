import assert from 'node:assert/strict';
import fs from 'node:fs';

const html = fs.readFileSync('ibis-headspace-preview/index.html','utf8');
const themes = fs.readFileSync('js/ibis-country-themes.js','utf8');
const speech = fs.readFileSync('js/ibis-headspace-speech.js','utf8');
const manager = fs.readFileSync('js/ibis-headspace-window-manager.js','utf8');
const publicBootstrap = fs.readFileSync('js/ibis-query-bootstrap.js','utf8');
const publicHtml = fs.readFileSync('ibis-ai/index.html','utf8');

for (const id of ['speakAnswer','speechPause','speechRewind','speechSpeed','speechNext']) assert.match(html, new RegExp(`id="${id}"`), `Missing speech control ${id}`);
assert.match(html, /ibis-headspace-speech\.js/);
for (const operation of ['speechSynthesis','.pause(','.resume(','move(-1)','move(1)','utterance.rate']) assert.ok(speech.includes(operation), `Missing speech operation ${operation}`);
for (const action of ['place','snapNode','minimize','restore','tile','stack']) assert.match(manager, new RegExp(`function ${action}\\b`));
for (const code of ['TT','JM','BB','GY','LC','VE']) assert.match(themes, new RegExp(`${code}: \\{`));
assert.match(themes, /VE:.*primary: '#f2c94c'.*secondary: '#1f5ca8'.*tertiary: '#d71920'/);
assert.match(themes, /GY:.*secondary: '#2f8f48'.*tertiary: '#d71920'.*ink: '#08090b'.*muted: '#ffffff'/);
assert.match(themes, /ibis-native.*primary: '#55d6d0'.*secondary: '#ef5b4f'.*tertiary: '#f7f8fa'/);

// Regression gate: the public compatibility workspace must not make Headspace disappear again.
assert.match(publicHtml, /ibis-query-bootstrap\.js/,'Public ibis workspace must load the recovery entry bootstrap.');
assert.match(publicBootstrap, /data-ibis-headspace-entry/,'Public ibis workspace must expose a visible Headspace entry.');
assert.match(publicBootstrap, /href="\/ibis-headspace-preview\/"/,'Public Headspace entry must target the connected Headspace route.');
assert.match(publicBootstrap, /recovery preview/i,'Until browser acceptance passes, the public entry must preserve the preview truth boundary.');

console.log('ibis Headspace source audit: window arrangements, minimize/restore, six country themes, isolated five-action speech controls and public recovery entry verified.');
