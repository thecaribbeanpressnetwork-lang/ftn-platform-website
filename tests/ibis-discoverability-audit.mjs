import fs from 'node:fs';
import assert from 'node:assert/strict';

const page = fs.readFileSync('ibis/index.html', 'utf8');
const map = fs.readFileSync('ibis/ecosystem-map/index.html', 'utf8');
const machine = JSON.parse(fs.readFileSync('ibis/ibis.json', 'utf8'));
const proof = JSON.parse(fs.readFileSync('docs/ibis-public-proof-manifest.json', 'utf8'));
const sitemap = fs.readFileSync('sitemap.xml', 'utf8');
const llms = fs.readFileSync('llms.txt', 'utf8');

assert.match(page, /rel="canonical" href="https:\/\/ftnplatform\.org\/ibis\//);
assert.doesNotMatch(page, /noindex|nofollow/);
assert.match(page, /application\/ld\+json/);
assert.match(page, /facethenationtt@gmail\.com/);
assert.match(page, /ecosystem-map/);
assert.match(map, /Transparency notice/);
assert.match(map, /no relationship with them/i);
assert.match(map, /Digital Science/);
assert.match(map, /Caribbean Development Bank/);
assert.equal(machine.founder, 'Ricardo Gill');
assert.equal(proof.publisher.founder, 'Ricardo Gill');
assert.match(sitemap, /https:\/\/ftnplatform\.org\/ibis\//);
assert.match(sitemap, /https:\/\/ftnplatform\.org\/ibis\/ecosystem-map\//);
assert.match(llms, /https:\/\/ftnplatform\.org\/ibis\/ibis\.json/);

console.log('ibis discoverability audit: public indexability, structured identity, transparent ecosystem references, machine records, contact path and sitemap signals verified.');
