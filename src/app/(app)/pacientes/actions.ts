'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createServerSupabase } from '@/lib/supabase/server';
import { getSessionContext } from '@/lib/tenant';
import type { PacienteState } from '@/lib/paciente';

const FECHA = /^\d{4}-\d{2}-\d{2}$/;

const pacienteSchema = z.object({
  nombre: z.string().trim().min(2, 'Contanos el nombre del paciente.').max(80),
  apellido: z.string().trim().max(80).default(''),
  telefono: z.string().trim().max(40).default(''),
  email: z
    .union([z.string().trim().email('Revisá el correo: no parece válido.'), z.literal('')])
    .default(''),
  // date <input> manda '' cuando está vacío; lo guardamos como null.
  fecha_nacimiento: z
    .union([z.string().regex(FECHA, 'Revisá la fecha de nacimiento.'), z.literal('')])
    .default(''),
  notas: z.string().trim().max(2000).default(''),
});

const editarSchema = pacienteSchema.extend({ id: z.string().uuid() });
const idSchema = z.object({ id: z.string().uuid() });

export async function crearPaciente(
  _prev: PacienteState,
  formData: FormData,
): Promise<PacienteState> {
  const ctx = await getSessionContext();
  if (!ctx) redirect('/login');

  const parsed = pacienteSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }
  const v = parsed.data;

  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from('alma_patients')
    .insert({
      tenant_id: ctx.tenantId,
      nombre: v.nombre,
      apellido: v.apellido,
      telefono: v.telefono,
      email: v.email,
      fecha_nacimiento: v.fecha_nacimiento || null,
      notas: v.notas,
    })
    .select('id')
    .single();
  if (error || !data) {
    // Nunca logueamos notas ni datos del paciente.
    return { error: 'No pudimos guardar el paciente. Probá de nuevo.' };
  }

  revalidatePath('/pacientes');
  redirect(`/pacientes/${data.id}`);
}

export async function editarPaciente(
  _prev: PacienteState,
  formData: FormData,
): Promise<PacienteState> {
  const ctx = await getSessionContext();
  if (!ctx) redirect('/login');

  const parsed = editarSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }
  const v = parsed.data;

  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from('alma_patients')
    .update({
      nombre: v.nombre,
      apellido: v.apellido,
      telefono: v.telefono,
      email: v.email,
      fecha_nacimiento: v.fecha_nacimiento || null,
      notas: v.notas,
    })
    .eq('id', v.id)
    .select('id');
  if (error) {
    return { error: 'No pudimos actualizar el paciente.' };
  }
  if (!data?.length) {
    return { error: 'No encontramos ese paciente.' };
  }

  revalidatePath('/pacientes');
  revalidatePath('/pacientes/[id]', 'page');
  redirect(`/pacientes/${v.id}`);
}

/**
 * Baja de un paciente. Si tiene turnos asociados se archiva (soft-delete) para
 * no romper el historial ni la caja por el ON DELETE CASCADE de los turnos; si
 * no tiene ninguno, se borra de verdad. Los listados filtran archivado=false.
 */
export async function eliminarPaciente(
  _prev: PacienteState,
  formData: FormData,
): Promise<PacienteState> {
  const ctx = await getSessionContext();
  if (!ctx) redirect('/login');

  const parsed = idSchema.safeParse({ id: formData.get('id') });
  if (!parsed.success) {
    return { error: 'Paciente inválido.' };
  }
  const { id } = parsed.data;

  const supabase = await createServerSupabase();

  const { count } = await supabase
    .from('alma_appointments')
    .select('id', { count: 'exact', head: true })
    .eq('patient_id', id);

  if ((count ?? 0) > 0) {
    const { error } = await supabase
      .from('alma_patients')
      .update({ archivado: true })
      .eq('id', id);
    if (error) {
      return { error: 'No pudimos archivar el paciente.' };
    }
  } else {
    const { error } = await supabase.from('alma_patients').delete().eq('id', id);
    if (error) {
      return { error: 'No pudimos eliminar el paciente.' };
    }
  }

  revalidatePath('/pacientes');
  redirect('/pacientes');
}
