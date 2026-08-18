-- Support operator review and auth-user lifecycle lookups without scanning privacy requests.
create index if not exists ftn_account_requests_operator_idx
on public.ftn_account_requests(operator_id)
where operator_id is not null;
