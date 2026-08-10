import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const functions = [
  'dj-tube-discovery',
  'ftn-live-sources',
  'ftn-opportunities',
  'ftn-news-sources',
  'ftn-transactions',
];

const files = functions.map(name => path.join('supabase','functions',name,'index.ts'));
for (const file of files) assert(fs.existsSync(file),`Missing Git-owned Edge Function source: ${file}`);
assert(fs.existsSync('supabase/README.md'),'Missing Supabase ownership/deployment record');

for (const migration of [
  'supabase/migrations/20260810012120_add_ftn_platform_transactions.sql',
  'supabase/migrations/20260810080155_harden_dj_rls_and_legacy_rpc.sql',
  'supabase/migrations/20260810081201_fix_shared_updated_at_search_path.sql',
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

console.log(`${files.length}/${functions.length} FTN Edge Functions are versioned in Git and passed the ownership/secret audit.`);
console.log('POE Gmail path is draft-only, Turnstile-bound, hostname/action validated and rate-limited; no automatic Gmail send endpoint is present.');
