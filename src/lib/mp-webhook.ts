/**
 * Núcleo idempotente del webhook de Mercado Pago (aislado para poder testearlo).
 * No importa nada del framework: recibe un cliente admin (service role) y los
 * datos ya normalizados del pago.
 */
import type { SupabaseClient } from '@supabase/supabase-js';

export type PagoNormalizado = {
  mpId: string;
  status: string; // 'approved' | 'pending' | 'rejected' | ...
  monto: number;
  appointmentId: string;
  raw: unknown;
};

export type ResultadoPago = {
  /** true si este pago se registró recién (false si ya existía → idempotencia). */
  registrado: boolean;
  /** true si esta llamada llevó el turno de pendiente_sena a confirmado. */
  confirmado: boolean;
};

/**
 * Registra el pago de una seña y, si está aprobado, confirma el turno.
 * Idempotente: el unique (tenant_id, mp_id) de alma_payments evita doble registro,
 * y la transición sólo aplica sobre turnos en pendiente_sena.
 */
export async function registrarPagoSena(
  admin: SupabaseClient,
  pago: PagoNormalizado,
): Promise<ResultadoPago> {
  // El turno nos da el tenant (alma_payments necesita tenant_id).
  const { data: appt } = await admin
    .from('alma_appointments')
    .select('id, tenant_id, estado')
    .eq('id', pago.appointmentId)
    .maybeSingle();
  if (!appt) {
    return { registrado: false, confirmado: false };
  }

  // Registro idempotente del pago.
  const { error: insErr } = await admin.from('alma_payments').insert({
    tenant_id: appt.tenant_id,
    appointment_id: appt.id,
    mp_id: pago.mpId,
    monto: pago.monto,
    status: pago.status,
    raw: pago.raw,
  });
  const yaExistia = insErr?.code === '23505'; // unique_violation (tenant_id, mp_id)
  if (insErr && !yaExistia) {
    throw insErr;
  }

  // Sólo un pago aprobado confirma, y sólo si el turno sigue esperando la seña.
  let confirmado = false;
  if (pago.status === 'approved') {
    const { data: upd } = await admin
      .from('alma_appointments')
      .update({ sena_pagada: true, mp_payment_id: pago.mpId, estado: 'confirmado' })
      .eq('id', appt.id)
      .eq('estado', 'pendiente_sena')
      .select('id');
    confirmado = !!upd?.length;
  }

  return { registrado: !yaExistia, confirmado };
}
