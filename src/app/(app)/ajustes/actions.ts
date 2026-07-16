'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createServerSupabase } from '@/lib/supabase/server';
import { getSessionContext } from '@/lib/tenant';
import type { AjustesState } from '@/lib/ajustes';

const ajustesSchema = z.object({
  nombre: z.string().trim().min(1, 'Contanos cómo te llamás.').max(80),
  profesion: z.string().trim().max(60).default(''),
  precio_default: z.coerce.number().min(0, 'El precio no puede ser negativo.').default(0),
  sena_default: z.coerce.number().min(0, 'La seña no puede ser negativa.').default(0),
  duracion_default: z.coerce.number().int().positive('La duración tiene que ser mayor a cero.'),
  alias_mp: z.string().trim().max(60).default(''),
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
    .update({ nombre: v.nombre, profesion: v.profesion, settings })
    .eq('id', ctx.tenantId);
  if (error) {
    return { error: 'No pudimos guardar los cambios. Probá de nuevo.' };
  }

  revalidatePath('/ajustes');
  revalidatePath('/hoy');
  return { info: 'Guardado.' };
}
