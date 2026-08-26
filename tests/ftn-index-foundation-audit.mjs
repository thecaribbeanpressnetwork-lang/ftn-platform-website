import fs from 'node:fs';

const checks=[];
function check(name,condition){checks.push({name,ok:Boolean(condition)});if(!condition)process.exitCode=1;}
function read(path){return fs.readFileSync(new URL('../'+path,import.meta.url),'utf8');}

const migration=read('supabase/migrations/20260826210000_ftn_index_foundation.sql');
const claimMigration=read('supabase/migrations/20260826211000_ftn_index_claim_link_flow.sql');
const boundaryMigration=read('supabase/migrations/20260826213000_ftn_index_scout_and_public_boundary.sql');
const schedulerMigration=read('supabase/migrations/20260826214000_ftn_index_scout_scheduler.sql');
const bulkMigration=read('supabase/migrations/20260826215000_ftn_index_scout_bulk_ingest.sql');
const qualityMigration=read('supabase/migrations/20260826220000_ftn_index_quality_gate.sql');
const outreachGuardMigration=read('supabase/migrations/20260826220500_ftn_index_outreach_state_guard.sql');
const fn=read('supabase/functions/ftn-index/index.ts');
const scout=read('supabase/functions/ftn-index-scout/index.ts');
const html=read('index/index.html');
const page=read('js/ftn-index-page.js');
const schema=read('js/ftn-index-schema.js');
const sitemap=read('sitemap.xml');

check('canonical-entity-table',/create table if not exists public\.ftn_index_entities/.test(migration));
check('per-field-provenance',/provenance_type/.test(migration)&&/business-confirmed/.test(migration));
check('history-preserved',/superseded_at/.test(migration));
check('public-api-excludes-private-tables',/ftn_index_public_entities/.test(migration)&&!/select[\s\S]{0,100}public_contact_hash/i.test(migration.split('create or replace view public.ftn_index_public_entities')[1]||''));
check('cost-guard-hard-stop',/hard_stop_at_free_limit boolean not null default true/.test(migration)&&/founder_approved_paid boolean not null default false/.test(migration));
check('email-transport-starts-blocked',/ftn_index_email_transport/.test(boundaryMigration)&&/'unconfigured'/.test(boundaryMigration));
check('raw-invite-token-not-stored',/token_hash text not null unique/.test(migration)&&!/\btoken text\b/.test(migration));
check('claim-token-single-use',/redeemed_at is null/.test(claimMigration)&&/update public\.ftn_index_claim_invitations set redeemed_at=now\(\)/.test(claimMigration));
check('claim-rpc-service-role-only',/grant execute on function public\.ftn_index_confirm_invitation\(text,jsonb\) to service_role/.test(claimMigration));
check('confirmation-is-not-endorsement',/not endorsement/i.test(migration)&&/not an FTN endorsement/i.test(fn));
check('no-paid-provider-in-index-function',!/GEMINI_API_KEY|OPENAI_API_KEY|ANTHROPIC_API_KEY|RESEND_API_KEY/.test(fn+scout));
check('claim-function-hashes-token',/crypto\.subtle\.digest\("SHA-256"/.test(fn));
check('category-field-allowlist',/CATEGORY_FIELDS/.test(fn)&&/allowedFields/.test(fn));
check('no-persistent-click-fingerprint',!/user-agent|fingerprint|cf-connecting-ip|x-real-ip/.test(fn));
check('provisional-entities-not-public',/public_status in \('claimed','current','stale','disputed'\)/.test(boundaryMigration));
check('provisional-fields-not-public',/e\.public_status in \('claimed','current','stale','disputed'\)/.test(boundaryMigration));
check('scout-discovery-fields-internal',/visibility:\s*"internal"/.test(scout)||/'internal','discovered'/.test(bulkMigration));
check('scout-uses-bulk-rpc',/ftn_index_ingest_scout_candidates/.test(scout)&&/jsonb_array_elements/.test(bulkMigration));
check('scout-does-not-downgrade-confirmed',/public_status='provisional' then excluded/.test(bulkMigration));
check('outreach-blocked-until-transport',/blocked_until_free_transport_is_approved/.test(scout)&&/blocked-transport/.test(bulkMigration));
check('scout-quality-gate',/function qualityGate/.test(scout)&&/status:"pass"\|"review"\|"reject"/.test(scout));
check('quality-stored-with-reasons',/quality_status/.test(qualityMigration)&&/quality_score/.test(qualityMigration)&&/quality_reasons/.test(qualityMigration));
check('quality-pass-only-contactable',/v_quality_status='pass'/.test(qualityMigration)&&/v_contactable:=v_contactable\+1/.test(qualityMigration));
check('human-optout-is-distinct',/new\.do_not_contact/.test(outreachGuardMigration)&&/new\.status:='do-not-contact'/.test(outreachGuardMigration)&&/new\.status:=case when new\.quality_status='pass' then 'blocked-transport' else 'failed' end/.test(outreachGuardMigration));
check('daily-owned-scheduler',/cron\.schedule/.test(schedulerMigration)&&/pg_net/.test(schedulerMigration)&&/timeout_milliseconds := 60000/.test(schedulerMigration));
check('public-page-canonical',/https:\/\/ftnplatform\.org\/index\//.test(html));
check('public-page-free-correction-copy',/correct their own public record free/i.test(html));
check('ftn-red-confirmation-not-blue',/FTN red confirmation mark/i.test(html)&&!/blue check/i.test(html));
check('shared-entity-engine-reused',/EntityMetadataEngine/.test(schema));
check('frictionless-invite-route',/claim-preview/.test(page)&&/claim-confirm/.test(page)&&/new URLSearchParams/.test(page));
check('index-is-discoverable-in-sitemap',/https:\/\/ftnplatform\.org\/index\//.test(sitemap));

for(const item of checks)console.log(`${item.ok?'PASS':'FAIL'} ${item.name}`);
if(process.exitCode)console.error(`FTN Index audit failed: ${checks.filter(x=>!x.ok).length} check(s).`);
else console.log(`FTN Index audit passed: ${checks.length} checks.`);
