-- Preserve QA/test submissions for audit history while keeping them out of live public civic data.
-- is_test is server-controlled: existing browser grants do not include this newly added column.

alter table public.issues add column if not exists is_test boolean not null default false;

update public.issues
set is_test = true
where case_number in ('FTN-VERIFY-TEST-RELEASE','FTN-20260825-6GWS');

-- Replace the public row policy: test records remain stored but are not part of public Community Connect data.
drop policy if exists "Public read redacted issues" on public.issues;
create policy "Public read redacted issues" on public.issues
  for select to anon, authenticated
  using (not is_test);

-- The active Mayor map feed uses the same operational-record boundary.
create or replace function public.mayor_map_data(
  p_from timestamptz default now() - interval '30 days',
  p_to timestamptz default now(),
  p_community text default null,
  p_category text default null,
  p_status text default null
)
returns jsonb language plpgsql stable security definer set search_path=''
as $function$
declare
  community_filter text := nullif(btrim(p_community), '');
  category_filter text := nullif(btrim(p_category), '');
  status_filter text := nullif(btrim(p_status), '');
begin
  if (select auth.uid()) is null or not private.has_active_mayor_access() then raise exception 'Mayor access required' using errcode='42501'; end if;
  if p_from is null or p_to is null or p_from>=p_to or p_to-p_from>interval '366 days' then raise exception 'Invalid reporting period'; end if;
  return jsonb_build_object(
    'period',jsonb_build_object('from',p_from,'to',p_to),
    'privacy',jsonb_build_object('coordinate_precision_decimals',3,'precise_locations_exposed',false,'reporter_identity_exposed',false),
    'reports',coalesce((select jsonb_agg(jsonb_build_object('id',q.id,'case_number',q.case_number,'title',q.title,'category',q.category,'community',q.community,'status',q.status,'lifecycle_status',q.lifecycle_status,'created_at',q.created_at,'latitude',q.latitude,'longitude',q.longitude) order by q.created_at desc)
      from (select i.id,i.case_number,i.title,i.category,i.community,i.status,i.lifecycle_status,i.created_at,round(i.latitude::numeric,3)::double precision latitude,round(i.longitude::numeric,3)::double precision longitude
        from public.issues i where not i.is_test and i.created_at>=p_from and i.created_at<p_to and i.latitude is not null and i.longitude is not null
          and (community_filter is null or lower(i.community)=lower(community_filter)) and (category_filter is null or lower(i.category)=lower(category_filter)) and (status_filter is null or lower(i.status)=lower(status_filter))
        order by i.created_at desc limit 500) q),'[]'::jsonb)
  );
end $function$;

-- The active synchronized summary uses that same boundary for every calculation.
create or replace function public.mayor_dashboard_summary_v2(
  p_from timestamptz default now() - interval '30 days', p_to timestamptz default now(), p_community text default null, p_category text default null, p_status text default null
) returns jsonb language plpgsql stable security definer set search_path=''
as $function$
declare
  community_filter text := nullif(btrim(p_community),''); category_filter text := nullif(btrim(p_category),''); status_filter text := nullif(btrim(p_status),'');
begin
  if (select auth.uid()) is null or not private.has_active_mayor_access() then raise exception 'Mayor access required' using errcode='42501'; end if;
  if p_from is null or p_to is null or p_from>=p_to or p_to-p_from>interval '366 days' then raise exception 'Invalid reporting period'; end if;
  return jsonb_build_object(
    'period',jsonb_build_object('from',p_from,'to',p_to),'community',coalesce(community_filter,'All communities'),'category',coalesce(category_filter,'All categories'),'status',coalesce(status_filter,'All statuses'),
    'communities',coalesce((select jsonb_agg(name order by name) from public.communities),'[]'::jsonb),
    'totals',(select jsonb_build_object('reports',count(*),'open',count(*) filter(where status<>'resolved'),'resolved',count(*) filter(where status='resolved'),'communities',count(distinct nullif(community,''))) from public.issues where not is_test and created_at>=p_from and created_at<p_to and (community_filter is null or lower(community)=lower(community_filter)) and (category_filter is null or lower(category)=lower(category_filter)) and (status_filter is null or lower(status)=lower(status_filter))),
    'previous_totals',(select jsonb_build_object('reports',count(*),'open',count(*) filter(where status<>'resolved'),'resolved',count(*) filter(where status='resolved')) from public.issues where not is_test and created_at>=p_from-(p_to-p_from) and created_at<p_from and (community_filter is null or lower(community)=lower(community_filter)) and (category_filter is null or lower(category)=lower(category_filter)) and (status_filter is null or lower(status)=lower(status_filter))),
    'categories',coalesce((select jsonb_agg(jsonb_build_object('category',category,'count',n) order by n desc,category) from (select category,count(*)::bigint n from public.issues where not is_test and created_at>=p_from and created_at<p_to and (community_filter is null or lower(community)=lower(community_filter)) and (category_filter is null or lower(category)=lower(category_filter)) and (status_filter is null or lower(status)=lower(status_filter)) group by category)c),'[]'::jsonb),
    'heat_cells',coalesce((select jsonb_agg(jsonb_build_object('count',n) order by n desc) from (select count(*)::bigint n from public.issues where not is_test and created_at>=p_from and created_at<p_to and (community_filter is null or lower(community)=lower(community_filter)) and (category_filter is null or lower(category)=lower(category_filter)) and (status_filter is null or lower(status)=lower(status_filter)) and latitude is not null and longitude is not null group by round(latitude::numeric,2),round(longitude::numeric,2) having count(*)>=3)h),'[]'::jsonb),
    'correlations',coalesce((select jsonb_agg(jsonb_build_object('signal',category||' reports','count',n,'basis','Community Connect reports matching the selected filters and period') order by n desc) from (select category,count(*)::bigint n from public.issues where not is_test and created_at>=p_from and created_at<p_to and (community_filter is null or lower(community)=lower(community_filter)) and (category_filter is null or lower(category)=lower(category_filter)) and (status_filter is null or lower(status)=lower(status_filter)) group by category having count(*)>=2)c),'[]'::jsonb)
  );
end $function$;
