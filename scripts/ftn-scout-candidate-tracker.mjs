#!/usr/bin/env node
/**
 * FTN Scout Candidate Tracker
 *
 * A small, pure diffing utility over data/ftn-scout-tracked-candidates.json -- the lightweight,
 * repo-managed registry of third-party candidates the Open-Source Scout and manual research
 * passes have evaluated (Hermes Agent, Agent Reach, last30days, Graphiti, Shandu, and others).
 * This is deliberately NOT a new database: the registry is one JSON file, versioned in git like
 * every other data/*.json file in this repo (see data/open-source-scout-queries.json).
 *
 * Its one job is to answer, for a freshly re-researched candidate: what changed since the last
 * time FTN looked at it? So a weekly Scout run (or a manual research pass) doesn't need to
 * re-read and re-reason about every unchanged candidate from scratch -- only NEW or genuinely
 * different ones need founder attention.
 *
 * Not yet wired into the weekly cron (.github/workflows/open-source-scout.yml) -- that's a real,
 * flagged next step, not done this pass, to avoid bundling automation-wiring risk into a research
 * pass. This file is the tested primitive that wiring would call.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const defaultRegistryPath = resolve(root, 'data/ftn-scout-tracked-candidates.json');

export const OUTCOMES = [
  'NEW', 'LICENSE_CHANGE', 'SECURITY_CHANGE', 'RECOMMENDATION_CHANGE', 'MATERIALLY_CHANGED',
  'ARCHIVED', 'UNCHANGED',
];

// Compares a previously tracked candidate record against a freshly re-researched one and returns
// exactly one outcome. Order matters: a license change on an archived project is still reported
// as ARCHIVED first (the more consequential fact), and a license change takes priority over a
// same-pass summary edit (MATERIALLY_CHANGED is the catch-all for "something worth a second look
// changed, but not one of the specifically named higher-priority reasons").
export function diffCandidate(previous, current) {
  if (!current || typeof current !== 'object') throw new Error('diffCandidate requires a current candidate record');
  if (!previous) return 'NEW';
  if (current.status === 'ARCHIVED' || current.status === 'ABANDONED') return 'ARCHIVED';
  const prevLicense = String(previous.license || '').trim().toLowerCase();
  const currLicense = String(current.license || '').trim().toLowerCase();
  if (prevLicense !== currLicense) return 'LICENSE_CHANGE';
  if (String(previous.securityNotes || '') !== String(current.securityNotes || '')) return 'SECURITY_CHANGE';
  if (String(previous.decision || '') !== String(current.decision || '')) return 'RECOMMENDATION_CHANGE';
  if (String(previous.summary || '') !== String(current.summary || '')) return 'MATERIALLY_CHANGED';
  return 'UNCHANGED';
}

export async function loadTrackedCandidates(path = defaultRegistryPath) {
  const raw = await readFile(path, 'utf8');
  const data = JSON.parse(raw);
  if (!Array.isArray(data.candidates)) throw new Error('Tracked-candidate registry is missing a candidates array');
  return data;
}

export async function saveTrackedCandidates(data, path = defaultRegistryPath) {
  await writeFile(path, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

// Runs every fresh candidate against the tracked registry and returns a summary grouped by
// outcome -- the shape a founder-review report or a future cron step would actually consume.
export function diffAll(trackedCandidates, freshCandidates) {
  const trackedById = new Map(trackedCandidates.map((c) => [c.id, c]));
  const seenIds = new Set();
  const results = freshCandidates.map((fresh) => {
    seenIds.add(fresh.id);
    return { id: fresh.id, outcome: diffCandidate(trackedById.get(fresh.id), fresh) };
  });
  // Tracked candidates that were not re-researched this pass are UNCHANGED by definition -- the
  // whole point of tracking is to avoid re-analyzing them, not to silently drop them from the set.
  for (const tracked of trackedCandidates) {
    if (!seenIds.has(tracked.id)) results.push({ id: tracked.id, outcome: 'UNCHANGED', skipped: true });
  }
  return results;
}

async function main() {
  if (process.argv.includes('--self-test')) {
    if (diffCandidate(null, { id: 'x', license: 'MIT' }) !== 'NEW') throw new Error('NEW self-test failed');
    if (diffCandidate({ license: 'MIT' }, { license: 'MIT' }) !== 'UNCHANGED') throw new Error('UNCHANGED self-test failed');
    if (diffCandidate({ license: 'MIT' }, { license: 'GPL-3.0' }) !== 'LICENSE_CHANGE') throw new Error('LICENSE_CHANGE self-test failed');
    if (diffCandidate({ decision: 'WATCH' }, { decision: 'BUILD_NOW' }) !== 'RECOMMENDATION_CHANGE') throw new Error('RECOMMENDATION_CHANGE self-test failed');
    if (diffCandidate({ license: 'MIT' }, { license: 'MIT', status: 'ARCHIVED' }) !== 'ARCHIVED') throw new Error('ARCHIVED self-test failed');
    console.log('FTN Scout Candidate Tracker self-test passed.');
    return;
  }
  const registry = await loadTrackedCandidates();
  console.log(`Loaded ${registry.candidates.length} tracked candidate(s) from ${defaultRegistryPath}.`);
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) main().catch((error) => { console.error(error); process.exitCode = 1; });
