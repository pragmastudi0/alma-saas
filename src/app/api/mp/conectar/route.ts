import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getSessionContext } from '@/lib/tenant';
import { siteUrl } from '@/lib/mp';
import { generarPkce, generarState, mpAppConfigurada, urlAutorizacion } from '@/lib/mp-oauth';

/**
 * Arranque del OAuth de Mercado Pago: manda al profesional a autorizar su
 * cuenta. state + PKCE viajan en cookies httpOnly y se validan en el callback.
 */
export async function GET() {
  const ctx = await getSessionContext();
  if (!ctx) redirect('/login');

  if (!mpAppConfigurada()) {
    redirect('/ajustes?mp=sin_config');
  }

  const state = generarState();
  const { verifier, challenge } = generarPkce();

  const jar = await cookies();
  const opts = {
    httpOnly: true,
    secure: true,
    sameSite: 'lax' as const,
    path: '/api/mp',
    maxAge: 600,
  };
  jar.set('mp_oauth_state', state, opts);
  jar.set('mp_oauth_verifier', verifier, opts);

  redirect(
    urlAutorizacion({
      state,
      challenge,
      redirectUri: `${siteUrl()}/api/mp/callback`,
    }),
  );
}
