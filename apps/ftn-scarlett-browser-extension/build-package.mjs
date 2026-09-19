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
  // Compress-Archive is part of every Windows PowerShell install -- no extra tooling needed on a
  // founder's own machine.
  const fileArgs = files.map((f) => `"${path.join(root, f)}"`).join(',');
  execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command',
    `Compress-Archive -Path ${fileArgs} -DestinationPath "${archivePath}" -Force`
  ], { stdio: 'inherit' });
} else {
  throw new Error('No zip CLI found and this is not Windows (PowerShell fallback unavailable). Install `zip` to package Scarlett.');
}

const archiveBuffer = fs.readFileSync(archivePath);
const sha256 = crypto.createHash('sha256').update(archiveBuffer).digest('hex');
fs.writeFileSync(`${archivePath}.sha256`, `${sha256}  ${archiveName}\n`);

console.log(`${archivePath} built (${archiveBuffer.length} bytes, ${files.length} files).`);
console.log(`SHA-256: ${sha256}`);
