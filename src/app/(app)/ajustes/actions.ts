'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createServerSupabase } from '@/lib/supabase/server';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { getSessionContext } from '@/lib/tenant';
import { desconectarCuentaMp } from '@/lib/mp-oauth';
import type { AjustesState } from '@/lib/ajustes';
import { SENA_MODO_DEFAULT, montoSenaEfectivo } from '@/lib/sena';
import { INACTIVIDAD_DIAS_DEFAULT } from '@/lib/inactivos';
import type { DisponibilidadDia, DisponibilidadState } from '@/lib/disponibilidad';
import { SLUG_RE } from '@/lib/slug';

const ajustesSchema = z.object({
  nombre: z.string().trim().min(1, 'Contanos cómo te llamás.').max(80),
  profesion: z.string().trim().max(60).default(''),
  precio_default: z.coerce.number().min(0, 'El precio no puede ser negativo.').default(0),
  sena_modo: z.enum(['no', 'opcional', 'obligatoria']).default(SENA_MODO_DEFAULT),
  sena_default: z.coerce.number().min(0, 'La seña no puede ser negativa.').default(0),
  duracion_default: z.coerce.number().int().positive('La duración tiene que ser mayor a cero.'),
  inactividad_dias: z.coerce
    .number()
    .int()
    .min(1, 'El período de inactividad tiene que ser de al menos 1 día.')
    .max(365, 'El período de inactividad puede ser de hasta un año (365 días).')
    .default(INACTIVIDAD_DIAS_DEFAULT),
  plantilla_cancelacion: z
    .string()
    .trim()
    .max(300, 'La plantilla puede tener hasta 300 caracteres.')
    .default(''),
  alias_mp: z.string().trim().max(60).default(''),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .refine((s) => s === '' || SLUG_RE.test(s), {
      message: 'El link solo puede tener minúsculas, números y guiones (3 a 40 letras).',
    })
    .default(''),
});

export async function guardarAjustes(
  _prev: AjustesState,
  formData: FormData,
): Promise<AjustesState> {
  const ctx = await getSessionContext();
  if (!ctx) {
    return { error: 'Tu sesión expiró. Volvé a entrar.' };
  }

  const parsed = ajustesSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }
  const v = parsed.data;

  const supabase = await createServerSupabase();

  // Traemos los settings actuales para no pisar claves que no editamos (theme, etc.).
  const { data: actual } = await supabase
    .from('alma_tenants')
    .select('settings')
    .eq('id', ctx.tenantId)
    .maybeSingle();

  const settings = {
    ...((actual?.settings as Record<string, unknown>) ?? {}),
    precio_default: v.precio_default,
    sena_modo: v.sena_modo,
    // Si no cobra seña, el default va a cero: nada de montos colgados.
    sena_default: montoSenaEfectivo(v.sena_default, v.sena_modo),
    duracion_default: v.duracion_default,
    inactividad_dias: v.inactividad_dias,
    plantilla_cancelacion: v.plantilla_cancelacion || null,
    alias_mp: v.alias_mp || null,
  };

  const { error } = await supabase
    .from('alma_tenants')
    .update({ nombre: v.nombre, profesion: v.profesion, settings, slug: v.slug || null })
    .eq('id', ctx.tenantId);
  if (error) {
    if (error.code === '23505') {
      return { error: 'Ese link ya está en uso. Probá con otro.' };
    }
    return { error: 'No pudimos guardar los cambios. Probá de nuevo.' };
  }

  revalidatePath('/ajustes');
  revalidatePath('/hoy');
  revalidatePath('/reportes');
  return { info: 'Guardado.' };
}

// ─── Servicios ──────────────────────────────────────────

const servicioSchema = z.object({
  id: z.string().uuid().optional(),
  nombre: z.string().trim().min(1, 'Ponele un nombre al servicio.').max(80),
  descripcion: z.string().trim().max(200).default(''),
  precio: z.coerce.number().min(0, 'El precio no puede ser negativo.'),
  duracion_min: z.coerce.number().int().positive('La duración tiene que ser mayor a cero.'),
  sena_monto: z.coerce.number().min(0, 'La seña no puede ser negativa.').default(0),
});

export async function guardarServicio(
  _prev: AjustesState,
  formData: FormData,
): Promise<AjustesState> {
  const ctx = await getSessionContext();
  if (!ctx) return { error: 'Tu sesión expiró. Volvé a entrar.' };

  const parsed = servicioSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const v = parsed.data;

  const supabase = await createServerSupabase();

  if (v.id) {
    const { error } = await supabase
      .from('alma_services')
      .update({
        nombre: v.nombre,
        descripcion: v.descripcion,
        precio: v.precio,
        duracion_min: v.duracion_min,
        sena_monto: v.sena_monto,
      })
      .eq('id', v.id)
      .eq('tenant_id', ctx.tenantId);
    if (error) return { error: 'No pudimos guardar el servicio.' };
  } else {
    const { error } = await supabase.from('alma_services').insert({
      tenant_id: ctx.tenantId,
      nombre: v.nombre,
      descripcion: v.descripcion,
      precio: v.precio,
      duracion_min: v.duracion_min,
      sena_monto: v.sena_monto,
    });
    if (error) return { error: 'No pudimos crear el servicio.' };
  }

  revalidatePath('/ajustes');
  return { info: 'Servicio guardado.' };
}

export async function toggleServicio(formData: FormData): Promise<void> {
  const ctx = await getSessionContext();
  if (!ctx) return;

  const id = formData.get('id');
  const activo = formData.get('activo');
  if (typeof id !== 'string') return;

  const supabase = await createServerSupabase();
  await supabase
    .from('alma_services')
    .update({ activo: activo === 'true' })
    .eq('id', id)
    .eq('tenant_id', ctx.tenantId);
  revalidatePath('/ajustes');
}

// ─── Empleados ──────────────────────────────────────────

const empleadoSchema = z.object({
  id: z.string().uuid().optional(),
  nombre: z.string().trim().min(1, 'Ponele un nombre al empleado.').max(80),
  color: z.string().trim().default('#6366f1'),
});

export async function guardarEmpleado(
  _prev: AjustesState,
  formData: FormData,
): Promise<AjustesState> {
  const ctx = await getSessionContext();
  if (!ctx) return { error: 'Tu sesión expiró. Volvé a entrar.' };

  const parsed = empleadoSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const v = parsed.data;

  const supabase = await createServerSupabase();

  if (v.id) {
    const { error } = await supabase
      .from('alma_employees')
      .update({ nombre: v.nombre, color: v.color })
      .eq('id', v.id)
      .eq('tenant_id', ctx.tenantId);
    if (error) return { error: 'No pudimos guardar el empleado.' };
  } else {
    const { error } = await supabase.from('alma_employees').insert({
      tenant_id: ctx.tenantId,
      nombre: v.nombre,
      color: v.color,
    });
    if (error) return { error: 'No pudimos crear el empleado.' };
  }

  revalidatePath('/ajustes');
  return { info: 'Empleado guardado.' };
}

export async function toggleEmpleado(formData: FormData): Promise<void> {
  const ctx = await getSessionContext();
  if (!ctx) return;

  const id = formData.get('id');
  const activo = formData.get('activo');
  if (typeof id !== 'string') return;

  const supabase = await createServerSupabase();
  await supabase
    .from('alma_employees')
    .update({ activo: activo === 'true' })
    .eq('id', id)
    .eq('tenant_id', ctx.tenantId);
  revalidatePath('/ajustes');
}

/**
 * Baja definitiva de un empleado. Los turnos que atendió quedan sin empleado
 * asignado (el FK es `on delete set null`): el historial no se toca. Sus
 * horarios propios y las asignaciones a servicios sí se van con él (cascade).
 * Para sacarlo de la lista sin borrar nada está el botón Activo/Inactivo.
 */
export async function eliminarEmpleado(
  _prev: AjustesState,
  formData: FormData,
): Promise<AjustesState> {
  const ctx = await getSessionContext();
  if (!ctx) return { error: 'Tu sesión expiró. Volvé a entrar.' };

  const parsed = z.object({ id: z.string().uuid() }).safeParse({ id: formData.get('id') });
  if (!parsed.success) return { error: 'Empleado inválido.' };

  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from('alma_employees')
    .delete()
    .eq('id', parsed.data.id)
    .eq('tenant_id', ctx.tenantId)
    .select('id');
  if (error) return { error: 'No pudimos eliminar el empleado.' };
  if (!data?.length) return { error: 'No encontramos ese empleado.' };

  revalidatePath('/ajustes');
  revalidatePath('/agenda');
  revalidatePath('/hoy');
  return { info: 'Empleado eliminado.' };
}

// ─── Asignación empleados ↔ servicio ────────────────────

export async function toggleEmpleadoServicio(formData: FormData): Promise<void> {
  const ctx = await getSessionContext();
  if (!ctx) return;

  const serviceId = formData.get('service_id');
  const employeeId = formData.get('employee_id');
  const asignar = formData.get('asignar') === 'true';
  if (typeof serviceId !== 'string' || typeof employeeId !== 'string') return;

  const supabase = await createServerSupabase();
  if (asignar) {
    await supabase.from('alma_service_employees').insert({
      tenant_id: ctx.tenantId,
      service_id: serviceId,
      employee_id: employeeId,
    });
  } else {
    await supabase
      .from('alma_service_employees')
      .delete()
      .eq('service_id', serviceId)
      .eq('employee_id', employeeId);
  }
  revalidatePath('/ajustes');
}

/** Desconecta la cuenta de Mercado Pago del tenant (borra sus credenciales). */
export async function desconectarMp(): Promise<void> {
  const ctx = await getSessionContext();
  if (!ctx) redirect('/login');

  const admin = createAdminSupabase();
  await desconectarCuentaMp(admin, ctx.tenantId);

  revalidatePath('/ajustes');
  redirect('/ajustes?mp=desconectado');
}

const HORA = /^\d{2}:\d{2}$/;

const disponibilidadSchema = z.array(
  z
    .object({
      dia_semana: z.number().int().min(0).max(6),
      hora_desde: z.string().regex(HORA, 'Completá los horarios de los días activos.'),
      hora_hasta: z.string().regex(HORA, 'Completá los horarios de los días activos.'),
    })
    .refine((d) => d.hora_desde < d.hora_hasta, {
      message: 'El horario de cierre tiene que ser después del de apertura.',
    }),
);

/**
 * Guarda la disponibilidad semanal (alma_availability): un rango por día.
 * Persiste con delete + insert de las filas del tenant; si el insert falla,
 * el reintento del form lo arregla.
 */
export async function guardarDisponibilidad(
  _prev: DisponibilidadState,
  formData: FormData,
): Promise<DisponibilidadState> {
  const ctx = await getSessionContext();
  if (!ctx) {
    return { error: 'Tu sesión expiró. Volvé a entrar.' };
  }

  const crudas = [];
  for (let n = 0; n <= 6; n++) {
    if (formData.get(`d${n}_activo`) !== 'on') continue;
    crudas.push({
      dia_semana: n,
      hora_desde: String(formData.get(`d${n}_desde`) ?? ''),
      hora_hasta: String(formData.get(`d${n}_hasta`) ?? ''),
    });
  }

  const parsed = disponibilidadSchema.safeParse(crudas);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }
  const filas: DisponibilidadDia[] = parsed.data;

  const supabase = await createServerSupabase();

  const { error: delErr } = await supabase
    .from('alma_availability')
    .delete()
    .eq('tenant_id', ctx.tenantId);
  if (delErr) {
    return { error: 'No pudimos guardar los horarios. Probá de nuevo.' };
  }

  if (filas.length > 0) {
    const { error: insErr } = await supabase
      .from('alma_availability')
      .insert(filas.map((f) => ({ ...f, tenant_id: ctx.tenantId })));
    if (insErr) {
      return { error: 'No pudimos guardar los horarios. Probá de nuevo.' };
    }
  }

  revalidatePath('/ajustes');
  return { info: 'Guardado.' };
}
