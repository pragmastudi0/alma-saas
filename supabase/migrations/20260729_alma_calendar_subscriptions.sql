-- Sincronización con Calendarios (iCal/CalDAV)
-- F10: Permite que los usuarios suscriban un feed iCal en Apple Calendar, Google Calendar, etc.

create table public.alma_calendar_subscriptions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.alma_tenants(id) on delete cascade,
  subscription_token text unique not null,  -- token opaco (UUID) para la URL pública
  calendar_type text not null default 'ical',  -- 'ical' (future: 'caldav')
  created_at timestamptz default now(),
  last_accessed_at timestamptz,

  constraint alma_calendar_subscriptions_tenant_fk
    foreign key (tenant_id) references public.alma_tenants(id)
);

-- Índices para performance
create index alma_calendar_subscriptions_token_idx
  on public.alma_calendar_subscriptions(subscription_token);

create index alma_calendar_subscriptions_tenant_idx
  on public.alma_calendar_subscriptions(tenant_id);

-- RLS: Solo el tenant puede ver/acceder su propia suscripción
alter table public.alma_calendar_subscriptions enable row level security;

create policy "Tenants can view their own calendar subscriptions"
  on public.alma_calendar_subscriptions
  for select
  using (tenant_id = alma_current_tenant_id());

create policy "Tenants can create their own calendar subscriptions"
  on public.alma_calendar_subscriptions
  for insert
  with check (tenant_id = alma_current_tenant_id());

create policy "Tenants can update their own calendar subscriptions"
  on public.alma_calendar_subscriptions
  for update
  using (tenant_id = alma_current_tenant_id())
  with check (tenant_id = alma_current_tenant_id());

create policy "Tenants can delete their own calendar subscriptions"
  on public.alma_calendar_subscriptions
  for delete
  using (tenant_id = alma_current_tenant_id());

-- Trigger para actualizar last_accessed_at (opcional, para auditoría)
-- Se puede usar desde el endpoint de lectura de iCal para trackear acceso
