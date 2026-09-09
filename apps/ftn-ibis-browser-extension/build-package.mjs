import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));
const archive = 'dist/ftn-ibis-chrome-store-0.1.1.zip';
const files = [
  'manifest.json', 'background.js', 'popup.html', 'popup.js', 'results.html',
  'results.js', 'ibis-api.js', 'styles.css', 'icons/ibis-16.png',
  'icons/ibis-32.png', 'icons/ibis-48.png', 'icons/ibis-128.png'
];

execFileSync('zip', ['-q', '-FS', archive, ...files], { cwd: root, stdio: 'inherit' });
console.log(`${archive} rebuilt with ${files.length} manifest-addressable files.`);
