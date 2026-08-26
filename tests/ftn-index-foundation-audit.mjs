import fs from 'node:fs';

const checks=[];
function check(name,condition){checks.push({name,ok:Boolean(condition)});if(!condition)process.exitCode=1;}
function read(path){return fs.readFileSync(new URL('../'+path,import.meta.url),'utf8');}

const migration=read('supabase/migrations/20260826210000_ftn_index_foundation.sql');
const claimMigration=read('supabase/migrations/20260826211000_ftn_index_claim_link_flow.sql');
const fn=read('supabase/functions/ftn-index/index.ts');
const html=read('index/index.html');
const page=read('js/ftn-index-page.js');
const schema=read('js/ftn-index-schema.js');

check('canonical-entity-table',/create table if not exists public\.ftn_index_entities/.test(migration));
check('per-field-provenance',/provenance_type/.test(migration)&&/business-confirmed/.test(migration));
check('history-preserved',/superseded_at/.test(migration));
check('public-api-excludes-private-tables',/ftn_index_public_entities/.test(migration)&&!/select[\s\S]{0,100}public_contact_hash/i.test(migration.split('create or replace view public.ftn_index_public_entities')[1]||''));
check('cost-guard-hard-stop',/hard_stop_at_free_limit boolean not null default true/.test(migration)&&/founder_approved_paid boolean not null default false/.test(migration));
check('raw-invite-token-not-stored',/token_hash text not null unique/.test(migration)&&!/\btoken text\b/.test(migration));
check('claim-token-single-use',/redeemed_at is null/.test(claimMigration)&&/update public\.ftn_index_claim_invitations set redeemed_at=now\(\)/.test(claimMigration));
check('claim-rpc-service-role-only',/grant execute on function public\.ftn_index_confirm_invitation\(text,jsonb\) to service_role/.test(claimMigration));
check('confirmation-is-not-endorsement',/not endorsement/i.test(migration)&&/not an FTN endorsement/i.test(fn));
check('no-paid-provider-in-index-function',!/GEMINI_API_KEY|OPENAI_API_KEY|ANTHROPIC_API_KEY|RESEND_API_KEY/.test(fn));
check('claim-function-hashes-token',/crypto\.subtle\.digest\("SHA-256"/.test(fn));
check('category-field-allowlist',/CATEGORY_FIELDS/.test(fn)&&/allowedFields/.test(fn));
check('no-persistent-click-fingerprint',!/user-agent|fingerprint|cf-connecting-ip|x-real-ip/.test(fn));
check('public-page-canonical',/https:\/\/ftnplatform\.org\/index\//.test(html));
check('public-page-free-correction-copy',/correct their own public record free/i.test(html));
check('ftn-red-confirmation-not-blue',/FTN red confirmation mark/i.test(html)&&!/blue check/i.test(html));
check('shared-entity-engine-reused',/EntityMetadataEngine/.test(schema));
check('frictionless-invite-route',/claim-preview/.test(page)&&/claim-confirm/.test(page)&&/new URLSearchParams/.test(page));

for(const item of checks)console.log(`${item.ok?'PASS':'FAIL'} ${item.name}`);
if(process.exitCode)console.error(`FTN Index audit failed: ${checks.filter(x=>!x.ok).length} check(s).`);
else console.log(`FTN Index audit passed: ${checks.length} checks.`);
