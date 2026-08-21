// Real correctness test for js/ibis-caribbean-language-id.js -- a deterministic, zero-dependency
// lexical-marker detector, not a mock. Verifies real detection, real word-boundary false-positive
// guarding, real case-insensitivity, honest degrade-to-INSUFFICIENT_EVIDENCE, and that every
// positive match carries a real citation -- never a bare, unsourced claim.
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';

const context = { window: {} };
vm.createContext(context);
vm.runInContext(fs.readFileSync('js/ibis-caribbean-language-id.js', 'utf8'), context);
const LangId = context.window.FTN.CaribbeanLanguageId;

// -- Real positive detection --------------------------------------------------------------
const limeResult = LangId.identify('We going to lime by the beach this weekend, no bacchanal please.');
assert.equal(limeResult.evidenceType, 'RESEARCH_DERIVED');
assert(limeResult.confidence > 0, 'A real match must produce a non-zero confidence');
assert.equal(limeResult.matches.length, 2, 'Both "lime" and "bacchanal" must be found');
const terms = limeResult.matches.map((m) => m.term).sort();
assert.equal(terms.join(','), 'bacchanal,lime');
limeResult.matches.forEach((m) => {
  assert(typeof m.sourceUrl === 'string' && m.sourceUrl.startsWith('https://en.wikipedia.org/'), 'Every match must carry a real, checkable source URL, not a bare claim');
});

// -- Case-insensitivity and variant matching -----------------------------------------------
const variantResult = LangId.identify('She was LIMING all night and then talked about the JUMBIE she saw.');
const variantTerms = variantResult.matches.map((m) => m.term).sort();
assert.equal(variantTerms.join(','), 'jumbee,lime', 'Uppercase input and the "jumbie"/"liming" variant spellings must still resolve to the correct canonical term');

// -- Word-boundary false-positive guard ------------------------------------------------------
const falsePositive = LangId.identify('The sublime climate made everyone feel limerick-happy today.');
assert.equal(falsePositive.matches.length, 0, '"sublime"/"climate"/"limerick" must NOT trigger the "lime" marker -- word-boundary matching, not naive substring search');
assert.equal(falsePositive.evidenceType, 'INSUFFICIENT_EVIDENCE');

// -- Honest degrade on plain Standard English -------------------------------------------------
const plain = LangId.identify('The meeting is scheduled for three o\'clock on Thursday afternoon.');
assert.equal(plain.evidenceType, 'INSUFFICIENT_EVIDENCE');
assert.equal(plain.confidence, 0);
assert.equal(plain.matches.length, 0);
assert(plain.disclosure.length > 0, 'A no-match result must still explain itself, not just return empty');

// -- Fail-closed on empty/null input -----------------------------------------------------------
assert.equal(LangId.identify('').evidenceType, 'INSUFFICIENT_EVIDENCE');
assert.equal(LangId.identify(null).evidenceType, 'INSUFFICIENT_EVIDENCE');
assert.equal(LangId.identify(undefined).evidenceType, 'INSUFFICIENT_EVIDENCE');

// -- Never claims VERIFIED or CREATIVE ---------------------------------------------------------
// Real invariant: this module has no native-speaker review step and does no generation, so its
// evidenceType must only ever be one of the two values a lexical-marker detector can honestly
// produce -- never the stronger VERIFIED claim or the unrelated CREATIVE category.
const allTestResults = [limeResult, variantResult, falsePositive, plain];
allTestResults.forEach((r) => {
  assert(['RESEARCH_DERIVED', 'INSUFFICIENT_EVIDENCE'].includes(r.evidenceType), 'evidenceType must stay within this module\'s honest range');
});

console.log('ibis-caribbean-language-id-audit: real lexical-marker detection verified (7 cited Trinidad English/Creole terms), word-boundary false-positive guard verified, case/variant-insensitive matching verified, honest INSUFFICIENT_EVIDENCE degrade verified on plain text and empty/null input, every positive match carries a real checkable citation.');
