-- Private founder action register for owner-only provider, affiliate and setup work.
create table if not exists public.ftn_founder_actions (
  action_id text primary key check (action_id ~ '^[a-z0-9][a-z0-9.-]{1,119}$'),
  area text not null,
  title text not null,
  owner_action text not null,
  status text not null default 'PENDING' check (status in ('PENDING','APPROVED','COMPLETE','DEFERRED')),
  requires_owner_approval boolean not null default true,
  official_url text check (official_url is null or official_url ~ '^https://'),
  last_verified date,
  notes text,
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);
alter table public.ftn_founder_actions enable row level security;
revoke all on public.ftn_founder_actions from anon, authenticated;

insert into public.ftn_founder_actions(action_id,area,title,owner_action,status,requires_owner_approval,official_url,last_verified,notes) values
  ('screen-affiliate-review','FTN Screen','Review legitimate filmmaker-tool affiliate programmes','Confirm programme terms and brand fit before FTN creates any account or publishes an affiliate link.','PENDING',true,null,'2026-08-12','No affiliate availability is claimed in the public catalogue until verified and approved.'),
  ('screen-partnership-outreach','FTN Screen','Approve filmmaker-tool and festival outreach','Approve each recipient, message and sender identity before any external partnership outreach is sent.','PENDING',true,null,'2026-08-12','No outreach is sent automatically.'),
  ('support-account-review','FTN InvestIn','Approve any external support-account setup','Choose and approve the provider at the final account-creation step; verify ownership, payout, tax, legal and brand settings.','PENDING',true,null,'2026-08-12','The public FTN InvestIn page routes to the internal FTN contact form until a support destination is verified.'),
  ('google-consent-branding','FTN Account','Complete Google OAuth consent-screen identity review','In Google Cloud, verify the FTN Platform app name, logo, homepage, authorized domains, privacy URL, terms URL and production redirect URIs.','PENDING',true,'https://console.cloud.google.com/apis/credentials/consent','2026-08-12','Owner-only provider access is required; never store OAuth secrets in this register.')
on conflict(action_id) do nothing;

create index if not exists ftn_founder_actions_status_idx on public.ftn_founder_actions(status,updated_at desc);
comment on table public.ftn_founder_actions is 'Private owner-only action register. No external account or outreach action is automatic.';
