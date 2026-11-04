import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { getSessionContext } from '@/lib/tenant';
import { siteUrl } from '@/lib/mp';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { conectarGoogle } from '@/lib/google-calendar';

const callbackSchema = z.object({ code: z.string().min(1), state: z.string().min(1) });

export async function GET(req: Request) {
  const ctx = await getSessionContext();
  if (!ctx) redirect('/login');
  const params = new URL(req.url).searchParams;
  const parsed = callbackSchema.safeParse({ code: params.get('code'), state: params.get('state') });
  const jar = await cookies();
  const expected = jar.get('alma_google_state')?.value;
  const verifier = jar.get('alma_google_verifier')?.value;
  jar.delete('alma_google_state');
  jar.delete('alma_google_verifier');
  if (!parsed.success || !expected || !verifier || parsed.data.state !== expected) redirect('/ajustes?google=error');
  try {
    await conectarGoogle(createAdminSupabase(), ctx.tenantId, parsed.data.code, verifier, `${siteUrl()}/api/google-calendar/callback`);
  } catch {
    redirect('/ajustes?google=error');
  }
  redirect('/ajustes?google=conectado');
}
