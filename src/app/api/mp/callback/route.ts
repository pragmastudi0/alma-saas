import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { type NextRequest } from 'next/server';
import { getSessionContext } from '@/lib/tenant';
import { siteUrl } from '@/lib/mp';
import { guardarCuentaMp, intercambiarCode } from '@/lib/mp-oauth';
import { createAdminSupabase } from '@/lib/supabase/admin';

/**
 * Vuelta del OAuth de Mercado Pago. El tenant sale SIEMPRE de la sesión
 * activa (nunca del state); el state y el verifier PKCE se validan contra
 * las cookies que dejó /api/mp/conectar.
 */
export async function GET(req: NextRequest) {
  const ctx = await getSessionContext();
  if (!ctx) redirect('/login');

  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');

  const jar = await cookies();
  const stateEsperado = jar.get('mp_oauth_state')?.value;
  const verifier = jar.get('mp_oauth_verifier')?.value;
  jar.delete('mp_oauth_state');
  jar.delete('mp_oauth_verifier');

  if (!code || !state || !stateEsperado || !verifier || state !== stateEsperado) {
    redirect('/ajustes?mp=error');
  }

  let resultado: 'conectado' | 'en_uso' | 'error';
  try {
    const token = await intercambiarCode({
      code,
      verifier,
      redirectUri: `${siteUrl()}/api/mp/callback`,
    });
    const admin = createAdminSupabase();
    const { error } = await guardarCuentaMp(admin, ctx.tenantId, token);
    resultado = error === 'cuenta_en_uso' ? 'en_uso' : error ? 'error' : 'conectado';
  } catch {
    resultado = 'error';
  }

  redirect(`/ajustes?mp=${resultado}`);
}
