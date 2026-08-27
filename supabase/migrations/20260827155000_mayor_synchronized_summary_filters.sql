-- FTN Mayor Mode: filter-synchronized protected summary RPC.
-- Keeps map, list, metrics and correlation signals on the same community/category/status/time state.

create or replace function public.mayor_dashboard_summary_v2(
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
    'period', jsonb_build_object('from',p_from,'to',p_to),
    'community', coalesce(community_filter,'All communities'),
    'category', coalesce(category_filter,'All categories'),
    'status', coalesce(status_filter,'All statuses'),
    'communities', coalesce((select jsonb_agg(name order by name) from public.communities),'[]'::jsonb),
    'totals',(
      select jsonb_build_object(
        'reports',count(*),
        'open',count(*) filter(where status<>'resolved'),
        'resolved',count(*) filter(where status='resolved'),
        'communities',count(distinct nullif(community,''))
      )
      from public.issues
      where created_at>=p_from and created_at<p_to
        and (community_filter is null or lower(community)=lower(community_filter))
        and (category_filter is null or lower(category)=lower(category_filter))
        and (status_filter is null or lower(status)=lower(status_filter))
    ),
    'previous_totals',(
      select jsonb_build_object(
        'reports',count(*),
        'open',count(*) filter(where status<>'resolved'),
        'resolved',count(*) filter(where status='resolved')
      )
      from public.issues
      where created_at>=p_from-(p_to-p_from) and created_at<p_from
        and (community_filter is null or lower(community)=lower(community_filter))
        and (category_filter is null or lower(category)=lower(category_filter))
        and (status_filter is null or lower(status)=lower(status_filter))
    ),
    'categories',coalesce((
      select jsonb_agg(jsonb_build_object('category',category,'count',n) order by n desc,category)
      from (
        select category,count(*)::bigint n
        from public.issues
        where created_at>=p_from and created_at<p_to
          and (community_filter is null or lower(community)=lower(community_filter))
          and (category_filter is null or lower(category)=lower(category_filter))
          and (status_filter is null or lower(status)=lower(status_filter))
        group by category
      ) c
    ),'[]'::jsonb),
    'heat_cells',coalesce((
      select jsonb_agg(jsonb_build_object('count',n) order by n desc)
      from (
        select count(*)::bigint n
        from public.issues
        where created_at>=p_from and created_at<p_to
          and (community_filter is null or lower(community)=lower(community_filter))
          and (category_filter is null or lower(category)=lower(category_filter))
          and (status_filter is null or lower(status)=lower(status_filter))
          and latitude is not null and longitude is not null
        group by round(latitude::numeric,2),round(longitude::numeric,2)
        having count(*)>=3
      ) h
    ),'[]'::jsonb),
    'correlations',coalesce((
      select jsonb_agg(jsonb_build_object(
        'signal',category || ' reports',
        'count',n,
        'basis','Community Connect reports matching the selected filters and period'
      ) order by n desc)
      from (
        select category,count(*)::bigint n
        from public.issues
        where created_at>=p_from and created_at<p_to
          and (community_filter is null or lower(community)=lower(community_filter))
          and (category_filter is null or lower(category)=lower(category_filter))
          and (status_filter is null or lower(status)=lower(status_filter))
        group by category having count(*)>=2
      ) c
    ),'[]'::jsonb)
  );
end
$function$;

revoke all on function public.mayor_dashboard_summary_v2(timestamptz,timestamptz,text,text,text) from public;
revoke all on function public.mayor_dashboard_summary_v2(timestamptz,timestamptz,text,text,text) from anon;
grant execute on function public.mayor_dashboard_summary_v2(timestamptz,timestamptz,text,text,text) to authenticated;
