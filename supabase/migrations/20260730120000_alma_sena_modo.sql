-- alma · Modo de cobro de seña por tenant
-- Tres modos: 'no' (no cobra), 'opcional' (puede confirmar sin cobrarla),
-- 'obligatoria' (sin seña no hay turno confirmado — el comportamiento previo).
-- Vive en el jsonb settings que ya existe: no hace falta columna nueva.

-- Default para tenants nuevos (mismo objeto de F0 + sena_modo).
alter table public.alma_tenants
  alter column settings set default '{"alias_mp": null, "precio_default": 15000, "sena_default": 5000, "duracion_default": 45, "theme": "light", "sena_modo": "obligatoria"}'::jsonb;

-- Tenants existentes: 'obligatoria' preserva exactamente lo que hacían hasta hoy.
update public.alma_tenants
  set settings = settings || '{"sena_modo": "obligatoria"}'::jsonb
  where not (settings ? 'sena_modo');
