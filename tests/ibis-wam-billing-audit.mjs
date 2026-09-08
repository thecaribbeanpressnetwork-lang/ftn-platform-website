import assert from 'node:assert/strict';
import fs from 'node:fs';

const migration=fs.readFileSync('supabase/migrations/20260908220000_ftn_ibis_wam_billing.sql','utf8');
const billing=fs.readFileSync('supabase/functions/ftn-ibis-billing/index.ts','utf8');
const webhook=fs.readFileSync('supabase/functions/ftn-ibis-wam-webhook/index.ts','utf8');
const pro=fs.readFileSync('supabase/functions/ftn-ibis-pro/index.ts','utf8');
const page=fs.readFileSync('ibis/pricing/index.html','utf8');
const workspace=fs.readFileSync('ibis/pro/index.html','utf8');
const workspaceJs=fs.readFileSync('js/ibis-pro.js','utf8');

for(const table of ['ftn_ibis_plans','ftn_ibis_payment_orders','ftn_ibis_entitlements','ftn_ibis_payment_events','ftn_ibis_watchlists'])assert.match(migration,new RegExp(`alter table public\\.${table} enable row level security`),`${table} must use RLS`);
assert.match(migration,/revoke all on public\.ftn_ibis_plans[\s\S]+from anon,authenticated/);
assert.match(migration,/price_minor integer not null/);
assert.match(migration,/ibis-pro-30d[\s\S]+9900[\s\S]+'TTD'/);
assert.doesNotMatch(migration,/^\s+(card_number|cvv|wallet_credential)\s+/mi);

assert.match(billing,/\.from\("ftn_ibis_plans"\)\.select/,'amount must come from the server plan catalog');
assert.match(billing,/X-WAM-Signature/);
assert.match(billing,/idempotencyKey:reference/);
assert.match(billing,/startsWith\(`\$\{base\}\/pay\/`\)/,'checkout redirect must remain on the chosen WAM environment');
assert.doesNotMatch(billing,/body\.(amount|currency|price)/,'client must not choose charge amount or currency');

assert.match(webhook,/Math\.abs\(now-stamp\)>300/,'webhook timestamp freshness must be enforced');
assert.match(webhook,/HMAC/);
assert.match(webhook,/PAYMENT_MISMATCH/);
assert.match(webhook,/payload_sha256:hash/);
assert.doesNotMatch(webhook,/payload\s*:/,'raw WAM webhook payload must not be persisted');

assert.match(pro,/PRO_REQUIRED/);
assert.match(pro,/ftn_ibis_entitlements/);
assert.match(pro,/capital-brief/);
assert.match(pro,/save-watch/);
assert.match(page,/one-time 30-day pass/i);
assert.match(page,/WAM-hosted checkout/i);
assert.match(workspace,/noindex,nofollow,noarchive/);
assert.match(workspaceJs,/textContent=text/,'Pro results must use safe DOM text rendering');
assert.doesNotMatch(workspaceJs,/innerHTML/);

console.log('FTN ibis WAM billing audit: server-owned price, RLS, hosted checkout, signed-webhook fulfillment, Pro entitlement and data-minimization boundaries verified.');
