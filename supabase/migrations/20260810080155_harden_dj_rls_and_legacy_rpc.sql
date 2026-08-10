-- Harden dormant/internal DJ tables without changing the current public YouTube-backed DJ flow.

-- Trigger helpers should not inherit a caller-controlled search_path.
alter function public.dj_touch_video_updated_at() set search_path = public;
alter function public.fdm_dj_profiles_updated_at() set search_path = public;

-- The legacy view-counter RPC is not used by the current FTN DJ website and should
-- not remain anonymously callable as SECURITY DEFINER. Keep service-role access only
-- for a future rate-limited server-side counter if the internal catalogue is activated.
revoke execute on function public.dj_increment_view(uuid) from public, anon, authenticated;
grant execute on function public.dj_increment_view(uuid) to service_role;

-- Cover user foreign keys used for account cleanup and ownership queries.
create index if not exists dj_video_likes_user_id_idx on public.dj_video_likes(user_id);
create index if not exists dj_video_views_user_id_idx on public.dj_video_views(user_id);

-- Avoid per-row auth.uid() re-evaluation in RLS policies.
drop policy if exists "users can create own creator profile" on public.dj_creators;
create policy "users can create own creator profile" on public.dj_creators
for insert to authenticated
with check (user_id = (select auth.uid()));

drop policy if exists "users can update own creator profile" on public.dj_creators;
create policy "users can update own creator profile" on public.dj_creators
for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

drop policy if exists "users can like videos" on public.dj_video_likes;
create policy "users can like videos" on public.dj_video_likes
for insert to authenticated
with check (user_id = (select auth.uid()));

drop policy if exists "users can unlike own likes" on public.dj_video_likes;
create policy "users can unlike own likes" on public.dj_video_likes
for delete to authenticated
using (user_id = (select auth.uid()));

drop policy if exists "users can create views" on public.dj_video_views;
create policy "users can create views" on public.dj_video_views
for insert to anon, authenticated
with check (user_id is null or user_id = (select auth.uid()));

-- Consolidate authenticated SELECT into one policy while keeping anonymous public
-- access limited to published catalogue entries.
drop policy if exists "public can view published dj videos" on public.dj_videos;
drop policy if exists "creators can view own videos" on public.dj_videos;
create policy "anonymous can view published dj videos" on public.dj_videos
for select to anon
using (status = 'published');
create policy "authenticated can view published or own dj videos" on public.dj_videos
for select to authenticated
using (
  status = 'published'
  or creator_id in (
    select id from public.dj_creators where user_id = (select auth.uid())
  )
);

drop policy if exists "creators can insert own videos" on public.dj_videos;
create policy "creators can insert own videos" on public.dj_videos
for insert to authenticated
with check (
  creator_id in (
    select id from public.dj_creators where user_id = (select auth.uid())
  )
);

drop policy if exists "creators can update own videos" on public.dj_videos;
create policy "creators can update own videos" on public.dj_videos
for update to authenticated
using (
  creator_id in (
    select id from public.dj_creators where user_id = (select auth.uid())
  )
)
with check (
  creator_id in (
    select id from public.dj_creators where user_id = (select auth.uid())
  )
);

drop policy if exists "creators can delete own videos" on public.dj_videos;
create policy "creators can delete own videos" on public.dj_videos
for delete to authenticated
using (
  creator_id in (
    select id from public.dj_creators where user_id = (select auth.uid())
  )
);
