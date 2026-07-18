'use server';

import { createServerSupabase } from '@/lib/supabase/server';
import { getSessionContext } from '@/lib/tenant';
import { nombrePaciente } from '@/lib/caja';
import type { Estado } from '@/lib/turno';
import type { NotifData } from '@/lib/notif';

const EPOCH = new Date(0).toISOString();

/**
 * Notificaciones de la campanita: reservas hechas por el paciente en el portal.
 * `count` = cuántas hay sin ver (posteriores a notif_seen_at); `items` = las
 * últimas 10 para el desplegable, marcando cuáles son nuevas.
 */
export async function turnosNuevos(): Promise<NotifData> {
  const ctx = await getSessionContext();
  if (!ctx) return { count: 0, items: [] };

  const supabase = await createServerSupabase();
  const { data: tenant } = await supabase
    .from('alma_tenants')
    .select('notif_seen_at')
    .maybeSingle();
  const seen = tenant?.notif_seen_at ?? EPOCH;

  const [{ count }, { data }] = await Promise.all([
    supabase
      .from('alma_appointments')
      .select('id', { count: 'exact', head: true })
      .eq('origen', 'portal')
      .gt('created_at', seen)
      .not('estado', 'in', '("cancelado","ausente")'),
    supabase
      .from('alma_appointments')
      .select('id, fecha, hora, estado, created_at, alma_patients(nombre, apellido)')
      .eq('origen', 'portal')
      .not('estado', 'in', '("cancelado","ausente")')
      .order('created_at', { ascending: false })
      .limit(10),
  ]);

  const items = (data ?? []).map((t) => ({
    id: t.id,
    fecha: t.fecha,
    hora: String(t.hora).slice(0, 5),
    paciente: nombrePaciente(t.alma_patients) || 'Paciente',
    estado: t.estado as Estado,
    nuevo: String(t.created_at) > seen,
  }));

  return { count: count ?? 0, items };
}

/** Marca todas las notificaciones como vistas (mueve la marca a ahora). */
export async function marcarNotifVistas(): Promise<void> {
  const ctx = await getSessionContext();
  if (!ctx) return;
  const supabase = await createServerSupabase();
  await supabase
    .from('alma_tenants')
    .update({ notif_seen_at: new Date().toISOString() })
    .eq('id', ctx.tenantId);
}
