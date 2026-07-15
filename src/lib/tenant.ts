import { createServerSupabase } from '@/lib/supabase/server';

export type SessionContext = {
  userId: string;
  tenantId: string;
  nombre: string;
};

/**
 * Contexto del usuario autenticado. Si todavía no tiene tenant
 * (primer ingreso), lo crea vía alma_bootstrap_tenant (idempotente).
 * Devuelve null si no hay sesión.
 */
export async function getSessionContext(): Promise<SessionContext | null> {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('alma_profiles')
    .select('tenant_id, nombre')
    .eq('user_id', user.id)
    .maybeSingle();

  if (profile) {
    return { userId: user.id, tenantId: profile.tenant_id, nombre: profile.nombre };
  }

  const nombre = typeof user.user_metadata?.nombre === 'string' ? user.user_metadata.nombre : '';
  const { data: tenantId, error } = await supabase.rpc('alma_bootstrap_tenant', {
    p_nombre: nombre,
  });
  if (error || !tenantId) {
    throw new Error('No se pudo preparar tu espacio de trabajo.');
  }

  return { userId: user.id, tenantId, nombre };
}
