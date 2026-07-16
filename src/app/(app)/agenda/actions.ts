'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createServerSupabase } from '@/lib/supabase/server';
import { getSessionContext } from '@/lib/tenant';
import { crearPreferenciaSena, siteUrl } from '@/lib/mp';
import type { AgendaState, Estado, MpLinkState } from '@/lib/turno';

const FECHA = /^\d{4}-\d{2}-\d{2}$/;
const HORA = /^\d{2}:\d{2}$/;

const turnoBase = z.object({
  fecha: z.string().regex(FECHA, 'Elegí una fecha válida.'),
  hora: z.string().regex(HORA, 'Elegí un horario.'),
  duracion_min: z.coerce.number().int().positive('La duración tiene que ser mayor a cero.'),
  precio: z.coerce.number().min(0, 'El precio no puede ser negativo.').default(0),
  sena_monto: z.coerce.number().min(0, 'La seña no puede ser negativa.').default(0),
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

  // Con seña nace pendiente_sena; sin seña, confirmado.
  const estado: Estado = v.sena_monto > 0 ? 'pendiente_sena' : 'confirmado';

  const { error } = await supabase.from('alma_appointments').insert({
    tenant_id: ctx.tenantId,
    patient_id: patientId,
    fecha: v.fecha,
    hora: v.hora,
    duracion_min: v.duracion_min,
    precio: v.precio,
    sena_monto: v.sena_monto,
    sena_pagada: false,
    estado,
  });
  if (error?.code === '23P01') {
    return { error: 'Ese horario se superpone con otro turno. Probá otro.' };
  }
  if (error) {
    return { error: 'No pudimos guardar el turno. Probá de nuevo.' };
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
  const { data, error } = await supabase
    .from('alma_appointments')
    .update({
      fecha: v.fecha,
      hora: v.hora,
      duracion_min: v.duracion_min,
      precio: v.precio,
      sena_monto: v.sena_monto,
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

  revalidatePath('/agenda');
  revalidatePath('/hoy');
  redirect(`/agenda/${v.id}`);
}

/**
 * Transición de estado atómica: sólo aplica si el turno está en uno de los
 * estados válidos de origen (enforcá la máquina de estados y evita carreras).
 */
async function transicionar(
  formData: FormData,
  desde: Estado[],
  cambios: Record<string, unknown>,
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
    .select('id');
  if (error?.code === '23P01') {
    return { error: 'Ese cambio choca con otro turno.' };
  }
  if (error) {
    return { error: 'No pudimos actualizar el turno.' };
  }
  if (!data?.length) {
    return { error: 'Ese cambio ya no aplica al estado del turno.' };
  }

  revalidatePath('/agenda');
  revalidatePath('/hoy');
  revalidatePath('/agenda/[id]', 'page');
  return { info: 'Listo.' };
}

/** pendiente_sena → confirmado (marcar seña cobrada; MP automatiza esto en F3). */
export async function confirmarSena(_prev: AgendaState, formData: FormData): Promise<AgendaState> {
  return transicionar(formData, ['pendiente_sena'], { estado: 'confirmado', sena_pagada: true });
}

/** confirmado → completado. */
export async function completarTurno(_prev: AgendaState, formData: FormData): Promise<AgendaState> {
  return transicionar(formData, ['confirmado'], { estado: 'completado' });
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
 * Genera el link de pago de la seña (Checkout Pro) para mandarle al paciente.
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
      .select('id, sena_monto, alma_patients(nombre)')
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

  const rel = turno.alma_patients;
  const nombre = (Array.isArray(rel) ? rel[0] : rel)?.nombre ?? 'Paciente';

  // Si el tenant tiene portal, el paciente que paga vuelve a la página pública
  // del turno (no a la agenda privada, que le pediría login).
  const urlTurno = tenant?.slug
    ? `${siteUrl()}/t/${tenant.slug}/turno/${turno.id}`
    : null;

  try {
    const link = await crearPreferenciaSena({
      appointmentId: turno.id,
      titulo: `Seña — ${nombre}`,
      monto: sena,
      backUrls: urlTurno ? { success: urlTurno, failure: urlTurno, pending: urlTurno } : undefined,
    });
    return { link };
  } catch {
    return { error: 'No pudimos generar el link. Revisá la configuración de Mercado Pago.' };
  }
}
