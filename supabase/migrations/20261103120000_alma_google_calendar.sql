-- Google Calendar: conexión por tenant y estado de cada evento administrado por ALMA.
create table public.alma_google_calendar_accounts (
  tenant_id uuid primary key references public.alma_tenants(id) on delete cascade,
  access_token_enc text not null,
  refresh_token_enc text not null,
  expires_at timestamptz not null,
  connected_at timestamptz not null default now()
);

create table public.alma_google_calendar_events (
  appointment_id uuid primary key references public.alma_appointments(id) on delete cascade,
  tenant_id uuid not null references public.alma_tenants(id) on delete cascade,
  event_id text not null,
  sync_state text not null check (sync_state in ('pending', 'synced', 'error')),
  updated_at timestamptz not null default now(),
  unique (tenant_id, event_id)
);
create index alma_google_calendar_events_tenant_idx on public.alma_google_calendar_events(tenant_id);

alter table public.alma_google_calendar_accounts enable row level security;
alter table public.alma_google_calendar_events enable row level security;
revoke all on public.alma_google_calendar_accounts, public.alma_google_calendar_events from anon, authenticated;
create policy alma_google_calendar_accounts_select on public.alma_google_calendar_accounts
  for select to authenticated using (tenant_id = public.alma_current_tenant_id());
create policy alma_google_calendar_events_select on public.alma_google_calendar_events
  for select to authenticated using (tenant_id = public.alma_current_tenant_id());
grant select (tenant_id, connected_at) on public.alma_google_calendar_accounts to authenticated;
grant select (tenant_id, appointment_id, sync_state, updated_at) on public.alma_google_calendar_events to authenticated;
