import { z } from 'zod';
import { getSessionContext } from '@/lib/tenant';
import { createServerSupabase } from '@/lib/supabase/server';
import { hoyISO } from '@/lib/fecha';
import { sincronizarGoogle } from '@/lib/google-calendar';

const schema = z.object({ offset: z.number().int().nonnegative() });
const LOTE = 10;

export async function POST(req: Request) {
  const ctx = await getSessionContext();
  if (!ctx) return Response.json({ error: 'Sesión expirada.' }, { status: 401 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: 'Pedido inválido.' }, { status: 400 });
  const supabase = await createServerSupabase();
  const { data: tenant, error: tenantError } = await supabase.from('alma_tenants').select('timezone').eq('id', ctx.tenantId).single();
  if (tenantError) return Response.json({ error: 'No pudimos leer tus ajustes.' }, { status: 500 });
  const { data, error } = await supabase.from('alma_appointments')
    .select('id').eq('tenant_id', ctx.tenantId).gte('fecha', hoyISO(tenant.timezone))
    .in('estado', ['confirmado', 'completado'])
    .order('fecha').order('id').range(parsed.data.offset, parsed.data.offset + LOTE - 1);
  if (error) return Response.json({ error: 'No pudimos leer los turnos.' }, { status: 500 });
  let fallidos = 0;
  for (const turno of data ?? []) {
    try {
      const resultado = await sincronizarGoogle(ctx.tenantId, turno.id, 'UPDATE');
      if (resultado === 'sin_conexion') return Response.json({ error: 'Google no está conectado.' }, { status: 409 });
    } catch {
      fallidos++;
    }
  }
  return Response.json({ nextOffset: parsed.data.offset + (data?.length ?? 0), hasMore: (data?.length ?? 0) === LOTE, fallidos });
}
