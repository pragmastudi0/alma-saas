-- alma · F1 — Agenda: prevención de superposición de turnos.
-- Proyecto Supabase compartido: función con prefijo alma_, sin extensiones (btree_gist).
-- Un turno cancelado o ausente libera su horario; los demás estados lo ocupan.

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

create trigger alma_appointments_no_overlap
  before insert or update on public.alma_appointments
  for each row execute function public.alma_appointments_check_overlap();
