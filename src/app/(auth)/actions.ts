'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createServerSupabase } from '@/lib/supabase/server';
import { createAdminSupabase } from '@/lib/supabase/admin';

export type AuthState = { error?: string; info?: string };

const loginSchema = z.object({
  email: z.string().trim().email('Revisá el correo: no parece válido.'),
  password: z.string().min(1, 'Ingresá tu contraseña.'),
});

const registroSchema = z.object({
  nombre: z.string().trim().min(2, 'Contanos tu nombre.').max(80),
  email: z.string().trim().email('Revisá el correo: no parece válido.'),
  password: z.string().min(8, 'La contraseña necesita al menos 8 caracteres.'),
});

export async function login(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = loginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = await createServerSupabase();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    if (error.code === 'email_not_confirmed') {
      return { error: 'Tu correo todavía no está confirmado. Revisá tu casilla.' };
    }
    return { error: 'El correo o la contraseña no coinciden.' };
  }

  redirect('/hoy');
}

export async function registro(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = registroSchema.safeParse({
    nombre: formData.get('nombre'),
    email: formData.get('email'),
    password: formData.get('password'),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  // El proyecto Supabase es compartido: no tocamos el ajuste global de
  // confirmación de correo. Creamos la cuenta ya confirmada con service-role
  // y la logueamos en el acto, así el profesional entra sin pasar por el mail.
  const admin = createAdminSupabase();
  const { error: createErr } = await admin.auth.admin.createUser({
    email: parsed.data.email,
    password: parsed.data.password,
    email_confirm: true,
    user_metadata: { nombre: parsed.data.nombre },
  });
  if (createErr) {
    if (createErr.code === 'email_exists' || createErr.status === 422) {
      return { error: 'Ese correo ya tiene una cuenta. Probá iniciar sesión.' };
    }
    return { error: 'No pudimos crear tu cuenta. Probá de nuevo en un rato.' };
  }

  const supabase = await createServerSupabase();
  const { error: signInErr } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });
  if (signInErr) {
    return { error: 'Creamos tu cuenta pero no pudimos iniciar sesión. Probá entrar.' };
  }

  redirect('/hoy');
}

export async function logout(): Promise<void> {
  const supabase = await createServerSupabase();
  await supabase.auth.signOut();
  redirect('/login');
}
