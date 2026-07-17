/**
 * Núcleo idempotente del webhook de Mercado Pago (aislado para poder testearlo).
 * No importa nada del framework: recibe un cliente admin (service role) y los
 * datos ya normalizados del pago.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { registrarIngresoTurno, nombrePaciente } from '@/lib/caja';

export type PagoNormalizado = {
  mpId: string;
  status: string; // 'approved' | 'pending' | 'rejected' | ...
  monto: number;
  appointmentId: string;
  /**
   * Tenant dueño de la cuenta MP que recibió el pago (resuelto por collector_id).
   * Si el turno referenciado pertenece a OTRO tenant, el pago se ignora:
   * nadie puede confirmar turnos ajenos apuntando su external_reference.
   */
  tenantId: string;
  raw: unknown;
};

export type ResultadoPago = {
  /** true si este pago se registró recién (false si ya existía → idempotencia). */
  registrado: boolean;
  /** true si esta llamada llevó el turno de pendiente_sena a confirmado. */
  confirmado: boolean;
};

/**
 * Registra el pago de una seña y, si está aprobado, confirma el turno y
 * asienta el ingreso en caja. Idempotente: el unique (tenant_id, mp_id) de
 * alma_payments evita doble registro, la transición sólo aplica sobre turnos
 * en pendiente_sena, y la entrada de caja sólo se crea en esa transición.
 */
export async function registrarPagoSena(
  admin: SupabaseClient,
  pago: PagoNormalizado,
): Promise<ResultadoPago> {
  const { data: appt } = await admin
    .from('alma_appointments')
    .select('id, tenant_id, estado, alma_patients(nombre, apellido)')
    .eq('id', pago.appointmentId)
    .maybeSingle();
  if (!appt) {
    return { registrado: false, confirmado: false };
  }

  // Defensa cross-tenant: el turno tiene que ser del tenant que cobró.
  if (appt.tenant_id !== pago.tenantId) {
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

  // La seña acreditada entra sola a la caja (una vez: sólo en la transición).
  if (confirmado) {
    const nombre = nombrePaciente(appt.alma_patients);
    await registrarIngresoTurno(admin, {
      tenantId: appt.tenant_id,
      appointmentId: appt.id,
      categoria: 'Seña',
      monto: pago.monto,
      descripcion: nombre ? `Seña — ${nombre}` : 'Seña',
    });
  }

  return { registrado: !yaExistia, confirmado };
}
