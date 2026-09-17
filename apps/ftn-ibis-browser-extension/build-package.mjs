import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));
const manifest = JSON.parse(fs.readFileSync(new URL('manifest.json', import.meta.url), 'utf8'));
const archive = `dist/ftn-ibis-chrome-store-${manifest.version}.zip`;
const files = [
  'manifest.json', 'background.js', 'popup.html', 'popup.js', 'results.html',
  'results.js', 'ibis-api.js', 'styles.css', 'icons/ibis-16.png',
  'icons/ibis-32.png', 'icons/ibis-48.png', 'icons/ibis-128.png'
];

fs.mkdirSync(new URL('dist/', import.meta.url), { recursive: true });
execFileSync('zip', ['-q', '-FS', archive, ...files], { cwd: root, stdio: 'inherit' });
console.log(`${archive} rebuilt with ${files.length} manifest-addressable files.`);
