// FTN Platform -- regression guard for the legacy no-action TEXT freshness safety net.
//
// Browser callers historically POST to ibis-assistant without action:"canonical_query". That
// compatibility route must remain available for ordinary non-freshness TEXT requests, but any
// freshness-sensitive prompt must be classified by the canonical intent router and routed through
// handleCanonicalRequest() before the legacy runGateway() path can execute.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

function repoPath(rel) { return fileURLToPath(new URL('../' + rel, import.meta.url)); }

const source = fs.readFileSync(repoPath('supabase/functions/ibis-assistant/index.ts'), 'utf8');

assert.match(
  source,
  /import \{ classifyIntent \} from "\.\.\/_shared\/ibis-intent-router\.ts";/,
  'ibis-assistant must reuse the canonical classifyIntent implementation rather than a duplicate freshness regex',
);

const canonicalActionIndex = source.indexOf('if (payload.action === "canonical_query")');
const legacyFreshnessIndex = source.indexOf('if (classifyIntent(text).queryClass === "CURRENT_WEB_RESEARCH")');
const legacyGatewayIndex = source.lastIndexOf('const result = await runGateway({ text, products, providers });');

assert.ok(canonicalActionIndex >= 0, 'explicit canonical_query path must still exist');
assert.ok(legacyFreshnessIndex > canonicalActionIndex, 'legacy freshness safety net must live after the explicit canonical action path');
assert.ok(legacyGatewayIndex > legacyFreshnessIndex, 'freshness safety net must execute before the legacy bare runGateway path');

const safetyBlock = source.slice(legacyFreshnessIndex, legacyGatewayIndex);
assert.match(safetyBlock, /handleCanonicalRequest\(\{ text, products, providers, providerFactory, lifecycleStore \}\)/, 'legacy freshness safety net must call the real canonical brain');
assert.match(safetyBlock, /evidenceState: envelope\.evidenceState/, 'legacy compatibility response must preserve canonical evidence state');
assert.match(safetyBlock, /sources: envelope\.sources/, 'legacy compatibility response must preserve canonical sources');
assert.match(safetyBlock, /searchCacheState: envelope\.searchCacheState/, 'legacy compatibility response must preserve live/cached search provenance');
assert.doesNotMatch(safetyBlock, /runGateway\(/, 'freshness branch must never call the bare model gateway');

const ordinaryLegacyTail = source.slice(legacyGatewayIndex);
assert.match(ordinaryLegacyTail, /runGateway\(\{ text, products, providers \}\)/, 'ordinary non-freshness legacy requests must retain their historical runGateway behavior');

console.log('ibis-legacy-text-freshness-grounding-audit: freshness-sensitive legacy no-action TEXT requests are forced through the canonical grounded path before the bare gateway, while ordinary legacy TEXT behavior remains intact.');
