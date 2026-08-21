// Real correctness test for scripts/ftn-scout-candidate-tracker.mjs -- proves the diffing logic
// that lets a future Scout run avoid re-analyzing unchanged third-party candidates every week.
import assert from 'node:assert/strict';
import { diffCandidate, diffAll, loadTrackedCandidates, OUTCOMES } from '../scripts/ftn-scout-candidate-tracker.mjs';

// -- diffCandidate: every named outcome, proven individually --------------------------------
assert.equal(diffCandidate(null, { id: 'x', license: 'MIT' }), 'NEW');
assert.equal(diffCandidate({ license: 'MIT', decision: 'WATCH', summary: 's' }, { license: 'MIT', decision: 'WATCH', summary: 's' }), 'UNCHANGED');
assert.equal(diffCandidate({ license: 'MIT' }, { license: 'AGPL-3.0' }), 'LICENSE_CHANGE');
assert.equal(diffCandidate({ license: 'mit' }, { license: 'MIT' }), 'UNCHANGED', 'License comparison must be case-insensitive -- "mit" and "MIT" are the same fact');
assert.equal(diffCandidate({ securityNotes: 'none' }, { securityNotes: 'now requires founder cookies' }), 'SECURITY_CHANGE');
assert.equal(diffCandidate({ decision: 'WATCH' }, { decision: 'BUILD_NOW' }), 'RECOMMENDATION_CHANGE');
assert.equal(diffCandidate({ summary: 'old summary' }, { summary: 'materially different summary' }), 'MATERIALLY_CHANGED');
assert.equal(diffCandidate({ license: 'MIT' }, { license: 'MIT', status: 'ARCHIVED' }), 'ARCHIVED');
assert.equal(diffCandidate({ license: 'MIT' }, { license: 'AGPL-3.0', status: 'ARCHIVED' }), 'ARCHIVED', 'ARCHIVED must take priority over a simultaneous license change -- it is the more consequential fact');
assert.throws(() => diffCandidate({}, null), /requires a current candidate/);

// -- Every returned outcome is one of the documented OUTCOMES, never an ad hoc string -------
[
  diffCandidate(null, { id: 'a' }),
  diffCandidate({ license: 'MIT' }, { license: 'MIT' }),
].forEach((outcome) => assert(OUTCOMES.includes(outcome), `"${outcome}" must be a documented outcome`));

// -- diffAll: fresh candidates diffed, AND untouched tracked candidates reported UNCHANGED ---
const tracked = [
  { id: 'a', license: 'MIT', decision: 'WATCH' },
  { id: 'b', license: 'MIT', decision: 'EXPERIMENT_NOW' },
];
const fresh = [{ id: 'a', license: 'MIT', decision: 'BUILD_NOW' }]; // only 'a' re-researched this pass
const all = diffAll(tracked, fresh);
const byId = Object.fromEntries(all.map((r) => [r.id, r]));
assert.equal(byId.a.outcome, 'RECOMMENDATION_CHANGE');
assert.equal(byId.b.outcome, 'UNCHANGED', 'A tracked candidate not re-researched this pass must be reported UNCHANGED, not dropped from the result set');
assert.equal(byId.b.skipped, true, 'An unchanged, not-re-researched candidate should be flagged as skipped so a report can tell "confirmed unchanged" apart from "not looked at this pass"');

// -- The real seed registry (data/ftn-scout-tracked-candidates.json) loads and has a real shape
const registry = await loadTrackedCandidates();
assert(registry.candidates.length >= 5, 'The real tracked-candidate registry must contain the Pass 15 primary candidates');
registry.candidates.forEach((c) => {
  assert(c.id && c.name && c.decision, `Candidate ${JSON.stringify(c.id)} is missing a required field`);
});

console.log('ftn-scout-candidate-tracker-audit: every diff outcome verified individually, diffAll correctly reports untouched tracked candidates as UNCHANGED/skipped rather than dropping them, real seed registry shape verified.');
