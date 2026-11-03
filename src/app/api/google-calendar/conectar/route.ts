import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getSessionContext } from '@/lib/tenant';
import { siteUrl } from '@/lib/mp';
import { generarGooglePkce, generarGoogleState, googleConfigurado, urlGoogleAutorizacion } from '@/lib/google-calendar';

export async function GET() {
  const ctx = await getSessionContext();
  if (!ctx) redirect('/login');
  if (!googleConfigurado()) redirect('/ajustes?google=sin_config');
  const state = generarGoogleState();
  const { verifier, challenge } = generarGooglePkce();
  const jar = await cookies();
  const options = { httpOnly: true, secure: siteUrl().startsWith('https://'), sameSite: 'lax' as const, path: '/api/google-calendar', maxAge: 600 };
  jar.set('alma_google_state', state, options);
  jar.set('alma_google_verifier', verifier, options);
  redirect(urlGoogleAutorizacion(state, challenge, `${siteUrl()}/api/google-calendar/callback`));
}
