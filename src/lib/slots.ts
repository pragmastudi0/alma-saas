/**
 * Cálculo de horarios libres para la reserva pública.
 * El núcleo (calcularSlots) es puro para poder testearlo sin DB;
 * slotsDelDia arma los datos con el cliente admin (el portal corre sin sesión).
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { diaSemanaDe, hoyISO } from '@/lib/fecha';

export type Rango = { desde: string; hasta: string }; // 'HH:MM'
export type Ocupado = { hora: string; duracion_min: number }; // hora puede venir 'HH:MM:SS'

/** 'HH:MM[:SS]' → minutos desde las 00:00. */
export function aMin(hora: string): number {
  const [h, m] = hora.split(':').map(Number);
  return h * 60 + m;
}

/** Minutos desde las 00:00 → 'HH:MM'. */
export function deMin(min: number): string {
  const h = String(Math.floor(min / 60)).padStart(2, '0');
  const m = String(min % 60).padStart(2, '0');
  return `${h}:${m}`;
}

/** Intersección de intervalos semiabiertos [a1,a2) y [b1,b2): adyacentes no chocan. */
function seSolapan(a1: number, a2: number, b1: number, b2: number): boolean {
  return a1 < b2 && b1 < a2;
}

/**
 * Slots libres de un día: pasos de duracionMin dentro de cada rango de
 * disponibilidad, salteando turnos ocupados, bloqueos y horas ya pasadas.
 * Misma semántica semiabierta que el trigger anti-solape de la DB.
 */
export function calcularSlots(args: {
  disponibilidad: Rango[];
  ocupados: Ocupado[];
  bloqueos: Rango[];
  duracionMin: number;
  /** Minutos desde las 00:00 en el TZ del tenant, solo si el día es hoy. */
  ahoraMin?: number | null;
}): string[] {
  const { disponibilidad, ocupados, bloqueos, duracionMin, ahoraMin } = args;
  if (duracionMin <= 0) return [];

  const tomados = [
    ...ocupados.map((o) => ({ ini: aMin(o.hora), fin: aMin(o.hora) + o.duracion_min })),
    ...bloqueos.map((b) => ({ ini: aMin(b.desde), fin: aMin(b.hasta) })),
  ];

  const slots: string[] = [];
  for (const rango of disponibilidad) {
    const desde = aMin(rango.desde);
    const hasta = aMin(rango.hasta);
    for (let t = desde; t + duracionMin <= hasta; t += duracionMin) {
      if (ahoraMin != null && t <= ahoraMin) continue;
      if (tomados.some((x) => seSolapan(t, t + duracionMin, x.ini, x.fin))) continue;
      slots.push(deMin(t));
    }
  }
  return slots.sort();
}

/** Slots libres de una fecha para un tenant. Solo lee horas — jamás datos de pacientes. */
export async function slotsDelDia(
  admin: SupabaseClient,
  tenant: { id: string; timezone: string; duracionMin: number },
  fechaISO: string,
  employeeId?: string,
): Promise<string[]> {
  // Disponibilidad: si hay employeeId, buscar primero la del empleado;
  // si no tiene, usar la general del tenant.
  let dispoQuery = admin
    .from('alma_availability')
    .select('hora_desde, hora_hasta')
    .eq('tenant_id', tenant.id)
    .eq('dia_semana', diaSemanaDe(fechaISO));
  if (employeeId) {
    // Intentar disponibilidad del empleado
    const { data: empDispo } = await admin
      .from('alma_availability')
      .select('hora_desde, hora_hasta')
      .eq('tenant_id', tenant.id)
      .eq('dia_semana', diaSemanaDe(fechaISO))
      .eq('employee_id', employeeId);
    if (empDispo && empDispo.length > 0) {
      dispoQuery = admin
        .from('alma_availability')
        .select('hora_desde, hora_hasta')
        .eq('tenant_id', tenant.id)
        .eq('dia_semana', diaSemanaDe(fechaISO))
        .eq('employee_id', employeeId);
    }
  }

  // Turnos del día: filtrar por employee si corresponde
  let turnosQuery = admin
    .from('alma_appointments')
    .select('hora, duracion_min, employee_id')
    .eq('tenant_id', tenant.id)
    .eq('fecha', fechaISO)
    .not('estado', 'in', '("cancelado","ausente")');

  const [{ data: dispo }, { data: bloqueos }] = await Promise.all([
    dispoQuery,
    admin
      .from('alma_agenda_blocks')
      .select('hora_desde, hora_hasta')
      .eq('tenant_id', tenant.id)
      .eq('fecha', fechaISO),
  ]);

  let turnos = (await turnosQuery).data ?? [];

  // Si hay employeeId, filtrar solo los turnos de ese empleado (o sin asignar,
  // porque un turno sin employee_id afecta a todos)
  if (employeeId) {
    turnos = turnos.filter(
      (t) => t.employee_id === null || t.employee_id === employeeId,
    );
  }

  let ahoraMin: number | null = null;
  if (fechaISO === hoyISO(tenant.timezone)) {
    const partes = new Intl.DateTimeFormat('en-GB', {
      timeZone: tenant.timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(new Date());
    ahoraMin = aMin(partes);
  }

  return calcularSlots({
    disponibilidad: (dispo ?? []).map((d) => ({
      desde: String(d.hora_desde).slice(0, 5),
      hasta: String(d.hora_hasta).slice(0, 5),
    })),
    ocupados: turnos.map((t) => ({
      hora: String(t.hora),
      duracion_min: t.duracion_min,
    })),
    // Bloqueo sin horas = día completo.
    bloqueos: (bloqueos ?? []).map((b) => ({
      desde: b.hora_desde ? String(b.hora_desde).slice(0, 5) : '00:00',
      hasta: b.hora_hasta ? String(b.hora_hasta).slice(0, 5) : '24:00',
    })),
    duracionMin: tenant.duracionMin,
    ahoraMin,
  });
}
