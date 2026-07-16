/**
 * Núcleo de la reserva pública (aislado del framework para poder testearlo).
 * Corre con el cliente admin: valida disponibilidad, reusa o crea el paciente
 * y crea el turno. El trigger anti-solape de la DB es la garantía final
 * contra carreras (23P01). Nunca loguea datos del paciente.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { addDias, hoyISO } from '@/lib/fecha';
import { slotsDelDia } from '@/lib/slots';
import { normalizarTelAR } from '@/lib/whatsapp';

/** Cuántos días hacia adelante se puede reservar. */
export const VENTANA_DIAS = 60;
/** Máximo de turnos futuros activos por paciente (anti-abuso). */
export const MAX_TURNOS_FUTUROS = 3;

export type DatosReserva = {
  tenantId: string;
  timezone: string;
  settings: { precio_default?: number; sena_default?: number; duracion_default?: number };
  fecha: string; // ya validada con regex
  hora: string; // 'HH:MM'
  nombre: string;
  telefono: string;
};

export type ResultadoReserva =
  | { ok: true; turnoId: string; estado: 'pendiente_sena' | 'confirmado'; senaMonto: number }
  | { ok: false; motivo: 'sin_disponibilidad' | 'ocupado' | 'limite' | 'error' };

export async function crearReservaPublica(
  admin: SupabaseClient,
  datos: DatosReserva,
): Promise<ResultadoReserva> {
  const hoy = hoyISO(datos.timezone);
  if (datos.fecha < hoy || datos.fecha > addDias(hoy, VENTANA_DIAS)) {
    return { ok: false, motivo: 'sin_disponibilidad' };
  }

  const duracionMin = datos.settings.duracion_default ?? 45;
  const slots = await slotsDelDia(
    admin,
    { id: datos.tenantId, timezone: datos.timezone, duracionMin },
    datos.fecha,
  );
  if (!slots.includes(datos.hora)) {
    return { ok: false, motivo: 'sin_disponibilidad' };
  }

  // Reuso del paciente por teléfono normalizado (los cargados a mano tienen formato libre).
  const telNorm = normalizarTelAR(datos.telefono);
  let patientId: string | null = null;
  if (telNorm) {
    const { data: existentes } = await admin
      .from('alma_patients')
      .select('id, telefono')
      .eq('tenant_id', datos.tenantId);
    patientId =
      (existentes ?? []).find((p) => normalizarTelAR(p.telefono ?? '') === telNorm)?.id ?? null;
  }

  if (patientId) {
    const { count } = await admin
      .from('alma_appointments')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', datos.tenantId)
      .eq('patient_id', patientId)
      .gte('fecha', hoy)
      .in('estado', ['pendiente_sena', 'confirmado']);
    if ((count ?? 0) >= MAX_TURNOS_FUTUROS) {
      return { ok: false, motivo: 'limite' };
    }
  } else {
    const { data: nuevo, error: pacErr } = await admin
      .from('alma_patients')
      .insert({
        tenant_id: datos.tenantId,
        nombre: datos.nombre,
        telefono: telNorm ?? datos.telefono,
      })
      .select('id')
      .single();
    if (pacErr || !nuevo) {
      return { ok: false, motivo: 'error' };
    }
    patientId = nuevo.id;
  }

  const senaMonto = datos.settings.sena_default ?? 0;
  const estado = senaMonto > 0 ? 'pendiente_sena' : 'confirmado';

  const { data: turno, error: insErr } = await admin
    .from('alma_appointments')
    .insert({
      tenant_id: datos.tenantId,
      patient_id: patientId,
      fecha: datos.fecha,
      hora: datos.hora,
      duracion_min: duracionMin,
      precio: datos.settings.precio_default ?? 0,
      sena_monto: senaMonto,
      estado,
    })
    .select('id')
    .single();

  if (insErr || !turno) {
    if (insErr?.code === '23P01') {
      return { ok: false, motivo: 'ocupado' };
    }
    return { ok: false, motivo: 'error' };
  }

  return { ok: true, turnoId: turno.id, estado, senaMonto };
}
