/** Tipos y lectura del tenant para el portal público de reservas (/t/[slug]). */
import { cache } from 'react';
import { createAdminSupabase } from '@/lib/supabase/admin';

export type ReservaState = { error?: string; info?: string };

export type TenantPublico = {
  id: string;
  nombre: string;
  profesion: string;
  timezone: string;
  slug: string;
  settings: {
    precio_default?: number;
    sena_default?: number;
    duracion_default?: number;
    alias_mp?: string | null;
  };
};

/**
 * Tenant por slug con el cliente admin (el portal corre sin sesión).
 * cache() evita duplicar la query entre layout y page del mismo request.
 */
export const getTenantPorSlug = cache(async (slug: string): Promise<TenantPublico | null> => {
  const admin = createAdminSupabase();
  const { data } = await admin
    .from('alma_tenants')
    .select('id, nombre, profesion, timezone, slug, settings')
    .eq('slug', slug)
    .maybeSingle();
  if (!data) return null;
  return {
    id: data.id,
    nombre: data.nombre,
    profesion: data.profesion ?? '',
    timezone: data.timezone,
    slug: data.slug,
    settings: (data.settings ?? {}) as TenantPublico['settings'],
  };
});
