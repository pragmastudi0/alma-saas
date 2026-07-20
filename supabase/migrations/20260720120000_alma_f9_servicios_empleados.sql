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
create trigger alma_services_updated_at
  before update on public.alma_services
  for each row execute function public.alma_set_updated_at();

create trigger alma_employees_updated_at
  before update on public.alma_employees
  for each row execute function public.alma_set_updated_at();

-- ============================================================
-- RLS
-- ============================================================
alter table public.alma_services enable row level security;
alter table public.alma_employees enable row level security;

-- anon no toca
revoke all on public.alma_services, public.alma_employees from anon;

-- Políticas automáticas (mismo patrón que F0)
do $$
declare
  t text;
begin
  foreach t in array array['alma_services', 'alma_employees']
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
