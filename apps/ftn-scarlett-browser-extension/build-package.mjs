// Deterministic release packaging for Scarlett. Produces a store-ready ZIP containing exactly the
// manifest-addressable files (no docs, no scratch files, no dev-only assets), plus a SHA-256
// checksum file so a release can be verified byte-for-byte later. Works without any external zip
// binary (falls back to PowerShell's Compress-Archive on Windows dev machines where `zip` isn't
// installed) so this isn't only runnable in CI.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));
const manifest = JSON.parse(fs.readFileSync(new URL('manifest.json', import.meta.url), 'utf8'));

// Every file the manifest actually references, plus the icons every entry above points at.
// Deliberately excludes README.md and any dev/QA scratch file -- the store package should contain
// only what the extension needs to run.
const files = [
  'manifest.json',
  'background.js',
  'page-understanding.js',
  'transformation-policy.js',
  'representation-engine.js',
  'deck-renderer.js',
  'entitlements.js',
  'analytics.js',
  'analytics-dashboard.html',
  'analytics-dashboard.js',
  'shield.js',
  'tracker-registry.js',
  'ibis-search-client.js',
  'content.js',
  'ibis-handoff.js',
  'popup.html',
  'popup.css',
  'popup.js',
  'icons/scarlett-16.png',
  'icons/scarlett-32.png',
  'icons/scarlett-48.png',
  'icons/scarlett-128.png',
];

for (const file of files) {
  const full = path.join(root, file);
  if (!fs.existsSync(full)) throw new Error(`Packaging manifest lists ${file}, but it does not exist on disk.`);
}

const distDir = path.join(root, 'dist');
fs.mkdirSync(distDir, { recursive: true });
const archiveName = `scarlett-by-ftn-${manifest.version}.zip`;
const archivePath = path.join(distDir, archiveName);
if (fs.existsSync(archivePath)) fs.rmSync(archivePath);

function hasCommand(cmd) {
  try { execFileSync(process.platform === 'win32' ? 'where' : 'which', [cmd], { stdio: 'ignore' }); return true; }
  catch { return false; }
}

if (hasCommand('zip')) {
  execFileSync('zip', ['-q', '-X', '-FS', archivePath, ...files], { cwd: root, stdio: 'inherit' });
} else if (process.platform === 'win32') {
  // Investor-QA fix (2026-09-20): confirmed live -- `Compress-Archive -Path f1,f2,...` with a list of
  // individual file paths flattens every file to the archive ROOT; it does not preserve the relative
  // directory each path came from. That silently produced a store ZIP whose icons/*.png files ended
  // up at the archive root instead of under icons/, while manifest.json still referenced
  // "icons/scarlett-16.png" etc. -- a real, wrong package that passed this script's own "built
  // successfully" log. Verified by extracting the previous ZIP and loading it as an unpacked
  // extension in a real Chromium via Playwright: Chrome hung during extension load rather than
  // starting, unlike the same load from the correct source tree (which registers its service worker
  // in ~2s). Fixed by staging every file into a temp directory that mirrors its manifest-relative
  // path (creating icons/ as a real subdirectory) and compressing THAT directory's contents, which
  // Compress-Archive -Path <dir>/* preserves correctly, one level of subdirectories included.
  const stageDir = path.join(distDir, `.stage-${manifest.version}`);
  fs.rmSync(stageDir, { recursive: true, force: true });
  for (const file of files) {
    const dest = path.join(stageDir, file);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(path.join(root, file), dest);
  }
  execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command',
    `Compress-Archive -Path "${stageDir}\\*" -DestinationPath "${archivePath}" -Force`
  ], { stdio: 'inherit' });
  fs.rmSync(stageDir, { recursive: true, force: true });
} else {
  throw new Error('No zip CLI found and this is not Windows (PowerShell fallback unavailable). Install `zip` to package Scarlett.');
}

const archiveBuffer = fs.readFileSync(archivePath);
const sha256 = crypto.createHash('sha256').update(archiveBuffer).digest('hex');
fs.writeFileSync(`${archivePath}.sha256`, `${sha256}  ${archiveName}\n`);

console.log(`${archivePath} built (${archiveBuffer.length} bytes, ${files.length} files).`);
console.log(`SHA-256: ${sha256}`);
