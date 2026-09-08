import fs from 'node:fs';
import assert from 'node:assert/strict';

const sql = fs.readFileSync('supabase/migrations/20260908201055_move_privileged_rpc_implementations_private.sql', 'utf8');
const aclSql = fs.readFileSync('supabase/migrations/20260908201636_enforce_privileged_rpc_wrapper_acl.sql', 'utf8');
const signatures = [
  'issue_public_coordinates\\(uuid\\)',
  'register_founder\\(text,text,text,text,uuid\\)',
  'ibis_memory_snapshot\\(text,integer\\)',
  'ibis_memory_upsert\\(text,text,text,text,text,text,date,timestamptz,text,text,jsonb\\)',
  'ibis_memory_archive\\(text\\)',
  'mayor_dashboard_summary\\(timestamptz,timestamptz,text\\)',
  'mayor_dashboard_summary_v2\\(timestamptz,timestamptz,text,text,text\\)',
  'mayor_map_data\\(timestamptz,timestamptz,text,text,text\\)',
  'mayor_operational_snapshot\\(\\)',
  'mayor_record_archive\\(text,text\\)',
  'mayor_record_upsert\\(text,text,text,text,text,text,numeric,text,timestamptz,text,jsonb\\)',
];

for (const signature of signatures) {
  assert.match(sql, new RegExp(`alter function public\\.${signature} set schema private`, 'i'), `must move ${signature} to private`);
}

for (const name of ['issue_public_coordinates','register_founder','ibis_memory_snapshot','ibis_memory_upsert','ibis_memory_archive','mayor_dashboard_summary','mayor_dashboard_summary_v2','mayor_map_data','mayor_operational_snapshot','mayor_record_archive','mayor_record_upsert']) {
  const wrapper = sql.match(new RegExp(`create function public\\.${name}\\([\\s\\S]*?\\$\\$;`, 'i'));
  assert(wrapper, `must preserve public wrapper ${name}`);
  assert.match(wrapper[0], /security invoker/i, `${name} wrapper must execute as caller`);
  assert.doesNotMatch(wrapper[0], /security definer/i, `${name} wrapper must not bypass caller privileges`);
  assert.match(wrapper[0], new RegExp(`private\\.${name}\\(`, 'i'), `${name} wrapper must delegate to private implementation`);
}

assert.match(sql, /grant execute on function public\.register_founder\(text,text,text,text,uuid\) to anon;/i);
assert.doesNotMatch(sql, /grant execute on function public\.register_founder\(text,text,text,text,uuid\) to authenticated/i);
assert.match(sql, /grant execute on function public\.issue_public_coordinates\(uuid\) to anon, authenticated;/i);
assert.match(aclSql, /revoke execute on function public\.register_founder\(text,text,text,text,uuid\) from authenticated;/i);
for (const name of ['ibis_memory_snapshot','ibis_memory_upsert','ibis_memory_archive','mayor_dashboard_summary','mayor_dashboard_summary_v2','mayor_map_data','mayor_operational_snapshot','mayor_record_archive','mayor_record_upsert']) {
  assert.match(aclSql, new RegExp(`revoke execute on function public\\.${name}\\(`, 'i'), `${name} must explicitly revoke anon defaults`);
}
assert.doesNotMatch(sql, /drop table|truncate|delete from|update\s+(public|private)\./i, 'boundary migration must not mutate data');
assert.doesNotMatch(aclSql, /drop table|truncate|delete from|update\s+(public|private)\./i, 'ACL migration must not mutate data');

console.log('FTN privileged RPC boundary audit: 11 privileged implementations moved private, public signatures preserved as invoker wrappers, and grants remain least-privilege.');
