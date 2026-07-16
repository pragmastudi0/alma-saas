'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createServerSupabase } from '@/lib/supabase/server';
import { getSessionContext } from '@/lib/tenant';
import type { CajaState } from '@/lib/caja';

const FECHA = /^\d{4}-\d{2}-\d{2}$/;

const movimientoSchema = z.object({
  tipo: z.enum(['ingreso', 'gasto']),
  categoria: z.string().trim().min(1, 'Elegí una categoría.').max(40),
  descripcion: z.string().trim().max(120).default(''),
  monto: z.coerce.number().positive('El monto tiene que ser mayor a cero.'),
  fecha: z.string().regex(FECHA, 'Elegí una fecha válida.'),
});

const idSchema = z.object({ id: z.string().uuid() });

export async function crearMovimiento(
  _prev: CajaState,
  formData: FormData,
): Promise<CajaState> {
  const ctx = await getSessionContext();
  if (!ctx) redirect('/login');

  const parsed = movimientoSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }
  const v = parsed.data;

  const supabase = await createServerSupabase();
  const { error } = await supabase.from('alma_cash_entries').insert({
    tenant_id: ctx.tenantId,
    fecha: v.fecha,
    tipo: v.tipo,
    categoria: v.categoria,
    descripcion: v.descripcion,
    monto: v.monto,
  });
  if (error) {
    return { error: 'No pudimos guardar el movimiento. Probá de nuevo.' };
  }

  revalidatePath('/caja');
  revalidatePath('/hoy');
  redirect('/caja');
}

export async function eliminarMovimiento(
  _prev: CajaState,
  formData: FormData,
): Promise<CajaState> {
  const ctx = await getSessionContext();
  if (!ctx) redirect('/login');

  const parsed = idSchema.safeParse({ id: formData.get('id') });
  if (!parsed.success) {
    return { error: 'Movimiento inválido.' };
  }

  const supabase = await createServerSupabase();
  const { error } = await supabase.from('alma_cash_entries').delete().eq('id', parsed.data.id);
  if (error) {
    return { error: 'No pudimos borrar el movimiento.' };
  }

  revalidatePath('/caja');
  revalidatePath('/hoy');
  return { info: 'Listo.' };
}
