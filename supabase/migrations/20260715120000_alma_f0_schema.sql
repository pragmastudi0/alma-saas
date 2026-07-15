-- alma · F0 — Esquema núcleo multi-tenant con RLS
-- Proyecto Supabase compartido: todas las tablas y funciones llevan prefijo alma_.

-- ============================================================
-- Tablas
-- ============================================================

create table public.alma_tenants (
  id uuid primary key default gen_random_uuid(),
  nombre text not null default '',
  profesion text not null default 'nutricionista',
  pais text not null default 'AR',
  timezone text not null default 'America/Argentina/Buenos_Aires',
  settings jsonb not null default '{"alias_mp": null, "precio_default": 15000, "sena_default": 5000, "duracion_default": 45, "theme": "light"}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.alma_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  tenant_id uuid not null references public.alma_tenants (id) on delete cascade,
  nombre text not null default '',
  rol text not null default 'owner',
  created_at timestamptz not null default now()
);

create index alma_profiles_tenant_idx on public.alma_profiles (tenant_id);

create table public.alma_patients (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.alma_tenants (id) on delete cascade,
  nombre text not null,
  telefono text not null default '',
  email text not null default '',
  notas text not null default '',
  created_at timestamptz not null default now()
);

create index alma_patients_tenant_idx on public.alma_patients (tenant_id);

create table public.alma_appointments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.alma_tenants (id) on delete cascade,
  patient_id uuid not null references public.alma_patients (id) on delete cascade,
  fecha date not null,
  hora time not null,
  duracion_min int not null check (duracion_min > 0),
  precio numeric(12, 2) not null default 0 check (precio >= 0),
  sena_monto numeric(12, 2) not null default 0 check (sena_monto >= 0),
  sena_pagada boolean not null default false,
  estado text not null check (estado in ('pendiente_sena', 'confirmado', 'completado', 'cancelado', 'ausente')),
  mp_payment_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index alma_appointments_tenant_fecha_idx on public.alma_appointments (tenant_id, fecha);
create index alma_appointments_patient_idx on public.alma_appointments (patient_id);

create table public.alma_payments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.alma_tenants (id) on delete cascade,
  appointment_id uuid references public.alma_appointments (id) on delete set null,
  mp_id text not null,
  monto numeric(12, 2) not null,
  status text not null,
  raw jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  -- Base de la idempotencia del webhook de Mercado Pago (F3)
  unique (tenant_id, mp_id)
);

create index alma_payments_tenant_idx on public.alma_payments (tenant_id);

create table public.alma_cash_entries (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.alma_tenants (id) on delete cascade,
  fecha date not null default current_date,
  tipo text not null check (tipo in ('ingreso', 'gasto')),
  categoria text not null,
  descripcion text not null default '',
  monto numeric(12, 2) not null check (monto > 0),
  appointment_id uuid references public.alma_appointments (id) on delete set null,
  created_at timestamptz not null default now()
);

create index alma_cash_entries_tenant_fecha_idx on public.alma_cash_entries (tenant_id, fecha);

create table public.alma_availability (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.alma_tenants (id) on delete cascade,
  dia_semana int not null check (dia_semana between 0 and 6),
  hora_desde time not null,
  hora_hasta time not null,
  check (hora_desde < hora_hasta)
);

create index alma_availability_tenant_idx on public.alma_availability (tenant_id);

create table public.alma_agenda_blocks (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.alma_tenants (id) on delete cascade,
  fecha date not null,
  hora_desde time,
  hora_hasta time,
  motivo text not null default '',
  check ((hora_desde is null) = (hora_hasta is null)),
  check (hora_desde is null or hora_desde < hora_hasta)
);

create index alma_agenda_blocks_tenant_fecha_idx on public.alma_agenda_blocks (tenant_id, fecha);

-- updated_at automático en turnos
create or replace function public.alma_set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger alma_appointments_updated_at
  before update on public.alma_appointments
  for each row execute function public.alma_set_updated_at();

-- ============================================================
-- Funciones de tenant
-- ============================================================

-- Tenant del usuario autenticado. SECURITY DEFINER para poder leer
-- alma_profiles desde dentro de las políticas sin recursión.
create or replace function public.alma_current_tenant_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select tenant_id from public.alma_profiles where user_id = auth.uid();
$$;

revoke all on function public.alma_current_tenant_id() from public, anon;
grant execute on function public.alma_current_tenant_id() to authenticated;

-- Alta idempotente de tenant + profile en el primer login.
-- Evita triggers sobre auth.users (proyecto compartido con otras apps).
create or replace function public.alma_bootstrap_tenant(p_nombre text default '')
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_tenant uuid;
begin
  if v_user is null then
    raise exception 'no autenticado';
  end if;

  -- serializa llamadas concurrentes del mismo usuario
  perform pg_advisory_xact_lock(hashtext('alma_bootstrap:' || v_user::text));

  select tenant_id into v_tenant from public.alma_profiles where user_id = v_user;
  if v_tenant is not null then
    return v_tenant;
  end if;

  insert into public.alma_tenants (nombre) values (coalesce(p_nombre, ''))
  returning id into v_tenant;

  insert into public.alma_profiles (user_id, tenant_id, nombre)
  values (v_user, v_tenant, coalesce(p_nombre, ''));

  return v_tenant;
end;
$$;

revoke all on function public.alma_bootstrap_tenant(text) from public, anon;
grant execute on function public.alma_bootstrap_tenant(text) to authenticated;

-- ============================================================
-- RLS
-- ============================================================

alter table public.alma_tenants enable row level security;
alter table public.alma_profiles enable row level security;
alter table public.alma_patients enable row level security;
alter table public.alma_appointments enable row level security;
alter table public.alma_payments enable row level security;
alter table public.alma_cash_entries enable row level security;
alter table public.alma_availability enable row level security;
alter table public.alma_agenda_blocks enable row level security;

-- anon no toca nada de alma (belt & suspenders además de RLS sin políticas)
revoke all on public.alma_tenants, public.alma_profiles, public.alma_patients,
  public.alma_appointments, public.alma_payments, public.alma_cash_entries,
  public.alma_availability, public.alma_agenda_blocks from anon;

-- tenants: el propio, sin insert/delete (el alta es vía alma_bootstrap_tenant)
create policy alma_tenants_select on public.alma_tenants
  for select to authenticated using (id = public.alma_current_tenant_id());
create policy alma_tenants_update on public.alma_tenants
  for update to authenticated
  using (id = public.alma_current_tenant_id())
  with check (id = public.alma_current_tenant_id());
-- columnas mutables acotadas: nunca id/created_at
revoke update on public.alma_tenants from authenticated;
grant update (nombre, profesion, timezone, settings) on public.alma_tenants to authenticated;

-- profiles: solo el propio; tenant_id y rol no editables por el cliente
create policy alma_profiles_select on public.alma_profiles
  for select to authenticated using (user_id = auth.uid());
create policy alma_profiles_update on public.alma_profiles
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
revoke insert, update, delete on public.alma_profiles from authenticated;
grant update (nombre) on public.alma_profiles to authenticated;

-- payments: solo lectura para el cliente; escribe el servidor (webhook MP, F3)
create policy alma_payments_select on public.alma_payments
  for select to authenticated using (tenant_id = public.alma_current_tenant_id());
revoke insert, update, delete on public.alma_payments from authenticated;

-- resto de tablas de negocio: CRUD completo aislado por tenant
do $$
declare
  t text;
begin
  foreach t in array array['alma_patients', 'alma_appointments', 'alma_cash_entries', 'alma_availability', 'alma_agenda_blocks']
  loop
    execute format(
      'create policy %1$s_select on public.%1$s for select to authenticated using (tenant_id = public.alma_current_tenant_id())', t);
    execute format(
      'create policy %1$s_insert on public.%1$s for insert to authenticated with check (tenant_id = public.alma_current_tenant_id())', t);
    execute format(
      'create policy %1$s_update on public.%1$s for update to authenticated using (tenant_id = public.alma_current_tenant_id()) with check (tenant_id = public.alma_current_tenant_id())', t);
    execute format(
      'create policy %1$s_delete on public.%1$s for delete to authenticated using (tenant_id = public.alma_current_tenant_id())', t);
  end loop;
end;
$$;
