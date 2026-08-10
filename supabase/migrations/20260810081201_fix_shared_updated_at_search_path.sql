-- Prevent the shared updated_at helper from inheriting a caller-controlled search_path.
alter function public.set_updated_at() set search_path = public;
