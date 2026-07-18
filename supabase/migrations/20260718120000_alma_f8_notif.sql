-- alma · F8 — Notificaciones de turnos nuevos (campanita)
-- `origen` distingue las reservas hechas por el paciente en el portal (las que
-- hay que avisar) de las que carga el profesional a mano. `notif_seen_at` marca
-- hasta cuándo el profesional ya vio las notificaciones (para contar las nuevas).

alter table public.alma_appointments
  add column if not exists origen text not null default 'admin';

alter table public.alma_tenants
  add column if not exists notif_seen_at timestamptz not null default now();

-- El cliente puede tocar solo su marca de "visto" (columnas mutables acotadas).
grant update (notif_seen_at) on public.alma_tenants to authenticated;

-- Conteo de nuevas: reservas del portal por tenant, recientes primero.
create index if not exists alma_appointments_origen_idx
  on public.alma_appointments (tenant_id, origen, created_at desc);
