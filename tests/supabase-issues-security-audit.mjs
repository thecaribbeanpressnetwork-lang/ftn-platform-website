// FTN Platform — public.issues security audit (2026-08-25, read-only Supabase RLS/authorization
// audit follow-up). STATIC analysis only -- this repository has no authenticated Supabase
// connection in CI, so these assertions verify the committed SQL text's shape and safety
// properties, not live database behavior. A founder (or a session with live, authenticated
// Supabase access) must independently confirm the same properties against the real deployed
// schema after applying these migrations -- see GOVERNANCE/FTN_Completion_Ledger_2026-08-25.md's
// Supabase audit cycle for the exact live-verification steps.
import fs from 'node:fs';
import assert from 'node:assert/strict';

const forward = fs.readFileSync('supabase/migrations/20260825130000_restrict_issues_raw_coordinate_grant.sql', 'utf8');
const rollback = fs.readFileSync('supabase/rollbacks/20260825130000_restrict_issues_raw_coordinate_grant_rollback.sql', 'utf8');
const priorFix = fs.readFileSync('supabase/migrations/20260825120000_restore_public_issues_read_policy.sql', 'utf8');
const priorRollback = fs.readFileSync('supabase/rollbacks/20260825120000_restore_public_issues_read_policy_rollback.sql', 'utf8');

// --- 1. Rollback files must never be auto-applied by the Supabase CLI's migration scanner. ---
// The CLI only scans supabase/migrations/*.sql; keeping rollbacks in a sibling directory is the
// real, structural guarantee -- not just a naming convention a future session could miss.
assert(!fs.existsSync('supabase/migrations/20260825130000_restrict_issues_raw_coordinate_grant_rollback.sql'), 'the coordinate-fix rollback must NOT live in supabase/migrations/ (would auto-apply on the next db push)');
assert(!fs.existsSync('supabase/migrations/20260825120000_restore_public_issues_read_policy_rollback.sql'), 'the read-policy rollback must NOT live in supabase/migrations/ (would auto-apply on the next db push)');
assert(fs.existsSync('supabase/rollbacks/20260825130000_restrict_issues_raw_coordinate_grant_rollback.sql'));
assert(fs.existsSync('supabase/rollbacks/20260825120000_restore_public_issues_read_policy_rollback.sql'));

// --- 2. Forward migration never touches sensitive columns, only latitude/longitude. ---
assert.match(forward, /revoke select \(latitude, longitude\) on public\.issues from anon, authenticated/i);
for (const sensitive of ['reporter_name', 'reporter_contact', 'photo_data_url', 'metadata']) {
  assert.doesNotMatch(forward, new RegExp('grant select[^;]*' + sensitive, 'i'), `forward migration must never grant column "${sensitive}" to anon/authenticated`);
}
// photo_data_url and metadata are intentionally present in the view, but only as safe literal
// placeholders (null::text / '{}'::jsonb) -- the real check is that the view never reads the
// REAL column (i.e. a bare or table-qualified reference), matching the pattern the original,
// already-reviewed 20260812130000 migration established for these same two columns.
const rebuiltView = forward.match(/create or replace view public\.issues_public[\s\S]*?as coords;/i)[0];
assert.match(rebuiltView, /null::text as photo_data_url/i, 'photo_data_url must remain a literal null placeholder, not a real column read');
assert.match(rebuiltView, /'\{\}'::jsonb as metadata/i, 'metadata must remain a literal empty-object placeholder, not a real column read');
assert.doesNotMatch(rebuiltView, /\bi\.photo_data_url\b|\bi\.metadata\b/i, 'the view must never read the real photo_data_url/metadata columns from the base table');

// --- 3. The view's coordinates come from the rounding function, never a raw column read. ---
const viewBlock = forward.match(/create or replace view public\.issues_public[\s\S]*?from public\.issues i[\s\S]*?as coords;/i);
assert(viewBlock, 'forward migration must rebuild public.issues_public');
assert.doesNotMatch(viewBlock[0], /\bi\.latitude\b|\bi\.longitude\b/, 'the rebuilt view must never read raw i.latitude/i.longitude directly -- only through issue_public_coordinates()');
assert.match(viewBlock[0], /coords\.latitude, coords\.longitude/, 'the view must source coordinates from the rounding function\'s output columns');

// --- 4. The rounding function only ever returns a rounded value, never the raw column. ---
const fnBlock = forward.match(/create or replace function public\.issue_public_coordinates[\s\S]*?\$func\$;/i);
assert(fnBlock, 'forward migration must define issue_public_coordinates()');
assert.match(fnBlock[0], /round\(i\.latitude::numeric, 3\)/, 'latitude must be rounded to 3 decimal places (~110m), never returned raw');
assert.match(fnBlock[0], /round\(i\.longitude::numeric, 3\)/, 'longitude must be rounded to 3 decimal places, never returned raw');
assert.match(fnBlock[0], /security definer/i, 'the function must be security definer -- it needs to read the now-revoked raw columns on the caller\'s behalf');
assert.match(forward, /revoke all on function public\.issue_public_coordinates\(uuid\) from public/i, 'the function must not be callable by the generic PUBLIC role -- only the two named app roles');
assert.match(forward, /grant execute on function public\.issue_public_coordinates\(uuid\) to anon, authenticated/i);

// --- 5. Forward migration is additive/narrowing only -- no DROP TABLE, no data mutation, no ---
// broadening of any existing grant beyond what this migration's own stated purpose requires.
for (const destructive of [/drop table/i, /truncate/i, /delete from public\.issues\b/i, /update public\.issues\b/i]) {
  assert.doesNotMatch(forward, destructive, `forward migration must never contain a destructive statement matching ${destructive}`);
}

// --- 6. Rollback correctly restores the pre-fix state and cleans up the new function. ---
assert.match(rollback, /grant select \(latitude, longitude\) on public\.issues to anon, authenticated/i);
assert.match(rollback, /drop function if exists public\.issue_public_coordinates\(uuid\)/i);
assert.doesNotMatch(rollback, /drop table|truncate|delete from public\.issues\b/i, 'rollback must never be destructive to table structure or data');

// --- 7. The prior (already-committed) read-policy migration: verify its own safety claims match ---
// its actual SQL, not just its comment. This is the same static-verification discipline applied to
// the new migration, extended to the one this pass was specifically asked to re-check.
assert.match(priorFix, /create policy "Public read redacted issues" on public\.issues\s*\n\s*for select\s*\n\s*to anon, authenticated\s*\n\s*using \(true\)/i, 'the row policy must be exactly what its own comment describes -- a plain SELECT-visibility policy, no hidden WHERE-clause narrowing and no broadening to other commands');
assert.doesNotMatch(priorFix, /for (insert|update|delete)/i, 'this migration must only ever add a SELECT policy -- never quietly add write access');
assert.match(priorRollback, /drop policy if exists "Public read redacted issues" on public\.issues/i);

console.log('FTN public.issues security audit (static): both new migrations verified column-safe (never touch reporter_name/reporter_contact/photo_data_url/metadata), the coordinate fix never exposes a raw lat/long value through the rebuilt view or function, both migrations are additive/narrowing only with zero destructive statements, and both have a real rollback file kept outside supabase/migrations/ so it can never auto-apply. NOTE: this is static SQL analysis only -- no live database connection was available in this session; live re-verification against the deployed schema is still required before/after applying.');
