import { createClient } from '@supabase/supabase-js';

/**
 * Cliente con service-role: solo para server actions / route handlers.
 * Nunca exponer al cliente. Usa la SUPABASE_SERVICE_ROLE_KEY del env del server.
 */
export function createAdminSupabase() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    throw new Error('Falta SUPABASE_SERVICE_ROLE_KEY en el entorno del server.');
  }
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
