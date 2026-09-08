import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const root = process.cwd();
const files = [
  'ibis/index.html',
  'ibis/ibis.json',
  'ibis/feed.xml',
  'ibis/ecosystem-map/index.html',
  'llms.txt',
  'assets/ibis/ibis-mark.svg',
  'assets/ibis/ibis-wordmark.svg',
  'docs/ibis-public-proof-manifest.json',
  'GOVERNANCE/IBIS_BRAND_IDENTITY_AND_NAME_PROTECTION.md',
  'GOVERNANCE/IBIS_FOUNDER_OWNERSHIP_AND_IP_DECLARATION.md',
  'GOVERNANCE/IBIS_DISCOVERABILITY_AND_FUNDING_DOSSIER.md',
  'GOVERNANCE/FTN_PROVENANCE_WATERMARK_AND_ALERTING_STANDARD.md'
];

const assets = files.map((relativePath) => {
  const absolutePath = path.join(root, relativePath);
  const bytes = fs.readFileSync(absolutePath);
  return {
    path: relativePath,
    bytes: bytes.byteLength,
    sha256: crypto.createHash('sha256').update(bytes).digest('hex')
  };
});

const manifest = {
  schema: 'ftn.provenance-manifest/v1',
  project: 'FTN ibis',
  shortName: 'ibis',
  steward: 'Ricardo Gill',
  canonicalUrl: 'https://ftnplatform.org/ibis/',
  generatedAt: new Date().toISOString(),
  releaseCommit: process.env.GIT_COMMIT || null,
  hashAlgorithm: 'SHA-256',
  signing: { status: 'unsigned', note: 'Sign outside the public repository before a formal release.' },
  assets
};

const output = path.join(root, 'docs/ibis-provenance-manifest.json');
fs.writeFileSync(output, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Wrote ${output} (${assets.length} assets)`);
