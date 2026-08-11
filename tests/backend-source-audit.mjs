import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const functions = [
  'dj-tube-discovery',
  'ftn-live-sources',
  'ftn-opportunities',
  'ftn-news-sources',
  'ftn-transactions',
  'ibis-query',
  'dj-tube-stems',
  'ftn-owner-control',
  'ftn-account-control',
  'ftn-love-control',
  'ibis-creative-control',
];

const files = functions.map(name => path.join('supabase','functions',name,'index.ts'));
for (const file of files) assert(fs.existsSync(file),`Missing Git-owned Edge Function source: ${file}`);
assert(fs.existsSync('supabase/README.md'),'Missing Supabase ownership/deployment record');

for (const migration of [
  'supabase/migrations/20260810012120_add_ftn_platform_transactions.sql',
  'supabase/migrations/20260810080155_harden_dj_rls_and_legacy_rpc.sql',
  'supabase/migrations/20260810081201_fix_shared_updated_at_search_path.sql',
  'supabase/migrations/20260810130000_master_build_shared_identity_controls.sql',
  'supabase/migrations/20260810150000_ibis_creative_cost_controls.sql',
]) {
  assert(fs.existsSync(migration),`Missing FTN-owned applied migration record: ${migration}`);
}

const combined = files.map(file => fs.readFileSync(file,'utf8')).join('\n');

// Common secret formats that must never appear as literals in the repository.
const forbidden = [
  [/AIza[0-9A-Za-z_-]{30,}/,'Google API key'],
  [/GOCSPX-[0-9A-Za-z_-]{20,}/,'Google OAuth client secret'],
  [/sb_secret_[0-9A-Za-z_-]{20,}/,'Supabase secret key'],
  [/sk_live_[0-9A-Za-z]+/,'payment live secret'],
  [/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,'private key'],
];
for (const [pattern,label] of forbidden) assert(!pattern.test(combined),`${label} appears to be committed in Edge Function source`);

for (const name of ['YOUTUBE_DATA_API_KEY','TURNSTILE_SECRET_KEY','GMAIL_CLIENT_ID','GMAIL_CLIENT_SECRET','GMAIL_REFRESH_TOKEN']) {
  if (combined.includes(name)) assert(combined.includes(`Deno.env.get("${name}")`) || combined.includes(`Deno.env.get('${name}')`),`${name} must be read from the Edge environment, not embedded`);
}

const transaction = fs.readFileSync('supabase/functions/ftn-transactions/index.ts','utf8');
assert.match(transaction,/gmail\/v1\/users\/me\/drafts/,'POE transaction function must use Gmail draft creation');
assert(!/gmail\/v1\/users\/me\/messages\/send/.test(transaction),'POE transaction function must never send Gmail automatically');
assert.match(transaction,/TURNSTILE_SECRET_KEY/,'Consequential transactions must retain server-side human verification');
assert.match(transaction,/TURNSTILE_ACTION\s*=\s*["']ftn_transaction["']/,'Turnstile action binding must remain explicit');
assert.match(transaction,/ALLOWED_TURNSTILE_HOSTS/,'Turnstile hostname validation must remain explicit');
assert.match(transaction,/EMAIL_WINDOW_LIMIT/,'POE transaction abuse-rate control missing');
assert.match(transaction,/FOUNDER_REVIEW/,'Consequential transactions must retain founder review state');

const transactionMigration = fs.readFileSync('supabase/migrations/20260810012120_add_ftn_platform_transactions.sql','utf8');
assert.match(transactionMigration,/enable row level security/i,'FTN transaction table migration must enable RLS');
assert(!/create policy/i.test(transactionMigration),'FTN transaction escrow table must not gain a direct anon/auth policy in its baseline migration');

const media = fs.readFileSync('supabase/functions/dj-tube-discovery/index.ts','utf8');
assert.match(media,/YOUTUBE_DATA_API_KEY/,'Media discovery should support the server-side YouTube API seam');
assert.match(media,/youtube-public-search/,'Media discovery must preserve its bounded fallback');
assert.match(media,/MUSIC_EXCLUDED/,'Music discovery must preserve mix/compilation exclusion');

const live = fs.readFileSync('supabase/functions/ftn-live-sources/index.ts','utf8');
assert.match(live,/AbortSignal\.timeout\(12000\)/,'FTN Live upstream source must remain timeout-bounded');
assert.match(live,/NOAA\/NESDIS\/STAR/,'FTN Live source provenance missing');

const ibis = fs.readFileSync('supabase/functions/ibis-query/index.ts','utf8');
assert.match(ibis,/verify|authorization|Bearer/i,'ibis must retain an authenticated server boundary');
assert.match(ibis,/GEMINI_API_KEY/,'ibis provider credential must remain server-side');
assert.match(ibis,/auth\.getUser\(token\)/,'ibis must verify the access token with the Auth server, not trust decoded claims');

const stems = fs.readFileSync('supabase/functions/dj-tube-stems/index.ts','utf8');
assert.match(stems,/REPLICATE_API_TOKEN/,'stem provider credential must remain server-side');
assert.match(stems,/Authorization/,'stem processing must retain authenticated access');
assert.match(stems,/auth\.getUser\(accessToken\)/,'stem processing must verify the requesting user with Auth');
assert.match(stems,/FTN_STEM_GENERATION_ENABLED/,'paid stem jobs must fail closed behind an explicit server switch');
assert.match(stems,/rightsConfirmed/,'stem processing must require an explicit rights declaration');
assert.match(stems,/object\/sign\/ftn-private-audio/,'stem processing must reject arbitrary public media URLs');
assert.match(stems,/ftn_reserve_ai_credits/,'stem processing must reserve customer-funded credits before the provider call');
assert.match(stems,/ftn_refund_ai_job/,'stem processing must refund a failed provider submission');

const owner = fs.readFileSync('supabase/functions/ftn-owner-control/index.ts','utf8');
assert.match(owner,/FTN_OWNER_USER_ID/,'God Mode must bind owner access to an immutable server-side user ID');
assert.match(owner,/ftn_operator_roles/,'God Mode must also require a protected server-side owner role');
assert.match(owner,/ftn_control_journal/,'God Mode actions must retain an append-only journal');
assert.match(owner,/dryRun/,'God Mode emergency controls must support non-mutating staging simulations');
assert.match(owner,/FTN_EMERGENCY_CONTROLS_ENABLED/,'Production emergency mutations must fail closed behind explicit configuration');

const love = fs.readFileSync('supabase/functions/ftn-love-control/index.ts','utf8');
assert.match(love,/adult\(/,'FTN Love must retain a server-side adult gate');
assert.match(love,/ftn_love_blocks/,'FTN Love must enforce block controls');
assert.match(love,/ftn_love_reports/,'FTN Love must provide a server-side report path');
assert.match(love,/reverse/,'FTN Love must require reciprocal interest before creating a match');

const sharedMigration = fs.readFileSync('supabase/migrations/20260810130000_master_build_shared_identity_controls.sql','utf8');
for (const table of ['ftn_user_preferences','ftn_saved_items','ftn_operator_roles','ftn_control_journal','ftn_love_profiles','ftn_love_messages']) {
  assert.match(sharedMigration,new RegExp(`alter table public\\.${table} enable row level security`,'i'),`${table} must enable RLS`);
}
assert.match(sharedMigration,/security_invoker\s*=\s*true/i,'Community public views must use invoker security');

const creative=fs.readFileSync('supabase/functions/ibis-creative-control/index.ts','utf8');
assert.match(creative,/const adapters:Record<string,ProviderAdapter>\s*=\s*\{\}/,'Paid creative adapters must ship empty until a provider passes approval');
assert.match(creative,/FTN_CREATIVE_GENERATION_ENABLED/,'Creative generation needs a global server-side cost switch');
assert.match(creative,/auth\.getUser\(token\)/,'Creative control must verify identity with the Auth server');
assert.match(creative,/limited\(user\.id\)/,'Creative control must rate-limit authenticated callers');
assert.match(creative,/No approved provider adapter is deployed/,'Creative control must fail closed before reserving credits');
const creativeMigration=fs.readFileSync('supabase/migrations/20260810150000_ibis_creative_cost_controls.sql','utf8');
for(const table of ['ftn_ai_providers','ftn_ai_projects','ftn_ai_credit_accounts','ftn_ai_jobs','ftn_ai_credit_ledger','ftn_ai_affiliate_clicks'])assert.match(creativeMigration,new RegExp(`alter table public\\.${table} enable row level security`,'i'),`${table} must enable RLS`);
assert.match(creativeMigration,/balance integer not null default 0 check \(balance >= 0\)/i,'ibis Credits must reject negative balances');
assert.match(creativeMigration,/for update/i,'ibis Credits reservation must lock mutable cost and balance records');
assert.match(creativeMigration,/ftn_reserve_ai_credits\(\s*p_user_id uuid[\s\S]*grant execute on function public\.ftn_reserve_ai_credits\(uuid,text,text,uuid,text,text\) to service_role/i,'Only the service role may reserve ibis Credits for an explicitly verified user');
assert.match(stems,/p_user_id:user\.id/i,'Stem reservation must bind the server-verified Auth user to the credit RPC');
assert.match(creativeMigration,/storage\.buckets[\s\S]*ftn-private-audio/i,'Private FTN audio storage bucket missing');

console.log(`${files.length}/${functions.length} FTN Edge Functions are versioned in Git and passed the ownership/secret audit.`);
console.log('POE Gmail path is draft-only, Turnstile-bound, hostname/action validated and rate-limited; no automatic Gmail send endpoint is present.');
