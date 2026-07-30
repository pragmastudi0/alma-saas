/**
 * Núcleo de la reserva pública (aislado del framework para poder testearlo).
 * Corre con el cliente admin: valida disponibilidad, reusa o crea el paciente
 * y crea el turno. El trigger anti-solape de la DB es la garantía final
 * contra carreras (23P01). Nunca loguea datos del paciente.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { addDias, hoyISO } from '@/lib/fecha';
import { estadoInicial, montoSenaEfectivo, senaModoDe } from '@/lib/sena';
import { slotsDelDia } from '@/lib/slots';
import { normalizarTelAR } from '@/lib/whatsapp';

/** Cuántos días hacia adelante se puede reservar. */
export const VENTANA_DIAS = 60;
/** Máximo de turnos futuros activos por paciente (anti-abuso). */
export const MAX_TURNOS_FUTUROS = 3;

export type DatosReserva = {
  tenantId: string;
  timezone: string;
  settings: {
    precio_default?: number;
    sena_default?: number;
    duracion_default?: number;
    sena_modo?: string;
  };
  /**
   * Con la seña opcional, si el paciente eligió pagarla ahora. Cuando dice que
   * no, el turno nace confirmado y sin seña. Se ignora si la seña es obligatoria.
   */
  pagarSena?: boolean;
  fecha: string; // ya validada con regex
  hora: string; // 'HH:MM'
  nombre: string;
  apellido: string;
  telefono: string;
  email: string;
  fechaNacimiento: string; // 'YYYY-MM-DD'
  serviceId?: string;
  employeeId?: string;
};

type ServicioReserva = {
  id: string;
  precio: number | string;
  duracion_min: number;
  sena_monto: number | string;
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

  let servicio: ServicioReserva | null = null;
  if (datos.serviceId) {
    const { data: sv } = await admin
      .from('alma_services')
      .select('id, precio, duracion_min, sena_monto')
      .eq('id', datos.serviceId)
      .eq('tenant_id', datos.tenantId)
      .maybeSingle();
    servicio = sv as ServicioReserva | null;
  }

  const duracionMin = servicio?.duracion_min ?? datos.settings.duracion_default ?? 45;
  const slots = await slotsDelDia(
    admin,
    { id: datos.tenantId, timezone: datos.timezone, duracionMin },
    datos.fecha,
    datos.employeeId,
  );
  if (!slots.includes(datos.hora)) {
    return { ok: false, motivo: 'sin_disponibilidad' };
  }

  // Reuso del paciente por teléfono normalizado (los cargados a mano tienen formato libre).
  const telNorm = normalizarTelAR(datos.telefono);
  type PacienteExistente = {
    id: string;
    telefono: string | null;
    apellido: string | null;
    email: string | null;
    fecha_nacimiento: string | null;
    archivado: boolean | null;
  };
  let existente: PacienteExistente | null = null;
  if (telNorm) {
    const { data: existentes } = await admin
      .from('alma_patients')
      .select('id, telefono, apellido, email, fecha_nacimiento, archivado')
      .eq('tenant_id', datos.tenantId);
    existente =
      ((existentes ?? []) as PacienteExistente[]).find(
        (p) => normalizarTelAR(p.telefono ?? '') === telNorm,
      ) ?? null;
  }

  let patientId: string;
  if (existente) {
    const { count } = await admin
      .from('alma_appointments')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', datos.tenantId)
      .eq('patient_id', existente.id)
      .gte('fecha', hoy)
      .in('estado', ['pendiente_sena', 'confirmado']);
    if ((count ?? 0) >= MAX_TURNOS_FUTUROS) {
      return { ok: false, motivo: 'limite' };
    }

    // Enriquecemos los datos que falten y reactivamos si estaba archivado
    // (vuelve a tener un turno activo). Nunca pisamos datos ya cargados.
    const enriquecer: Record<string, unknown> = {};
    if (!existente.apellido && datos.apellido) enriquecer.apellido = datos.apellido;
    if (!existente.email && datos.email) enriquecer.email = datos.email;
    if (!existente.fecha_nacimiento && datos.fechaNacimiento)
      enriquecer.fecha_nacimiento = datos.fechaNacimiento;
    if (existente.archivado) enriquecer.archivado = false;
    if (Object.keys(enriquecer).length > 0) {
      await admin.from('alma_patients').update(enriquecer).eq('id', existente.id);
    }
    patientId = existente.id;
  } else {
    const { data: nuevo, error: pacErr } = await admin
      .from('alma_patients')
      .insert({
        tenant_id: datos.tenantId,
        nombre: datos.nombre,
        apellido: datos.apellido,
        telefono: telNorm ?? datos.telefono,
        email: datos.email,
        fecha_nacimiento: datos.fechaNacimiento || null,
      })
      .select('id')
      .single();
    if (pacErr || !nuevo) {
      return { ok: false, motivo: 'error' };
    }
    patientId = nuevo.id;
  }

  const precioFinal = servicio ? Number(servicio.precio) : (datos.settings.precio_default ?? 0);
  const modo = senaModoDe(datos.settings);
  const senaPedida = servicio ? Number(servicio.sena_monto) : (datos.settings.sena_default ?? 0);
  // Con la seña opcional el paciente decide: si no la paga ahora, el turno
  // queda confirmado y sin seña (el profesional cobra todo al atender).
  const salteaSena = modo === 'opcional' && datos.pagarSena === false;
  const senaMonto = salteaSena ? 0 : montoSenaEfectivo(senaPedida, modo);
  const estado = estadoInicial(senaMonto, modo);

  const { data: turno, error: insErr } = await admin
    .from('alma_appointments')
    .insert({
      tenant_id: datos.tenantId,
      patient_id: patientId,
      fecha: datos.fecha,
      hora: datos.hora,
      duracion_min: duracionMin,
      precio: precioFinal,
      sena_monto: senaMonto,
      estado,
      origen: 'portal',
      service_id: servicio?.id ?? null,
      employee_id: datos.employeeId ?? null,
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
