-- ibis semantic memory foundation (funding-demo branch only until applied through a safe Supabase branch).
-- Extends the existing RLS-protected ibis_personal_context table; does not create a second datastore.

create extension if not exists vector with schema extensions;

alter table public.ibis_personal_context
  add column if not exists embedding extensions.vector(384),
  add column if not exists embedding_model text,
  add column if not exists embedding_updated_at timestamptz,
  add column if not exists salience numeric not null default 0.5,
  add column if not exists last_accessed_at timestamptz,
  add column if not exists memory_status text not null default 'active',
  add column if not exists conflict_group uuid,
  add column if not exists superseded_by uuid;

alter table public.ibis_personal_context
  drop constraint if exists ibis_personal_context_salience_check,
  add constraint ibis_personal_context_salience_check
    check (salience >= 0 and salience <= 1),
  drop constraint if exists ibis_personal_context_memory_status_check,
  add constraint ibis_personal_context_memory_status_check
    check (memory_status in ('active','superseded','disputed')),
  drop constraint if exists ibis_personal_context_superseded_by_fkey,
  add constraint ibis_personal_context_superseded_by_fkey
    foreign key (superseded_by) references public.ibis_personal_context(id) on delete set null;

create index if not exists ibis_personal_context_user_recall_idx
  on public.ibis_personal_context (user_id, namespace, memory_status, pinned desc, salience desc, updated_at desc);

-- HNSW is appropriate for incremental inserts and does not require a training pass.
-- cosine distance matches normalized text-embedding retrieval well.
create index if not exists ibis_personal_context_embedding_hnsw_idx
  on public.ibis_personal_context
  using hnsw (embedding extensions.vector_cosine_ops)
  where embedding is not null and memory_status = 'active';

create or replace function public.match_ibis_personal_context(
  query_embedding extensions.vector(384),
  match_count integer default 8,
  min_similarity double precision default 0.25,
  namespace_filter text default null
)
returns table (
  id uuid,
  namespace text,
  context_key text,
  kind text,
  content jsonb,
  source text,
  confidence numeric,
  pinned boolean,
  salience numeric,
  updated_at timestamptz,
  similarity double precision
)
language sql
stable
security invoker
set search_path = public, extensions
as $$
  select
    c.id,
    c.namespace,
    c.context_key,
    c.kind,
    c.content,
    c.source,
    c.confidence,
    c.pinned,
    c.salience,
    c.updated_at,
    (1 - (c.embedding <=> query_embedding))::double precision as similarity
  from public.ibis_personal_context c
  where c.user_id = auth.uid()
    and c.memory_status = 'active'
    and c.embedding is not null
    and (namespace_filter is null or c.namespace = namespace_filter)
    and (1 - (c.embedding <=> query_embedding)) >= min_similarity
  order by
    c.pinned desc,
    (0.72 * (1 - (c.embedding <=> query_embedding)) + 0.18 * c.salience + 0.10 * greatest(0, 1 - extract(epoch from (now() - c.updated_at)) / 7776000.0)) desc
  limit greatest(1, least(match_count, 50));
$$;

revoke all on function public.match_ibis_personal_context(extensions.vector, integer, double precision, text) from public;
grant execute on function public.match_ibis_personal_context(extensions.vector, integer, double precision, text) to authenticated;

comment on function public.match_ibis_personal_context is
  'RLS-aware semantic recall for the signed-in user. Ranking blends cosine similarity, salience and recency; pinned memories remain first.';
