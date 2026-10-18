import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const origin = 'https://ftnplatform.org';
const image = `${origin}/assets/social/og-ftn-caribbean-ecosystem-20261018.jpg`;
function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    if (['.git', 'node_modules'].includes(entry.name)) return [];
    const path = resolve(dir, entry.name);
    return entry.isDirectory() ? walk(path) : path.endsWith('.html') ? [path] : [];
  });
}
let pages = 0;
for (const path of walk(root)) {
  const html = readFileSync(path, 'utf8');
  const head = html.split('</head>')[0];
  assert(!/<meta\b[^>]*og-ftn-platform\.jpg/i.test(head), `${path}: obsolete share image`);
  if (!head.includes(image)) continue;
  const tags = [...head.matchAll(/<meta\b[^>]*>/gi)].map(([tag]) =>
    Object.fromEntries([...tag.matchAll(/([\w:-]+)="([^"]*)"/g)].map(m => [m[1], m[2]])));
  const value = key => {
    const matches = tags.filter(tag => (tag.property || tag.name) === key);
    assert.equal(matches.length, 1, `${path}: expected one ${key}`);
    assert(matches[0].content, `${path}: empty ${key}`);
    return matches[0].content;
  };
  for (const key of ['og:title', 'og:description', 'twitter:title', 'twitter:description']) value(key);
  assert.equal(value('og:image'), image);
  assert.equal(value('og:image:secure_url'), image);
  assert.equal(value('og:image:type'), 'image/jpeg');
  assert.equal(value('og:image:width'), '1200');
  assert.equal(value('og:image:height'), '630');
  assert.equal(value('twitter:image'), image);
  assert.equal(value('twitter:card'), 'summary_large_image');
  assert.equal(value('og:image:alt'), 'FTN Platform — The Caribbean Ecosystem');
  assert.equal(value('twitter:image:alt'), 'FTN Platform — The Caribbean Ecosystem');
  const canonical = head.match(/<link\b[^>]*rel="canonical"[^>]*href="([^"]+)"/);
  assert(canonical, `${path}: canonical missing`);
  assert.equal(value('og:url'), canonical[1], `${path}: canonical/OG URL mismatch`);
  assert.equal(new URL(canonical[1]).origin, origin);
  if (path === resolve(root, 'index.html')) {
    assert.equal(value('og:title'), 'The Caribbean Ecosystem | FTN Platform');
    assert.equal(value('og:description'), value('twitter:description'));
    assert.equal(canonical[1], `${origin}/`);
  }
  pages++;
}
assert.equal(pages, 40);
const jpeg = readFileSync(resolve(root, image.slice(origin.length + 1)));
assert.equal(jpeg.readUInt16BE(0), 0xffd8);
let dimensions;
for (let p = 2; p + 9 < jpeg.length;) {
  assert.equal(jpeg[p], 0xff);
  const marker = jpeg[p + 1];
  if ([0xc0, 0xc1, 0xc2].includes(marker)) {
    dimensions = [jpeg.readUInt16BE(p + 7), jpeg.readUInt16BE(p + 5)];
    break;
  }
  p += 2 + jpeg.readUInt16BE(p + 2);
}
assert.deepEqual(dimensions, [1200, 630]);
assert(jpeg.length < 300_000, 'Share JPEG should stay small for mobile crawlers');
console.log(`${pages} server-rendered social cards pass; JPEG is 1200×630 (${jpeg.length} bytes).`);
