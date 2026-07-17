/** Tipos y helpers compartidos de caja (fuera de la server action). */

import type { SupabaseClient } from '@supabase/supabase-js';

export type TipoMovimiento = 'ingreso' | 'gasto';

export type CajaState = { error?: string; info?: string };

export type IngresoTurno = {
  tenantId: string;
  appointmentId: string;
  categoria: string;
  monto: number;
  descripcion?: string;
  fecha?: string;
};

/**
 * Asienta en caja un ingreso ligado a un turno (seña o saldo), una sola vez.
 * Idempotente: si ya existe un ingreso de ese turno con la misma categoría, no
 * duplica. Sirve tanto para el webhook de MP (cliente admin) como para las
 * acciones privadas (cliente con RLS del tenant). Nunca loguea datos del paciente.
 */
export async function registrarIngresoTurno(
  client: SupabaseClient,
  entry: IngresoTurno,
): Promise<void> {
  if (!(entry.monto > 0)) return;

  const { data: yaHay } = await client
    .from('alma_cash_entries')
    .select('id')
    .eq('appointment_id', entry.appointmentId)
    .eq('categoria', entry.categoria)
    .eq('tipo', 'ingreso')
    .limit(1);
  if (yaHay?.length) return;

  await client.from('alma_cash_entries').insert({
    tenant_id: entry.tenantId,
    tipo: 'ingreso',
    categoria: entry.categoria,
    descripcion: entry.descripcion ?? '',
    monto: entry.monto,
    appointment_id: entry.appointmentId,
    ...(entry.fecha ? { fecha: entry.fecha } : {}),
  });
}

/** Nombre visible del paciente desde un join de Supabase (array u objeto). */
export function nombrePaciente(
  rel: { nombre?: string | null; apellido?: string | null } | { nombre?: string | null; apellido?: string | null }[] | null | undefined,
): string {
  const p = Array.isArray(rel) ? rel[0] : rel;
  return [p?.nombre, p?.apellido].filter(Boolean).join(' ').trim();
}
