'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createServerSupabase } from '@/lib/supabase/server';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { getSessionContext } from '@/lib/tenant';
import { desconectarCuentaMp } from '@/lib/mp-oauth';
import type { AjustesState } from '@/lib/ajustes';
import type { DisponibilidadDia, DisponibilidadState } from '@/lib/disponibilidad';
import { SLUG_RE } from '@/lib/slug';

const ajustesSchema = z.object({
  nombre: z.string().trim().min(1, 'Contanos cómo te llamás.').max(80),
  profesion: z.string().trim().max(60).default(''),
  precio_default: z.coerce.number().min(0, 'El precio no puede ser negativo.').default(0),
  sena_default: z.coerce.number().min(0, 'La seña no puede ser negativa.').default(0),
  duracion_default: z.coerce.number().int().positive('La duración tiene que ser mayor a cero.'),
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
    sena_default: v.sena_default,
    duracion_default: v.duracion_default,
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
  return { info: 'Guardado.' };
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
