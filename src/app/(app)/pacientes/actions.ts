'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createServerSupabase } from '@/lib/supabase/server';
import { getSessionContext } from '@/lib/tenant';
import type { PacienteState } from '@/lib/paciente';

const pacienteSchema = z.object({
  nombre: z.string().trim().min(2, 'Contanos el nombre del paciente.').max(80),
  telefono: z.string().trim().max(40).default(''),
  email: z
    .union([z.string().trim().email('Revisá el correo: no parece válido.'), z.literal('')])
    .default(''),
  notas: z.string().trim().max(2000).default(''),
});

const editarSchema = pacienteSchema.extend({ id: z.string().uuid() });

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
      telefono: v.telefono,
      email: v.email,
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
    .update({ nombre: v.nombre, telefono: v.telefono, email: v.email, notas: v.notas })
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
