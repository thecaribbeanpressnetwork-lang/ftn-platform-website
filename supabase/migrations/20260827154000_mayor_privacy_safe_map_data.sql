-- FTN Mayor Mode: protected privacy-safe map feed for authorized Mayor users.
-- Reuses the existing private.has_active_mayor_access() gate and Community Connect issues table.
-- No reporter identity/contact, evidence paths, photos, metadata or raw precise coordinates leave the function.
-- Coordinates are deliberately generalized to 3 decimals (~110m latitude) even for this pilot surface.

create or replace function public.mayor_map_data(
  p_from timestamptz default now() - interval '30 days',
  p_to timestamptz default now(),
  p_community text default null,
  p_category text default null,
  p_status text default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  community_filter text := nullif(btrim(p_community), '');
  category_filter text := nullif(btrim(p_category), '');
  status_filter text := nullif(btrim(p_status), '');
begin
  if (select auth.uid()) is null or not private.has_active_mayor_access() then
    raise exception 'Mayor access required' using errcode = '42501';
  end if;

  if p_from is null or p_to is null or p_from >= p_to or p_to - p_from > interval '366 days' then
    raise exception 'Invalid reporting period';
  end if;

  return jsonb_build_object(
    'period', jsonb_build_object('from', p_from, 'to', p_to),
    'privacy', jsonb_build_object(
      'coordinate_precision_decimals', 3,
      'precise_locations_exposed', false,
      'reporter_identity_exposed', false
    ),
    'reports', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', q.id,
          'case_number', q.case_number,
          'title', q.title,
          'category', q.category,
          'community', q.community,
          'status', q.status,
          'lifecycle_status', q.lifecycle_status,
          'created_at', q.created_at,
          'latitude', q.latitude,
          'longitude', q.longitude
        ) order by q.created_at desc
      )
      from (
        select
          i.id,
          i.case_number,
          i.title,
          i.category,
          i.community,
          i.status,
          i.lifecycle_status,
          i.created_at,
          round(i.latitude::numeric, 3)::double precision as latitude,
          round(i.longitude::numeric, 3)::double precision as longitude
        from public.issues i
        where i.created_at >= p_from
          and i.created_at < p_to
          and i.latitude is not null
          and i.longitude is not null
          and (community_filter is null or lower(i.community) = lower(community_filter))
          and (category_filter is null or lower(i.category) = lower(category_filter))
          and (status_filter is null or lower(i.status) = lower(status_filter))
        order by i.created_at desc
        limit 500
      ) q
    ), '[]'::jsonb)
  );
end
$function$;

revoke all on function public.mayor_map_data(timestamptz,timestamptz,text,text,text) from public;
revoke all on function public.mayor_map_data(timestamptz,timestamptz,text,text,text) from anon;
grant execute on function public.mayor_map_data(timestamptz,timestamptz,text,text,text) to authenticated;
