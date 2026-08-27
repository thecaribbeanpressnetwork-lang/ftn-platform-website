-- FTN Index trust boundary: communication consent is not reputation evidence.
-- A recipient opt-out may suppress future outreach only. It MUST NOT alter entity status,
-- verification freshness, trust/reputation scoring, or imply that a business is closed.

comment on column public.ftn_index_outreach_queue.do_not_contact is
  'Communication preference only. Must not affect FTN trust/reputation scoring, public entity status, verification freshness, or closure inference.';

comment on table public.ftn_index_outreach_events is
  'Operational outreach audit trail. recipient-optout is not evidence of closure, unreliability, or low trust.';
