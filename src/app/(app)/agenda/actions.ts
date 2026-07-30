'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createServerSupabase } from '@/lib/supabase/server';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { getSessionContext } from '@/lib/tenant';
import { crearPreferenciaSena, siteUrl } from '@/lib/mp';
import { obtenerCredencialMp } from '@/lib/mp-oauth';
import { registrarIngresoTurno, nombrePaciente } from '@/lib/caja';
import { calcularSlots } from '@/lib/slots';
import { diaSemanaDe } from '@/lib/fecha';
import { syncToCalendar } from '@/lib/calendar-sync';
import { estadoInicial, montoSenaEfectivo, permiteConfirmarSinSena, senaModoDe, type SenaModo } from '@/lib/sena';
import type { AgendaState, Estado, MpLinkState, HorariosDia, TurnoOcupado } from '@/lib/turno';

/** Modo de cobro de seña del tenant (vive en el jsonb settings). */
async function senaModoDelTenant(supabase: SupabaseClient): Promise<SenaModo> {
  const { data } = await supabase.from('alma_tenants').select('settings').maybeSingle();
  return senaModoDe(data?.settings);
}

const FECHA = /^\d{4}-\d{2}-\d{2}$/;
const HORA = /^\d{2}:\d{2}$/;

const turnoBase = z.object({
  fecha: z.string().regex(FECHA, 'Elegí una fecha válida.'),
  hora: z.string().regex(HORA, 'Elegí un horario.'),
  duracion_min: z.coerce.number().int().positive('La duración tiene que ser mayor a cero.'),
  precio: z.coerce.number().min(0, 'El precio no puede ser negativo.').default(0),
  sena_monto: z.coerce.number().min(0, 'La seña no puede ser negativa.').default(0),
  service_id: z.string().uuid().optional().or(z.literal('')),
  employee_id: z.string().uuid().optional().or(z.literal('')),
});

const crearTurnoSchema = turnoBase
  .extend({
    // El <select> sin elección manda "" — lo tratamos como "sin paciente".
    patient_id: z.preprocess(
      (v) => (v === '' ? undefined : v),
      z.string().uuid().optional(),
    ),
    nuevo_nombre: z.string().trim().max(80).optional(),
    nuevo_telefono: z.string().trim().max(40).optional(),
    // Al reprogramar: turno cancelado/ausente que se marca como reprogramado.
    origen: z.preprocess((v) => (v === '' ? undefined : v), z.string().uuid().optional()),
  })
  .superRefine((v, ctx) => {
    if (!v.patient_id && (!v.nuevo_nombre || v.nuevo_nombre.length < 2)) {
      ctx.addIssue({
        code: 'custom',
        path: ['patient_id'],
        message: 'Elegí un paciente o cargá uno nuevo.',
      });
    }
    if (v.sena_monto > v.precio && v.precio > 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['sena_monto'],
        message: 'La seña no puede ser mayor al precio.',
      });
    }
  });

const idSchema = z.object({ id: z.string().uuid() });

const editarTurnoSchema = turnoBase.extend({ id: z.string().uuid() }).superRefine((v, ctx) => {
  if (v.sena_monto > v.precio && v.precio > 0) {
    ctx.addIssue({
      code: 'custom',
      path: ['sena_monto'],
      message: 'La seña no puede ser mayor al precio.',
    });
  }
});

export async function crearTurno(_prev: AgendaState, formData: FormData): Promise<AgendaState> {
  const ctx = await getSessionContext();
  if (!ctx) redirect('/login');

  const parsed = crearTurnoSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }
  const v = parsed.data;

  const supabase = await createServerSupabase();

  // Alta rápida de paciente (la gestión completa llega en F2).
  let patientId = v.patient_id;
  if (!patientId) {
    const { data: nuevo, error: patErr } = await supabase
      .from('alma_patients')
      .insert({
        tenant_id: ctx.tenantId,
        nombre: v.nuevo_nombre!,
        telefono: v.nuevo_telefono ?? '',
      })
      .select('id')
      .single();
    if (patErr || !nuevo) {
      return { error: 'No pudimos guardar el paciente. Probá de nuevo.' };
    }
    patientId = nuevo.id;
  }

  // Con seña nace pendiente_sena; sin seña, confirmado. Si el profesional no
  // cobra seña, el monto se normaliza a cero aunque venga algo en el form.
  const modo = await senaModoDelTenant(supabase);
  const senaMonto = montoSenaEfectivo(v.sena_monto, modo);
  const estado: Estado = estadoInicial(senaMonto, modo);

  const { data: nuevo, error } = await supabase
    .from('alma_appointments')
    .insert({
      tenant_id: ctx.tenantId,
      patient_id: patientId,
      fecha: v.fecha,
      hora: v.hora,
      duracion_min: v.duracion_min,
      precio: v.precio,
      sena_monto: senaMonto,
      sena_pagada: false,
      estado,
      service_id: v.service_id || null,
      employee_id: v.employee_id || null,
    })
    .select('id')
    .single();
  if (error?.code === '23P01') {
    return { error: 'Ese horario se superpone con otro turno. Probá otro.' };
  }
  if (error || !nuevo) {
    return { error: 'No pudimos guardar el turno. Probá de nuevo.' };
  }

  // Sincronizar con calendarios (Apple Calendar, Google Calendar, etc.)
  // Solo si el turno nació confirmado (sin seña pendiente)
  if (estado === 'confirmado') {
    try {
      await syncToCalendar('CREATE', nuevo.id, ctx.tenantId);
    } catch (err) {
      console.error('[crearTurno] Calendar sync failed:', err);
      // No rompemos el flujo: calendario es secundario
    }
  }

  // Reprogramación: dejamos el turno original apuntando al nuevo. La guarda de
  // estado evita marcar por error un turno que no estaba cancelado/ausente.
  if (v.origen) {
    await supabase
      .from('alma_appointments')
      .update({ reprogramado_a: nuevo.id })
      .eq('id', v.origen)
      .eq('tenant_id', ctx.tenantId)
      .in('estado', ['cancelado', 'ausente']);
    revalidatePath('/agenda/[id]', 'page');
  }

  revalidatePath('/agenda');
  revalidatePath('/hoy');
  redirect(`/agenda?d=${v.fecha}`);
}

export async function editarTurno(_prev: AgendaState, formData: FormData): Promise<AgendaState> {
  const ctx = await getSessionContext();
  if (!ctx) redirect('/login');

  const parsed = editarTurnoSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }
  const v = parsed.data;

  const supabase = await createServerSupabase();
  const modo = await senaModoDelTenant(supabase);
  const { data, error } = await supabase
    .from('alma_appointments')
    .update({
      fecha: v.fecha,
      hora: v.hora,
      duracion_min: v.duracion_min,
      precio: v.precio,
      sena_monto: montoSenaEfectivo(v.sena_monto, modo),
      service_id: v.service_id || null,
      employee_id: v.employee_id || null,
      // El link de seña vigente puede quedar desactualizado (monto/fecha): se regenera.
      mp_preference_id: null,
      mp_init_point: null,
    })
    .eq('id', v.id)
    .select('id');
  if (error?.code === '23P01') {
    return { error: 'Ese horario se superpone con otro turno. Probá otro.' };
  }
  if (error) {
    return { error: 'No pudimos actualizar el turno.' };
  }
  if (!data?.length) {
    return { error: 'No encontramos ese turno.' };
  }

  // Sincronizar cambios con calendarios
  try {
    await syncToCalendar('UPDATE', v.id, ctx.tenantId);
  } catch (err) {
    console.error('[editarTurno] Calendar sync failed:', err);
    // No rompemos el flujo: calendario es secundario
  }

  revalidatePath('/agenda');
  revalidatePath('/hoy');
  redirect(`/agenda/${v.id}`);
}

/** Fila del turno tras una transición, con el paciente para asentar la caja. */
type TurnoTransicion = {
  id: string;
  precio: number | string;
  sena_monto: number | string;
  alma_patients: { nombre?: string | null; apellido?: string | null } | { nombre?: string | null; apellido?: string | null }[] | null;
};

/**
 * Transición de estado atómica: sólo aplica si el turno está en uno de los
 * estados válidos de origen (enforcá la máquina de estados y evita carreras).
 * `alAplicar` corre sólo cuando la transición realmente ocurrió (útil para
 * asentar la caja una única vez); si falla, el cambio de estado ya quedó firme.
 */
async function transicionar(
  formData: FormData,
  desde: Estado[],
  cambios: Record<string, unknown>,
  alAplicar?: (turno: TurnoTransicion, supabase: SupabaseClient, tenantId: string) => Promise<void>,
): Promise<AgendaState> {
  const ctx = await getSessionContext();
  if (!ctx) redirect('/login');

  const parsed = idSchema.safeParse({ id: formData.get('id') });
  if (!parsed.success) {
    return { error: 'Turno inválido.' };
  }

  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from('alma_appointments')
    .update(cambios)
    .eq('id', parsed.data.id)
    .in('estado', desde)
    .select('id, precio, sena_monto, alma_patients(nombre, apellido)');
  if (error?.code === '23P01') {
    return { error: 'Ese cambio choca con otro turno.' };
  }
  if (error) {
    return { error: 'No pudimos actualizar el turno.' };
  }
  if (!data?.length) {
    return { error: 'Ese cambio ya no aplica al estado del turno.' };
  }

  if (alAplicar) {
    try {
      await alAplicar(data[0] as TurnoTransicion, supabase, ctx.tenantId);
    } catch {
      // La transición ya quedó firme: no rompemos la acción por la caja.
    }
  }

  // Sincronizar cambios con calendarios
  try {
    const newState = (cambios.estado as string) || 'confirmado';
    if (newState === 'cancelado' || newState === 'ausente') {
      // Eliminar evento del calendario (marcar como CANCELLED)
      await syncToCalendar('DELETE', parsed.data.id, ctx.tenantId);
    } else if (newState === 'confirmado') {
      // Confirmar seña → marcar como confirmado en calendario
      await syncToCalendar('UPDATE', parsed.data.id, ctx.tenantId);
    }
  } catch (err) {
    console.error('[transicionar] Calendar sync failed:', err);
    // No rompemos el flujo: calendario es secundario
  }

  revalidatePath('/agenda');
  revalidatePath('/hoy');
  revalidatePath('/caja');
  revalidatePath('/agenda/[id]', 'page');
  return { info: 'Listo.' };
}

/**
 * pendiente_sena → confirmado (seña cobrada a mano: alias/efectivo). Asienta la
 * seña en caja, igual que hace el webhook de MP cuando el pago es online.
 */
export async function confirmarSena(_prev: AgendaState, formData: FormData): Promise<AgendaState> {
  return transicionar(
    formData,
    ['pendiente_sena'],
    { estado: 'confirmado', sena_pagada: true },
    async (turno, supabase, tenantId) => {
      const nombre = nombrePaciente(turno.alma_patients);
      await registrarIngresoTurno(supabase, {
        tenantId,
        appointmentId: turno.id,
        categoria: 'Seña',
        monto: Number(turno.sena_monto),
        descripcion: nombre ? `Seña — ${nombre}` : 'Seña',
      });
    },
  );
}

/**
 * pendiente_sena → confirmado sin cobrar la seña. Solo si el profesional
 * configuró la seña como opcional (o no cobra seña).
 *
 * La seña va a cero a propósito: no se asienta nada en caja ahora y, al
 * completar el turno, `completarTurno` registra el precio completo. Si se
 * guardara el monto sin cobrar, esa plata no quedaría asentada en ningún lado.
 * También se anula el link de MP: ese cobro ya no corresponde.
 */
export async function confirmarSinSena(
  _prev: AgendaState,
  formData: FormData,
): Promise<AgendaState> {
  const supabase = await createServerSupabase();
  const modo = await senaModoDelTenant(supabase);
  if (!permiteConfirmarSinSena(modo)) {
    return {
      error: 'Tenés la seña como obligatoria. Cambialo en Ajustes si querés confirmar sin cobrarla.',
    };
  }

  return transicionar(formData, ['pendiente_sena'], {
    estado: 'confirmado',
    sena_monto: 0,
    sena_pagada: false,
    mp_preference_id: null,
    mp_init_point: null,
  });
}

/** confirmado → completado. Asienta en caja el saldo del turno (precio − seña). */
export async function completarTurno(_prev: AgendaState, formData: FormData): Promise<AgendaState> {
  return transicionar(
    formData,
    ['confirmado'],
    { estado: 'completado' },
    async (turno, supabase, tenantId) => {
      const saldo = Number(turno.precio) - Number(turno.sena_monto);
      const nombre = nombrePaciente(turno.alma_patients);
      await registrarIngresoTurno(supabase, {
        tenantId,
        appointmentId: turno.id,
        categoria: 'Turno',
        monto: saldo,
        descripcion: nombre ? `Turno — ${nombre}` : 'Turno',
      });
    },
  );
}

/** pendiente_sena | confirmado → cancelado. */
export async function cancelarTurno(_prev: AgendaState, formData: FormData): Promise<AgendaState> {
  return transicionar(formData, ['pendiente_sena', 'confirmado'], { estado: 'cancelado' });
}

/** confirmado → ausente. */
export async function marcarAusente(_prev: AgendaState, formData: FormData): Promise<AgendaState> {
  return transicionar(formData, ['confirmado'], { estado: 'ausente' });
}

/**
 * Disponibilidad de un día para el alta de turno del admin: horarios libres +
 * turnos ya agendados. No filtra horas pasadas (el profesional puede cargar un
 * turno del rato anterior). Solo lee horas y nombres del propio tenant (RLS).
 */
export async function horariosDelDia(
  fecha: string,
  duracionMin: number,
  employeeId?: string,
): Promise<HorariosDia> {
  const vacio: HorariosDia = { slots: [], ocupados: [], atiende: false };
  const ctx = await getSessionContext();
  if (!ctx) return vacio;
  if (!FECHA.test(fecha) || !Number.isFinite(duracionMin) || duracionMin <= 0) return vacio;

  const supabase = await createServerSupabase();
  const dow = diaSemanaDe(fecha);

  // Disponibilidad: si hay employeeId, buscar primero la del empleado
  let dispoQuery = supabase
    .from('alma_availability')
    .select('hora_desde, hora_hasta')
    .eq('tenant_id', ctx.tenantId)
    .eq('dia_semana', dow);
  if (employeeId) {
    const { data: empDispo } = await supabase
      .from('alma_availability')
      .select('hora_desde, hora_hasta')
      .eq('tenant_id', ctx.tenantId)
      .eq('dia_semana', dow)
      .eq('employee_id', employeeId);
    if (empDispo && empDispo.length > 0) {
      dispoQuery = supabase
        .from('alma_availability')
        .select('hora_desde, hora_hasta')
        .eq('tenant_id', ctx.tenantId)
        .eq('dia_semana', dow)
        .eq('employee_id', employeeId);
    }
  }

  const [{ data: dispo }, { data: turnosRaw }, { data: bloqueos }] = await Promise.all([
    dispoQuery,
    supabase
      .from('alma_appointments')
      .select('hora, duracion_min, estado, employee_id, alma_patients(nombre, apellido)')
      .eq('tenant_id', ctx.tenantId)
      .eq('fecha', fecha)
      .not('estado', 'in', '("cancelado","ausente")')
      .order('hora'),
    supabase
      .from('alma_agenda_blocks')
      .select('hora_desde, hora_hasta')
      .eq('tenant_id', ctx.tenantId)
      .eq('fecha', fecha),
  ]);

  // Filtrar turnos por empleado
  const turnos = employeeId
    ? (turnosRaw ?? []).filter((t) => t.employee_id === null || t.employee_id === employeeId)
    : (turnosRaw ?? []);

  const slots = calcularSlots({
    disponibilidad: (dispo ?? []).map((d) => ({
      desde: String(d.hora_desde).slice(0, 5),
      hasta: String(d.hora_hasta).slice(0, 5),
    })),
    ocupados: turnos.map((t) => ({ hora: String(t.hora), duracion_min: t.duracion_min })),
    bloqueos: (bloqueos ?? []).map((b) => ({
      desde: b.hora_desde ? String(b.hora_desde).slice(0, 5) : '00:00',
      hasta: b.hora_hasta ? String(b.hora_hasta).slice(0, 5) : '24:00',
    })),
    duracionMin,
    ahoraMin: null,
  });

  const ocupados: TurnoOcupado[] = turnos.map((t) => ({
    hora: String(t.hora).slice(0, 5),
    duracion_min: t.duracion_min,
    paciente: nombrePaciente(t.alma_patients) || 'Paciente',
    estado: t.estado as Estado,
  }));

  return { slots, ocupados, atiende: (dispo ?? []).length > 0 };
}

/**
 * Genera el link de pago de la seña (Checkout Pro) con la cuenta de MP del
 * profesional, y lo persiste en el turno para poder reenviarlo sin regenerar.
 * El webhook confirma el turno cuando el pago se acredita.
 */
export async function generarLinkSena(
  _prev: MpLinkState,
  formData: FormData,
): Promise<MpLinkState> {
  const ctx = await getSessionContext();
  if (!ctx) redirect('/login');

  const parsed = idSchema.safeParse({ id: formData.get('id') });
  if (!parsed.success) {
    return { error: 'Turno inválido.' };
  }

  const supabase = await createServerSupabase();
  const [{ data: turno }, { data: tenant }] = await Promise.all([
    supabase
      .from('alma_appointments')
      .select('id, sena_monto, estado, mp_init_point, alma_patients(nombre)')
      .eq('id', parsed.data.id)
      .maybeSingle(),
    supabase.from('alma_tenants').select('slug').maybeSingle(),
  ]);
  if (!turno) {
    return { error: 'No encontramos el turno.' };
  }

  const sena = Number(turno.sena_monto);
  if (sena <= 0) {
    return { error: 'Este turno no tiene seña configurada.' };
  }
  if (turno.estado !== 'pendiente_sena') {
    return { error: 'Este turno ya no espera seña.' };
  }

  // Si el link ya existe, lo reusamos (editar el turno lo invalida).
  if (turno.mp_init_point) {
    return { link: turno.mp_init_point };
  }

  // La cuenta MP del profesional (el dinero entra ahí, no a alma).
  const admin = createAdminSupabase();
  const credencial = await obtenerCredencialMp(admin, ctx.tenantId);
  if (!credencial) {
    return { error: 'Conectá tu Mercado Pago en Ajustes para cobrar señas con link.' };
  }

  const rel = turno.alma_patients;
  const nombre = (Array.isArray(rel) ? rel[0] : rel)?.nombre ?? 'Paciente';

  // Si el tenant tiene portal, el paciente que paga vuelve a la página pública
  // del turno (no a la agenda privada, que le pediría login).
  const urlTurno = tenant?.slug
    ? `${siteUrl()}/t/${tenant.slug}/turno/${turno.id}`
    : null;

  try {
    const pref = await crearPreferenciaSena({
      accessToken: credencial.accessToken,
      appointmentId: turno.id,
      titulo: `Seña — ${nombre}`,
      monto: sena,
      backUrls: urlTurno ? { success: urlTurno, failure: urlTurno, pending: urlTurno } : undefined,
    });
    await supabase
      .from('alma_appointments')
      .update({ mp_preference_id: pref.preferenceId, mp_init_point: pref.initPoint })
      .eq('id', turno.id);
    return { link: pref.initPoint };
  } catch {
    return { error: 'No pudimos generar el link. Probá de nuevo en un rato.' };
  }
}
