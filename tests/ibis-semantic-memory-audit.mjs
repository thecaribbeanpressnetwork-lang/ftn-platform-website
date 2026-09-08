import fs from 'node:fs';
import assert from 'node:assert/strict';

const path = 'supabase/migrations/20260908044500_ibis_semantic_memory_foundation.sql';
assert.ok(fs.existsSync(path), 'semantic-memory migration must exist');
const sql = fs.readFileSync(path, 'utf8');

for (const required of [
  /create extension if not exists vector/i,
  /embedding\s+extensions\.vector\(384\)/i,
  /embedding_model\s+text/i,
  /salience\s+numeric/i,
  /memory_status\s+text/i,
  /using hnsw\s*\(embedding extensions\.vector_cosine_ops\)/i,
  /create or replace function public\.match_ibis_personal_context/i,
  /c\.user_id\s*=\s*auth\.uid\(\)/i,
  /security invoker/i,
  /grant execute .* to authenticated/i,
]) {
  assert.match(sql, required);
}

assert.doesNotMatch(sql, /security definer/i, 'semantic recall must not bypass RLS');
assert.doesNotMatch(sql, /service_role/i, 'migration must not grant browser-visible service-role access');
assert.doesNotMatch(sql, /grant execute .* to anon/i, 'guest users must not receive signed-in memory RPC access');

console.log('ibis semantic memory foundation audit passed');
