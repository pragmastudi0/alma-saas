'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import type { SupabaseClient } from '@supabase/supabase-js';
import { crearPreferenciaSena, siteUrl } from '@/lib/mp';
import { obtenerCredencialMp } from '@/lib/mp-oauth';
import { getTenantPorSlug, type ReservaState } from '@/lib/portal';
import { crearReservaPublica } from '@/lib/reserva';
import { SLUG_RE } from '@/lib/slug';
import { createAdminSupabase } from '@/lib/supabase/admin';

const FECHA = /^\d{4}-\d{2}-\d{2}$/;
const HORA = /^\d{2}:\d{2}$/;

const reservaSchema = z.object({
  slug: z.string().regex(SLUG_RE),
  fecha: z.string().regex(FECHA, 'Elegí una fecha válida.'),
  hora: z.string().regex(HORA, 'Elegí un horario.'),
  nombre: z.string().trim().min(2, 'Contanos tu nombre.').max(80),
  apellido: z.string().trim().min(2, 'Dejanos tu apellido.').max(80),
  telefono: z.string().trim().min(6, 'Dejanos un teléfono para avisarte.').max(40),
  email: z.string().trim().email('Necesitamos un email válido.').max(120),
  fecha_nacimiento: z.string().regex(FECHA, 'Poné tu fecha de nacimiento.'),
  service_id: z.string().uuid().optional().or(z.literal('')),
  employee_id: z.string().uuid().optional().or(z.literal('')),
});

const MENSAJES: Record<string, string> = {
  ocupado: 'Ese horario se acaba de ocupar. Elegí otro.',
  sin_disponibilidad: 'Ese horario ya no está disponible. Elegí otro.',
  limite: 'Ya tenés turnos reservados. Escribile directamente para coordinar.',
  error: 'No pudimos reservar el turno. Probá de nuevo.',
};

function urlTurno(slug: string, id: string): string {
  return `${siteUrl()}/t/${slug}/turno/${id}`;
}

/**
 * Crea el link de pago de la seña con la cuenta MP del profesional y vuelta a
 * la página pública del turno. Lo persiste en el turno para poder reusarlo.
 * null si el profesional no conectó su MP o si MP falla: el turno igual queda
 * reservado y la página del turno resuelve (reintento o seña por alias).
 */
async function linkDeSena(
  admin: SupabaseClient,
  args: { slug: string; tenantId: string; turnoId: string; nombre: string; monto: number },
): Promise<string | null> {
  const credencial = await obtenerCredencialMp(admin, args.tenantId);
  if (!credencial) return null;

  const vuelta = urlTurno(args.slug, args.turnoId);
  try {
    const pref = await crearPreferenciaSena({
      accessToken: credencial.accessToken,
      appointmentId: args.turnoId,
      titulo: `Seña — ${args.nombre}`,
      monto: args.monto,
      backUrls: { success: vuelta, failure: vuelta, pending: vuelta },
    });
    await admin
      .from('alma_appointments')
      .update({ mp_preference_id: pref.preferenceId, mp_init_point: pref.initPoint })
      .eq('id', args.turnoId);
    return pref.initPoint;
  } catch {
    return null;
  }
}

/** Reserva pública: valida, crea el turno y manda al pago si hay seña. */
export async function reservarTurno(
  _prev: ReservaState,
  formData: FormData,
): Promise<ReservaState> {
  // Honeypot: los humanos no lo ven ni lo completan. Se responde como éxito sin tocar nada.
  if (formData.get('sitio')) {
    return { info: 'Listo.' };
  }

  const parsed = reservaSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }
  const v = parsed.data;

  const tenant = await getTenantPorSlug(v.slug);
  if (!tenant) {
    return { error: 'Ese link no existe o ya no está activo.' };
  }

  const admin = createAdminSupabase();
  const resultado = await crearReservaPublica(admin, {
    tenantId: tenant.id,
    timezone: tenant.timezone,
    settings: tenant.settings,
    fecha: v.fecha,
    hora: v.hora,
    nombre: v.nombre,
    apellido: v.apellido,
    telefono: v.telefono,
    email: v.email,
    fechaNacimiento: v.fecha_nacimiento,
    serviceId: v.service_id || undefined,
    employeeId: v.employee_id || undefined,
  });

  if (!resultado.ok) {
    return { error: MENSAJES[resultado.motivo] };
  }

  // redirect() lanza: siempre fuera de try/catch.
  if (resultado.estado === 'pendiente_sena') {
    const link = await linkDeSena(admin, {
      slug: v.slug,
      tenantId: tenant.id,
      turnoId: resultado.turnoId,
      nombre: v.nombre,
      monto: resultado.senaMonto,
    });
    redirect(link ?? `/t/${v.slug}/turno/${resultado.turnoId}`);
  }
  redirect(`/t/${v.slug}/turno/${resultado.turnoId}`);
}

const pagoSchema = z.object({
  slug: z.string().regex(SLUG_RE),
  id: z.string().uuid(),
});

/** Reintento de pago desde la página pública del turno. */
export async function pagarSena(_prev: ReservaState, formData: FormData): Promise<ReservaState> {
  const parsed = pagoSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: 'No encontramos el turno.' };
  }
  const v = parsed.data;

  const tenant = await getTenantPorSlug(v.slug);
  if (!tenant) {
    return { error: 'Ese link no existe o ya no está activo.' };
  }

  const admin = createAdminSupabase();
  const { data: turno } = await admin
    .from('alma_appointments')
    .select('id, estado, sena_monto, mp_init_point, alma_patients(nombre)')
    .eq('id', v.id)
    .eq('tenant_id', tenant.id)
    .maybeSingle();
  if (!turno) {
    return { error: 'No encontramos el turno.' };
  }
  if (turno.estado !== 'pendiente_sena' || Number(turno.sena_monto) <= 0) {
    return { error: 'Este turno no tiene una seña pendiente.' };
  }

  // Si el link ya existe, se reusa (editar el turno lo invalida).
  if (turno.mp_init_point) {
    redirect(turno.mp_init_point);
  }

  const rel = turno.alma_patients;
  const nombre = (Array.isArray(rel) ? rel[0] : rel)?.nombre ?? 'Paciente';

  const link = await linkDeSena(admin, {
    slug: v.slug,
    tenantId: tenant.id,
    turnoId: turno.id,
    nombre,
    monto: Number(turno.sena_monto),
  });
  if (!link) {
    return { error: 'No pudimos generar el pago. Probá de nuevo en un rato.' };
  }
  redirect(link);
}
