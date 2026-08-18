-- Add an explicit non-public lifecycle for products retained in FTN's registry but not released.
-- This migration is additive and reversible; it does not delete product controls or user data.

begin;

alter table public.ftn_product_controls
  drop constraint if exists ftn_product_controls_status_check;

alter table public.ftn_product_controls
  add constraint ftn_product_controls_status_check
  check (status in (
    'LIVE',
    'AVAILABLE',
    'PRIVATE',
    'PHASE 2',
    'ILLUSTRATIVE',
    'TEMPORARILY UNAVAILABLE',
    'VAULTED'
  ));

update public.ftn_product_controls
set status = 'VAULTED',
    enabled = false,
    public_visibility = false,
    reason = 'Vaulted by the 2026-08-18 release-truth gate',
    updated_at = now()
where product_id in ('love', 'health');

commit;
