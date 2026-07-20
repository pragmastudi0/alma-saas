-- alma · F9 — Servicios y empleados multi-servicio
-- Permite que un tenant configure varios servicios (con distinto precio, seña,
-- duración) y varios empleados. Los turnos se asignan a un servicio y
-- empleado opcionales.

-- ============================================================
-- alma_services
-- ============================================================
create table if not exists public.alma_services (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.alma_tenants (id) on delete cascade,
  nombre text not null,
  descripcion text not null default '',
  precio numeric(12, 2) not null check (precio >= 0),
  duracion_min int not null check (duracion_min > 0),
  sena_monto numeric(12, 2) not null default 0 check (sena_monto >= 0),
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists alma_services_tenant_idx on public.alma_services (tenant_id);

-- ============================================================
-- alma_employees
-- ============================================================
create table if not exists public.alma_employees (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.alma_tenants (id) on delete cascade,
  nombre text not null,
  color text not null default '#6366f1',
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists alma_employees_tenant_idx on public.alma_employees (tenant_id);

-- ============================================================
-- Alter alma_appointments
-- ============================================================
alter table public.alma_appointments
  add column if not exists service_id uuid references public.alma_services (id) on delete set null,
  add column if not exists employee_id uuid references public.alma_employees (id) on delete set null;

create index if not exists alma_appointments_service_idx on public.alma_appointments (service_id);
create index if not exists alma_appointments_employee_idx on public.alma_appointments (employee_id);

-- ============================================================
-- Alter alma_availability (disponibilidad por empleado opcional)
-- ============================================================
alter table public.alma_availability
  add column if not exists employee_id uuid references public.alma_employees (id) on delete cascade;

-- ============================================================
-- updated_at triggers
-- ============================================================
drop trigger if exists alma_services_updated_at on public.alma_services;
create trigger alma_services_updated_at
  before update on public.alma_services
  for each row execute function public.alma_set_updated_at();

drop trigger if exists alma_employees_updated_at on public.alma_employees;
create trigger alma_employees_updated_at
  before update on public.alma_employees
  for each row execute function public.alma_set_updated_at();

-- ============================================================
-- alma_service_employees (qué empleados pueden hacer cada servicio)
-- ============================================================
create table if not exists public.alma_service_employees (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.alma_tenants (id) on delete cascade,
  service_id uuid not null references public.alma_services (id) on delete cascade,
  employee_id uuid not null references public.alma_employees (id) on delete cascade,
  unique (service_id, employee_id)
);

create index if not exists alma_service_employees_service_idx on public.alma_service_employees (service_id);
create index if not exists alma_service_employees_employee_idx on public.alma_service_employees (employee_id);

-- ============================================================
-- RLS (alma_services + alma_employees + alma_service_employees)
-- ============================================================
alter table public.alma_services enable row level security;
alter table public.alma_employees enable row level security;
alter table public.alma_service_employees enable row level security;

-- anon no toca
revoke all on public.alma_services, public.alma_employees, public.alma_service_employees from anon;

-- Políticas automáticas (mismo patrón que F0, con drop previo para ser idempotente)
do $$
declare
  t text;
begin
  foreach t in array array['alma_services', 'alma_employees', 'alma_service_employees']
  loop
    execute format('drop policy if exists %I on public.%I', t || '_select', t);
    execute format('create policy %I on public.%I for select to authenticated using (tenant_id = public.alma_current_tenant_id())', t || '_select', t);
    execute format('drop policy if exists %I on public.%I', t || '_insert', t);
    execute format('create policy %I on public.%I for insert to authenticated with check (tenant_id = public.alma_current_tenant_id())', t || '_insert', t);
    execute format('drop policy if exists %I on public.%I', t || '_update', t);
    execute format('create policy %I on public.%I for update to authenticated using (tenant_id = public.alma_current_tenant_id()) with check (tenant_id = public.alma_current_tenant_id())', t || '_update', t);
    execute format('drop policy if exists %I on public.%I', t || '_delete', t);
    execute format('create policy %I on public.%I for delete to authenticated using (tenant_id = public.alma_current_tenant_id())', t || '_delete', t);
  end loop;
end;
$$;

-- ============================================================
-- Actualización del trigger anti-solape: incluye employee_id
-- Dos turnos con diferente empleado NO se solapan aunque tengan
-- la misma fecha y hora (empleados distintos atienden distinto).
-- employee_id NULL = cualquiera (comportamiento original).
-- ============================================================
create or replace function public.alma_appointments_check_overlap()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  -- Cancelado o ausente no ocupan la agenda: no se controlan.
  if new.estado in ('cancelado', 'ausente') then
    return new;
  end if;

  if exists (
    select 1
    from public.alma_appointments a
    where a.tenant_id = new.tenant_id
      and a.id <> new.id
      and a.estado not in ('cancelado', 'ausente')
      -- Mismo empleado (o ambos null = conflicto general)
      and a.employee_id is not distinct from new.employee_id
      -- Solape de rangos [inicio, fin): s1 < e2  AND  s2 < e1 (adyacentes no cuentan).
      and (new.fecha + new.hora)
            < (a.fecha + a.hora + make_interval(mins => a.duracion_min))
      and (a.fecha + a.hora)
            < (new.fecha + new.hora + make_interval(mins => new.duracion_min))
  ) then
    raise exception 'Ese horario se superpone con otro turno.'
      using errcode = '23P01', hint = 'alma_overlap';
  end if;

  return new;
end;
$$;
