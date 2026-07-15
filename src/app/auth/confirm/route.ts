import { redirect } from 'next/navigation';
import { type NextRequest } from 'next/server';
import { type EmailOtpType } from '@supabase/supabase-js';
import { createServerSupabase } from '@/lib/supabase/server';

/** Destino de los links de confirmación de correo (emailRedirectTo del registro). */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;

  if (tokenHash && type) {
    const supabase = await createServerSupabase();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) {
      redirect('/hoy');
    }
  }

  redirect('/login?error=confirmacion');
}
