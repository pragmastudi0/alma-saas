-- alma · F7 — Ficha de paciente ampliada (apellido, fecha de nacimiento) + archivado
-- El turnero público pasa a pedir apellido, email y fecha de nacimiento, y con
-- eso queda armado el perfil del paciente. `archivado` permite dar de baja un
-- paciente con historial sin romper la cascada de turnos/caja.

alter table public.alma_patients
  add column if not exists apellido text not null default '',
  add column if not exists fecha_nacimiento date,
  add column if not exists archivado boolean not null default false;

-- Los listados solo muestran pacientes activos: índice parcial para esa consulta.
create index if not exists alma_patients_activos_idx
  on public.alma_patients (tenant_id) where archivado = false;
