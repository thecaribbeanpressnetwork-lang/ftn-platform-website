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
  'ftn-fire-generate',
];

const files = functions.map(name => path.join('supabase','functions',name,'index.ts'));
for (const file of files) assert(fs.existsSync(file),`Missing Git-owned Edge Function source: ${file}`);
assert(fs.existsSync('supabase/README.md'),'Missing Supabase ownership/deployment record');
const redirects = fs.readFileSync('_redirects','utf8');
assert.match(redirects,/^\/supabase\/\*\s+\/404\.html\s+404$/m,'Supabase source and migrations must not be publicly served by Cloudflare Pages');
assert.match(redirects,/^\/GOVERNANCE\/\*\s+\/404\.html\s+404$/m,'Internal governance records must not be publicly served by Cloudflare Pages');
const headers = fs.readFileSync('_headers','utf8');
for (const header of ['X-Content-Type-Options: nosniff','Referrer-Policy: strict-origin-when-cross-origin','X-Frame-Options: DENY','Permissions-Policy:','Cross-Origin-Opener-Policy: same-origin']) {
  assert(headers.includes(header),`Cloudflare Pages security header missing: ${header}`);
}

for (const migration of [
  'supabase/migrations/20260810012120_add_ftn_platform_transactions.sql',
  'supabase/migrations/20260810080155_harden_dj_rls_and_legacy_rpc.sql',
  'supabase/migrations/20260810081201_fix_shared_updated_at_search_path.sql',
  'supabase/migrations/20260810130000_master_build_shared_identity_controls.sql',
  'supabase/migrations/20260810150000_ibis_creative_cost_controls.sql',
  'supabase/migrations/20260811100000_community_connect_storage_and_integrity.sql',
  'supabase/migrations/20260811101000_revoke_auto_rls_helper.sql',
  'supabase/migrations/20260811110000_ftn_fire_managed_generation.sql',
  'supabase/migrations/20260812120000_founder_device_authorization.sql',
  'supabase/migrations/20260812123000_founder_action_register.sql',
  'supabase/migrations/20260812130000_enforce_community_public_view_boundaries.sql',
  'supabase/migrations/20260825120000_restore_public_issues_read_policy.sql',
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
assert.match(owner,/statuses\s*=\s*\[[^\]]*["']VAULTED["']/s,'God Mode must support the audited VAULTED lifecycle');
assert.match(owner,/auth\.getUser\(token\)/,'God Mode must verify the access token with Supabase Auth');
assert.match(owner,/ftn_founder_identities/,'God Mode must require the private exact-email founder record');
assert.match(owner,/approved_email.*email/s,'God Mode must compare the verified email to its exact founder record');
assert.match(owner,/isGoogleIdentity\(user\)/,'God Mode must require the approved founder to use a Google identity');
assert.match(owner,/ftn_owner_session_active/,'God Mode must verify the JWT session against active server sessions');
assert.match(owner,/x-ftn-device-credential/,'God Mode must require a revocable server-issued device credential');
assert.match(owner,/credential_hash.*hashToken/s,'God Mode must compare only a hash of the device credential');
assert.match(owner,/APPROVED_PENDING_CLAIM/,'New founder devices must remain blocked until approval and one-time claim');
assert.match(owner,/status:\s*"REVOKED", credential_hash:\s*null/,'Revoked devices must lose their credential server-side');
assert.match(owner,/IDENTITY_DENIED|IMMUTABLE_ID_MISMATCH/,'Denied founder identity attempts must be audited');
assert.match(owner,/DEVICE_CREDENTIAL_REQUIRED|DEVICE_CLAIM_DENIED/,'Denied device attempts must be audited');
assert.match(owner,/ftn_operator_roles/,'God Mode must also require a protected server-side owner role');
assert.match(owner,/ftn_control_journal/,'God Mode actions must retain an append-only journal');
assert.match(owner,/dryRun/,'God Mode emergency controls must support non-mutating staging simulations');
assert.match(owner,/FTN_EMERGENCY_CONTROLS_ENABLED/,'Production emergency mutations must fail closed behind explicit configuration');
const founderMigration=fs.readFileSync('supabase/migrations/20260812120000_founder_device_authorization.sql','utf8');
const vaultMigration=fs.readFileSync('supabase/migrations/20260818110000_add_product_vault_status.sql','utf8');
assert.match(vaultMigration,/ftn_product_controls_status_check[\s\S]*VAULTED/,'Product controls must accept the VAULTED lifecycle');
assert.match(vaultMigration,/product_id in \('love', 'health'\)[\s\S]*commit;/i,'Love and Health controls must be vaulted by the release-truth migration');
for(const table of ['ftn_founder_identities','ftn_founder_devices','ftn_owner_access_audit','ftn_user_access_grants','ftn_source_controls','ftn_external_link_health','ftn_integration_readiness','ftn_deployment_health']){
  assert.match(founderMigration,new RegExp(`alter table public\\.${table} enable row level security`,'i'),`${table} must enable RLS`);
  assert.match(founderMigration,new RegExp(`revoke all on public\\.${table} from anon, authenticated`,'i'),`${table} must have no direct browser privileges`);
}
assert.match(founderMigration,/ftn_owner_session_active[\s\S]*grant execute[\s\S]*to service_role/i,'Only the service role may validate owner sessions');
const communityViewBoundary=fs.readFileSync('supabase/migrations/20260812130000_enforce_community_public_view_boundaries.sql','utf8');
for(const view of ['issues_public','issue_confirmation_counts','issue_verification_counts'])assert.match(communityViewBoundary,new RegExp(`view public\\.${view} with \\(security_invoker = true\\)`,'i'),`${view} must run with caller permissions`);
assert.match(communityViewBoundary,/null::text as photo_data_url/i,'Community public view must redact legacy embedded evidence');
assert.match(communityViewBoundary,/'\{\}'::jsonb as metadata/i,'Community public view must redact raw report metadata');

// 2026-08-25 read-only Supabase security audit: 20260812130000 revoked broad SELECT on
// public.issues and built a redacted view on top, but never added the RLS row-policy that view
// needs to actually return rows -- verified live against the deployed project (pg_policies showed
// zero SELECT policy on public.issues). This migration restores it, additively only.
const issuesReadFix=fs.readFileSync('supabase/migrations/20260825120000_restore_public_issues_read_policy.sql','utf8');
assert.match(issuesReadFix,/create policy "Public read redacted issues" on public\.issues/i,'Must restore the missing RLS SELECT policy on public.issues');
assert.match(issuesReadFix,/to anon, authenticated/i,'The restored read policy must cover both guest and signed-in callers, matching the redacted column grant it pairs with');
assert.match(issuesReadFix,/not exists \(\s*select 1 from pg_policies/i,'The fix must be idempotent -- never create a duplicate SELECT policy on repeated apply');
assert.doesNotMatch(issuesReadFix,/^\s*revoke\s|drop policy "Public insert issues"|drop policy "Admin update issues"/im,'This corrective migration must be strictly additive -- it must never revoke the existing insert/admin policies or any grant');

const love = fs.readFileSync('supabase/functions/ftn-love-control/index.ts','utf8');
assert.match(love,/adult\(/,'FTN Love must retain a server-side adult gate');
assert.match(love,/ftn_love_blocks/,'FTN Love must enforce block controls');
assert.match(love,/ftn_love_reports/,'FTN Love must provide a server-side report path');
assert.match(love,/reverse/,'FTN Love must require reciprocal interest before creating a match');
assert.match(love,/match\.status!=="ACTIVE"/,'Blocked or closed FTN Love matches must not expose message history');
assert.match(love,/from\("ftn_love_interests"\)\.delete/,'Blocking must remove pending reciprocal interests');
assert.match(love,/from\("ftn_love_matches"\)\.delete/,'Profile deletion must remove related matches and their cascade-owned messages');

const sharedMigration = fs.readFileSync('supabase/migrations/20260810130000_master_build_shared_identity_controls.sql','utf8');
for (const table of ['ftn_user_preferences','ftn_saved_items','ftn_operator_roles','ftn_control_journal','ftn_love_profiles','ftn_love_messages']) {
  assert.match(sharedMigration,new RegExp(`alter table public\\.${table} enable row level security`,'i'),`${table} must enable RLS`);
}
assert.match(sharedMigration,/security_invoker\s*=\s*true/i,'Community public views must use invoker security');
assert.match(sharedMigration,/revoke select on public\.issues from anon, authenticated/i,'Community source records must not grant browser roles every issue column');
assert.match(sharedMigration,/null::text as photo_data_url/i,'The public issues view must redact embedded report evidence');
assert.match(sharedMigration,/'\{\}'::jsonb as metadata/i,'The public issues view must redact raw report metadata');

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

const communityIntegrityMigration=fs.readFileSync('supabase/migrations/20260811100000_community_connect_storage_and_integrity.sql','utf8');
assert.match(communityIntegrityMigration,/community-report-evidence/,'Community Connect needs a private evidence bucket');
assert.match(communityIntegrityMigration,/community_issue_media/,'Community Connect needs a durable evidence metadata table');
assert.match(communityIntegrityMigration,/enable row level security/i,'Community evidence metadata must be RLS-protected');
assert.match(communityIntegrityMigration,/issue_confirmations_case_number_fkey/,'Issue confirmations need a case-number relationship');
assert.match(communityIntegrityMigration,/issue_verifications_case_number_fkey/,'Issue verifications need a case-number relationship');
assert.match(communityIntegrityMigration,/ftn_enforce_one_dj_profile/,'Duplicate DJ profiles must be blocked at write time');

const rlsHelperMigration=fs.readFileSync('supabase/migrations/20260811101000_revoke_auto_rls_helper.sql','utf8');
assert.match(rlsHelperMigration,/revoke execute on function public\.rls_auto_enable\(\) from public, anon, authenticated/i,'The automatic-RLS helper must not remain publicly executable');

const fire=fs.readFileSync('supabase/functions/ftn-fire-generate/index.ts','utf8');
assert.match(fire,/FTN_FIRE_INFERENCE_TOKEN/,'Fire gateway token must remain server-side');
assert.match(fire,/auth\.getUser\(token\)/,'Fire must verify the requesting user with Auth');
assert.match(fire,/FTN_CREATIVE_GENERATION_ENABLED/,'Fire must retain the global paid-generation switch');
assert.match(fire,/FTN_FIRE_GENERATION_ENABLED/,'Fire must retain its product-specific paid-generation switch');
assert.match(fire,/ftn_reserve_ai_credits/,'Fire must reserve credits before gateway submission');
assert.match(fire,/ftn_refund_ai_job/,'Fire must refund credits when gateway submission or verified processing fails');
assert.match(fire,/FTN_FIRE_OUTPUT_ALLOWED_HOSTS/,'Fire must allow-list provider output hosts before downloading audio');
assert.match(fire,/createSignedUrl\(path,300\)/,'Fire output must use short-lived private download URLs');
assert.match(fire,/rightsConfirmed!==true.*noArtistImitation!==true/,'Fire must require original-direction and no-imitation confirmation');
const fireMigration=fs.readFileSync('supabase/migrations/20260811110000_ftn_fire_managed_generation.sql','utf8');
assert.match(fireMigration,/stable-audio-3-medium/,'Fire must record the full-instrumental model separately');
assert.match(fireMigration,/stable-audio-3-small-sfx/,'Fire must record the SFX model separately');
assert.match(fireMigration,/ftn-fire-output/,'Fire outputs need a private FTN storage bucket');
assert.match(fireMigration,/ftn-fire-output',false/,'Fire output storage must never be public');

console.log(`${files.length}/${functions.length} FTN Edge Functions are versioned in Git and passed the ownership/secret audit.`);
console.log('POE Gmail path is draft-only, Turnstile-bound, hostname/action validated and rate-limited; no automatic Gmail send endpoint is present.');
