-- alma · Reprogramar turno — vínculo del turno original al turno nuevo
-- Cuando un turno cancelado o ausente se reprograma, se crea un turno nuevo y el
-- original queda apuntando a él con `reprogramado_a`. Auto-referencia a la misma
-- tabla; on delete set null para no romper si el turno nuevo se borra.

alter table public.alma_appointments
  add column if not exists reprogramado_a uuid
    references public.alma_appointments (id) on delete set null;
