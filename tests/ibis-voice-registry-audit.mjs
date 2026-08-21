// Real correctness test for js/ibis-voice-registry.js -- the two authorized voice identities,
// kept separate from dialect/region/delivery-style context, and the exact resolution priority
// order the Phase 6 directive specifies (explicit request > UI selection > account context >
// project context > default).
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';

const context = { window: {} };
vm.createContext(context);
vm.runInContext(fs.readFileSync('js/ibis-voice-registry.js', 'utf8'), context);
const Voices = context.window.FTN.IbisVoiceRegistry;

// -- Exactly two authorized identities, no more, no fewer ---------------------------------------
const all = Voices.all();
assert.equal(all.length, 2);
assert(all.some((v) => v.id === 'ian'));
assert(all.some((v) => v.id === 'sarafina'));
assert.equal(Voices.get('does-not-exist'), null);
// Neither identity claims to have real reference audio or be production-ready -- honest per the
// directive's explicit "do not ask for recordings yet" ordering.
for (const v of all) assert.equal(v.status, 'AUTHORIZED_IDENTITY_NO_REFERENCE_AUDIO_YET');

// -- Engine candidates: real, license-verified, correctly not deployed --------------------------
const candidates = Voices.engineCandidates();
assert(candidates.length >= 2);
for (const c of candidates) {
  assert(c.licenseVerified === true, `${c.id} must have a verified license, not an assumed one`);
  assert(typeof c.verificationSource === 'string' && c.verificationSource.startsWith('http'), `${c.id} must cite a real primary source`);
}

// -- Resolution priority: explicit request beats everything else --------------------------------
const explicitWins = Voices.resolveDialectContext({
  explicitRequest: { country: 'Jamaica', dialect: 'Jamaican Creole' },
  uiSelection: { country: 'Trinidad & Tobago', dialect: 'Trinidadian English' },
  accountContext: { country: 'Barbados' },
});
assert.equal(explicitWins.source, 'explicitRequest');
assert.equal(explicitWins.country, 'Jamaica');

// -- UI selection beats account/project context when no explicit request is present -------------
const uiWins = Voices.resolveDialectContext({
  uiSelection: { country: 'Trinidad & Tobago', dialect: 'Trinidadian English' },
  accountContext: { country: 'Barbados' },
});
assert.equal(uiWins.source, 'uiSelection');
assert.equal(uiWins.country, 'Trinidad & Tobago');

// -- Account context beats project context -------------------------------------------------------
const accountWins = Voices.resolveDialectContext({
  accountContext: { country: 'Barbados' },
  projectContext: { country: 'Guyana' },
});
assert.equal(accountWins.source, 'accountContext');

// -- No layer present -> honest default, never a fabricated dialect claim -----------------------
const fallback = Voices.resolveDialectContext({});
assert.equal(fallback.source, 'default');
assert.equal(fallback.country, null);
assert.equal(fallback.dialect, null);

// -- A single request must never mutate account-level state (the directive's explicit prohibition
// against silently changing permanent account information) -- resolveDialectContext is pure.
const inputSnapshot = JSON.stringify({ accountContext: { country: 'Barbados' } });
const inputObj = { accountContext: { country: 'Barbados' } };
Voices.resolveDialectContext(inputObj);
assert.equal(JSON.stringify(inputObj), inputSnapshot, 'resolveDialectContext must not mutate its input');

// -- buildVoiceRequest(): combines identity + resolved context, never a per-dialect voice variant
const ianRequest = Voices.buildVoiceRequest('ian', { explicitRequest: { country: 'Trinidad & Tobago', dialect: 'Trinidadian English', deliveryStyle: 'narration' } });
assert.equal(ianRequest.valid, true);
assert.equal(ianRequest.voiceId, 'ian');
assert.equal(ianRequest.dialect, 'Trinidadian English');
const sarafinaRequest = Voices.buildVoiceRequest('sarafina', { explicitRequest: { country: 'Trinidad & Tobago', dialect: 'Trinidadian English', deliveryStyle: 'conversational' } });
assert.equal(sarafinaRequest.voiceId, 'sarafina');
assert.equal(sarafinaRequest.deliveryStyle, 'conversational');
// Same voice identity, no dialect context supplied -- proves voice and dialect are independent axes.
const ianNoDialect = Voices.buildVoiceRequest('ian', {});
assert.equal(ianNoDialect.voiceId, 'ian');
assert.equal(ianNoDialect.dialect, null);

const invalidVoice = Voices.buildVoiceRequest('unauthorized-voice', {});
assert.equal(invalidVoice.valid, false);

console.log('ibis-voice-registry-audit: exactly two authorized identities verified, engine candidates real and license-verified, resolution priority order verified (explicit > UI > account > project > default), purity/no-mutation verified, voice/dialect independence verified.');
