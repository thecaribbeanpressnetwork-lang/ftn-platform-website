import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const excluded = new Set([".git", "node_modules"]);
const htmlFiles = [];
const jsFiles = [];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (excluded.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.name.endsWith(".html")) htmlFiles.push(full);
    else if (entry.name.endsWith(".js")) jsFiles.push(full);
  }
}
walk(root);

const allowedScriptOrigins = new Set([
  "https://cdn.jsdelivr.net",
  "https://static.cloudflareinsights.com",
]);
const failures = [];
const inlineExecutable = [];
const externalScripts = new Set();

for (const file of htmlFiles) {
  const text = fs.readFileSync(file, "utf8");
  const scripts = text.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi);
  for (const match of scripts) {
    const attrs = match[1] || "";
    const body = (match[2] || "").trim();
    const src = attrs.match(/\bsrc\s*=\s*["']([^"']+)["']/i)?.[1];
    const type = (attrs.match(/\btype\s*=\s*["']([^"']+)["']/i)?.[1] || "").toLowerCase();
    if (src) {
      if (/^http:\/\//i.test(src)) failures.push(`${path.relative(root, file)} uses insecure script ${src}`);
      if (/^https:\/\//i.test(src)) {
        const url = new URL(src);
        externalScripts.add(src);
        if (!allowedScriptOrigins.has(url.origin)) {
          failures.push(`${path.relative(root, file)} uses unapproved script origin ${url.origin}`);
        }
      }
      if (src.includes("cdn.jsdelivr.net/npm/@supabase/supabase-js") &&
          !src.includes("@2.112.2/dist/umd/supabase.min.js")) {
        failures.push(`${path.relative(root, file)} uses an unpinned Supabase browser bundle`);
      }
      continue;
    }
    if (body && !["application/ld+json", "application/json", "importmap"].includes(type)) {
      inlineExecutable.push(path.relative(root, file));
    }
  }
}

for (const file of jsFiles) {
  const text = fs.readFileSync(file, "utf8");
  if (/cdn\.jsdelivr\.net\/npm\/@supabase\/supabase-js@2(?:[/"'])/.test(text)) {
    failures.push(`${path.relative(root, file)} dynamically loads an unpinned Supabase dependency`);
  }
}

if (inlineExecutable.length) {
  failures.push(`Inline executable scripts remain in ${inlineExecutable.length} document(s): ${[...new Set(inlineExecutable)].slice(0, 40).join(", ")}`);
}

if (failures.length) {
  console.error("CSP source audit failed:\n" + failures.map((item) => `- ${item}`).join("\n"));
  process.exit(1);
}

console.log(`CSP source audit passed: ${htmlFiles.length} HTML documents; ${externalScripts.size} approved external scripts; no inline executable scripts.`);
