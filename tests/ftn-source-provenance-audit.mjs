// Real correctness test for js/ftn-source-provenance.js -- the Source Gateway provenance and
// source-quality foundation (Pass 15). Proves the one rule the whole module exists to enforce:
// source credibility and claim confidence are never the same number, and low-quality sources
// cannot manufacture high confidence merely by piling up.
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';

const context = { window: {} };
vm.createContext(context);
vm.runInContext(fs.readFileSync('js/ftn-source-provenance.js', 'utf8'), context);
const SP = context.window.FTN.SourceProvenance;

// -- sourceRecord: fails closed on an unrecognized sourceClass / retrievalMethod ------------
const badQuality = SP.sourceRecord({ sourceId: 'x', sourceClass: 'TOTALLY_MADE_UP', retrievalMethod: 'TOTALLY_MADE_UP' });
assert.equal(badQuality.sourceClass, 'UNKNOWN', 'An unrecognized sourceClass must coerce to UNKNOWN, not pass through as-typed');
assert.equal(badQuality.retrievalMethod, 'MANUAL_ENTRY', 'An unrecognized retrievalMethod must coerce to MANUAL_ENTRY, not pass through as-typed');

// -- sourceRecord: a recognized value passes through unchanged ------------------------------
const good = SP.sourceRecord({ sourceId: 'gh-1', sourceClass: 'ACADEMIC', retrievalMethod: 'DIRECT_FETCH', owner: 'MIT' });
assert.equal(good.sourceClass, 'ACADEMIC');
assert.equal(good.retrievalMethod, 'DIRECT_FETCH');
assert.equal(good.permissions, 'READ_ONLY_RESEARCH', 'permissions must default to read-only research, never a write/publish default');

// -- claimConfidence: the core anti-gaming rule -- 10 weak sources never reach HIGH ----------
const tenWeakSources = Array.from({ length: 10 }, (_, i) => SP.sourceRecord({
  sourceClass: 'MARKETING_ADVOCACY', owner: 'account-' + i,
}));
const weakResult = SP.claimConfidence(tenWeakSources);
assert.equal(weakResult.confidence, 'LOW', '10 independent MARKETING_ADVOCACY sources must still be LOW confidence, not manufactured HIGH');

// -- claimConfidence: a single official/primary source is HIGH alone ------------------------
const oneOfficial = SP.claimConfidence([SP.sourceRecord({ sourceClass: 'OFFICIAL_GOVERNMENT', owner: 'gov.tt' })]);
assert.equal(oneOfficial.confidence, 'HIGH', 'A single OFFICIAL_GOVERNMENT source must be HIGH confidence alone -- it does not need corroboration');

// -- claimConfidence: a single ACADEMIC source is only MODERATE without corroboration -------
const oneAcademic = SP.claimConfidence([SP.sourceRecord({ sourceClass: 'ACADEMIC', owner: 'uwi.edu' })]);
assert.equal(oneAcademic.confidence, 'MODERATE');

// -- claimConfidence: two INDEPENDENT academic/journalism sources reach HIGH ----------------
const twoAcademic = SP.claimConfidence([
  SP.sourceRecord({ sourceClass: 'ACADEMIC', owner: 'uwi.edu' }),
  SP.sourceRecord({ sourceClass: 'REPUTABLE_JOURNALISM', owner: 'guardian.co.tt' }),
]);
assert.equal(twoAcademic.confidence, 'HIGH');
assert.equal(twoAcademic.corroboration, 2);

// -- claimConfidence: re-posts from the SAME owner do not count as independent corroboration -
const sameOwnerTwice = SP.claimConfidence([
  SP.sourceRecord({ sourceClass: 'ACADEMIC', owner: 'uwi.edu' }),
  SP.sourceRecord({ sourceClass: 'ACADEMIC', owner: 'uwi.edu' }),
]);
assert.equal(sameOwnerTwice.corroboration, 1, 'Two records from the same owner must count as one independent source, not two');
assert.equal(sameOwnerTwice.confidence, 'MODERATE', 'Without real independent corroboration, ACADEMIC alone stays MODERATE even if listed twice');

// -- claimConfidence: no sources at all is honestly UNSUPPORTED, never a fabricated LOW ------
assert.equal(SP.claimConfidence([]).confidence, 'UNSUPPORTED');

// -- freshnessDays: real arithmetic, honest null on missing/invalid input -------------------
assert.equal(SP.freshnessDays({ retrievedAt: null }), null);
const rec = SP.sourceRecord({ retrievedAt: '2026-08-01T00:00:00.000Z' });
assert.equal(SP.freshnessDays(rec, '2026-08-21T00:00:00.000Z'), 20);

// -- Taxonomy shape sanity: UNKNOWN is always a member, taxonomy is not accidentally emptied -
assert(SP.SOURCE_QUALITY.includes('UNKNOWN'));
assert(SP.SOURCE_QUALITY.length >= 10, 'The source-quality taxonomy must retain its full real range, not be silently trimmed');

console.log('ftn-source-provenance-audit: fail-closed record coercion verified, claim-confidence ceiling and anti-gaming corroboration rules verified (10 weak sources stay LOW, a single official source is HIGH alone, same-owner re-posts do not double-count), freshness arithmetic verified.');
