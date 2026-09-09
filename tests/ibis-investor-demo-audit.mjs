import assert from 'node:assert/strict';
import fs from 'node:fs';

const html=fs.readFileSync('ibis-preview/index.html','utf8');
const js=fs.readFileSync('js/ibis-preview.js','utf8');
assert.match(html,/Give ibis a problem, opportunity, product, song, document or goal\./);
for(const demo of ['Complex decision','Caribbean funding','Product to business']) assert.match(html,new RegExp(`>${demo}<`));
assert.match(html,/id="capabilityStatus"/);
for(const status of ['LIVE','ENABLED','SOURCE_READY','CANDIDATE','DISCOVERY','BLOCKED']) assert.match(js,new RegExp(`'${status}'`));
assert.match(js,/ibis-capability-registry\.json/);
assert.doesNotMatch(html,/product.+workflow.+live/i,'The source-ready product workflow must not be misrepresented as live.');
console.log('ibis investor demo source audit: controlling invitation, three demo starters and registry-driven release-truth view verified.');
