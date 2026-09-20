import assert from 'node:assert/strict';
import fs from 'node:fs';

// Modeled directly on tests/ibis-wam-billing-audit.mjs -- same invariants, same reasoning, applied
// to Scarlett's own billing tables/functions/pages.

const migration=fs.readFileSync('supabase/migrations/20260919120000_ftn_scarlett_wam_billing.sql','utf8');
const billing=fs.readFileSync('supabase/functions/ftn-scarlett-billing/index.ts','utf8');
const webhook=fs.readFileSync('supabase/functions/ftn-scarlett-wam-webhook/index.ts','utf8');
const pricingPage=fs.readFileSync('scarlett/pricing/index.html','utf8');
const pricingJs=fs.readFileSync('js/scarlett-pricing.js','utf8');

for(const table of ['ftn_scarlett_plans','ftn_scarlett_payment_orders','ftn_scarlett_entitlements','ftn_scarlett_payment_events'])assert.match(migration,new RegExp(`alter table public\\.${table} enable row level security`),`${table} must use RLS`);
assert.match(migration,/revoke all on public\.ftn_scarlett_plans[\s\S]+from anon,authenticated/);
assert.match(migration,/price_minor integer not null/);
assert.match(migration,/scarlett-plus-monthly[\s\S]+599[\s\S]+'USD'/);
const inactivePlanCount=(migration.match(/30,false,/g)||[]).length;
assert.equal(inactivePlanCount,3,'all three Scarlett plans must start inactive (active=false) until a founder confirms real pricing and turns them on');
for(const plan of ['scarlett-plus-monthly','ftn-intelligence-monthly','ftn-pro-monthly'])assert.match(migration,new RegExp(plan));
assert.doesNotMatch(migration,/^\s+(card_number|cvv|wallet_credential)\s+/mi);

assert.match(billing,/\.from\("ftn_scarlett_plans"\)\.select/,'amount must come from the server plan catalog');
assert.match(billing,/X-WAM-Signature/);
assert.match(billing,/idempotencyKey:reference/);
assert.match(billing,/startsWith\(`\$\{base\}\/pay\/`\)/,'checkout redirect must remain on the chosen WAM environment');
assert.doesNotMatch(billing,/body\.(amount|currency|price)/,'client must not choose charge amount or currency');
// The extension's background worker is allowed to check status (read-only), never to initiate a
// checkout -- that must only ever happen from a real ftnplatform.org page.
assert.match(billing,/isWebOrigin\)return reply\(origin,\{error:"Checkout must be started from ftnplatform\.org"\}/,'checkout must be blocked from the extension origin');
assert.match(billing,/extensionOrigin/);

assert.match(webhook,/Math\.abs\(now-stamp\)>300/,'webhook timestamp freshness must be enforced');
assert.match(webhook,/HMAC/);
assert.match(webhook,/PAYMENT_MISMATCH/);
assert.match(webhook,/payload_sha256:hash/);
assert.doesNotMatch(webhook,/payload\s*:/,'raw WAM webhook payload must not be persisted');
assert.match(webhook,/WAM_SCARLETT_WEBHOOK_SECRET/,'must use its own webhook secret, distinct from ibis\'s');

assert.match(pricingPage,/WAM-hosted checkout/i);
assert.match(pricingPage,/scarlett-checkout-plus/);
assert.match(pricingPage,/scarlett-checkout-intelligence/);
assert.match(pricingPage,/scarlett-checkout-pro/);
assert.match(pricingPage,/noreferrer/,'external WAM docs link must not leak referrer');
assert.match(pricingJs,/FTN\.Auth\.invoke\('ftn-scarlett-billing'/);
assert.doesNotMatch(pricingJs,/innerHTML/);

console.log('Scarlett WAM billing audit: server-owned price, RLS, hosted checkout, signed-webhook fulfillment, extension-origin checkout restriction and data-minimization boundaries verified.');
