import assert from 'node:assert/strict';
import fs from 'node:fs';

const migration=fs.readFileSync('supabase/migrations/20260912213504_ftn_ecosystem_intelligence_foundation.sql','utf8');
const endpoint=fs.readFileSync('supabase/functions/ftn-opportunities/index.ts','utf8');
const deployed=fs.readFileSync('supabase/deployed/ftn-opportunities/index.ts','utf8');

for(const table of ['ftn_index_resources','ftn_index_resource_feedback','ftn_ecosystem_usage_events']){
  assert.match(migration,new RegExp(`alter table public\\.${table} enable row level security`),`${table} must enforce RLS`);
}
assert.match(migration,/security_invoker=true/,'public view must execute with caller permissions');
assert.match(migration,/data_sensitivity='public'/,'sensitive resources must not enter public discovery');
assert.match(migration,/verification_status in \('verified_by_provider','confirmed_by_authoritative_source','independently_verified','stale','disputed'\)/,'unreviewed resources must not be public');
assert.match(migration,/using \(user_id=\(select auth\.uid\(\)\)\)/,'feedback reads must be owner scoped');
assert.match(migration,/revoke all on public\.ftn_ecosystem_usage_events from anon,authenticated/,'raw analytics must be server-only');
assert.match(migration,/anonymous_session_hash text/,'analytics must use a non-identifying session boundary');
assert.match(migration,/payout_tt_accessibility/,'Trinidad and Tobago payout accessibility must remain explicit');
assert.match(migration,/source_retrieved_at timestamptz not null/,'resource provenance timestamp is required');

assert.equal(endpoint,deployed,'Git-owned deployment mirror drifted from canonical function');
assert.match(endpoint,/TRUSTED_HOSTS/,'outbound source links require an allowlist');
assert.match(endpoint,/url\.protocol !== "https:"/,'outbound source links require HTTPS');
assert.match(endpoint,/ignore \(all\|any\|the\|previous\)\|system prompt\|developer message/,'retrieved prompt-injection text must be rejected');
assert.match(endpoint,/FTN_ECOSYSTEM_RESOURCE_RANKING_V1_DETERMINISTIC/,'ranking method must be named and deterministic');
assert.match(endpoint,/Candidate relevance is not eligibility/,'ranking must not be presented as eligibility');
assert.match(endpoint,/costStatus: "unknown"/,'unknown cost must not be invented');
assert.match(endpoint,/payoutAccessibilityFromTrinidadAndTobago: "unknown"/,'unknown payout access must not be invented');
assert.match(endpoint,/item\.expiryState !== "expired"/,'expired records must be removed');
assert.match(endpoint,/new Map<string, RawResource>/,'duplicate records must be collapsed');
assert.match(endpoint,/bestVerifiedMatch/,'the response must include an actionable best-match pathway');

console.log('ibis ecosystem intelligence audit: FTN-owned schema, RLS, provenance, TT uncertainty, safe retrieval, dedupe, expiry and deterministic ranking verified.');
