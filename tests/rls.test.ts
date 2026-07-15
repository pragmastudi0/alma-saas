/**
 * F0 · Test de aislamiento multi-tenant.
 *
 * Corre contra el proyecto Supabase real. Crea dos usuarios de prueba,
 * cada uno con su tenant, y verifica que ninguno puede leer ni escribir
 * datos del otro. Los usuarios y tenants de prueba se borran al final.
 *
 * Requiere: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
 * SUPABASE_SERVICE_ROLE_KEY (solo local/CI, nunca en el cliente).
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !anonKey || !serviceKey) {
  throw new Error(
    'Faltan variables de entorno: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY y SUPABASE_SERVICE_ROLE_KEY (ver .env.example).',
  );
}

const admin = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

type TestUser = {
  id: string;
  email: string;
  client: SupabaseClient;
  tenantId: string;
};

const PASSWORD = 'alma-rls-test-8chars!';
const users: TestUser[] = [];

async function createTestUser(tag: string): Promise<TestUser> {
  const email = `rls-${tag}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@alma-test.local`;

  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
  });
  if (createErr || !created.user) throw createErr ?? new Error('createUser sin usuario');

  const client = createClient(url!, anonKey!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error: signInErr } = await client.auth.signInWithPassword({ email, password: PASSWORD });
  if (signInErr) throw signInErr;

  const { data: tenantId, error: bootErr } = await client.rpc('alma_bootstrap_tenant', {
    p_nombre: `Test ${tag}`,
  });
  if (bootErr || !tenantId) throw bootErr ?? new Error('bootstrap sin tenant');

  return { id: created.user.id, email, client, tenantId };
}

beforeAll(async () => {
  users.push(await createTestUser('a'), await createTestUser('b'));
});

afterAll(async () => {
  for (const u of users) {
    // borrar el tenant cascadea profiles/patients/etc.
    await admin.from('alma_tenants').delete().eq('id', u.tenantId);
    await admin.auth.admin.deleteUser(u.id);
  }
});

describe('aislamiento multi-tenant (RLS)', () => {
  it('cada usuario tiene su propio tenant', () => {
    const [a, b] = users;
    expect(a.tenantId).not.toEqual(b.tenantId);
  });

  it('el bootstrap es idempotente: repetirlo devuelve el mismo tenant', async () => {
    const [a] = users;
    const { data, error } = await a.client.rpc('alma_bootstrap_tenant', { p_nombre: 'otra vez' });
    expect(error).toBeNull();
    expect(data).toEqual(a.tenantId);
  });

  it('cada usuario ve solo su tenant', async () => {
    const [a, b] = users;
    const { data, error } = await a.client.from('alma_tenants').select('id');
    expect(error).toBeNull();
    expect(data?.map((t) => t.id)).toEqual([a.tenantId]);

    const { data: cross } = await a.client.from('alma_tenants').select('id').eq('id', b.tenantId);
    expect(cross).toEqual([]);
  });

  it('un usuario no puede leer pacientes del otro tenant', async () => {
    const [a, b] = users;

    const { data: pacienteB, error: insErr } = await b.client
      .from('alma_patients')
      .insert({ tenant_id: b.tenantId, nombre: 'Paciente de B' })
      .select('id')
      .single();
    expect(insErr).toBeNull();

    // A lista todos los pacientes: no aparece el de B
    const { data: listaA, error: selErr } = await a.client.from('alma_patients').select('id');
    expect(selErr).toBeNull();
    expect(listaA).toEqual([]);

    // A busca directamente por id el paciente de B: vacío
    const { data: directo } = await a.client
      .from('alma_patients')
      .select('id')
      .eq('id', pacienteB!.id);
    expect(directo).toEqual([]);
  });

  it('un usuario no puede insertar datos en el tenant del otro', async () => {
    const [a, b] = users;
    const { error } = await a.client
      .from('alma_patients')
      .insert({ tenant_id: b.tenantId, nombre: 'Intruso' });
    expect(error).not.toBeNull();
    expect(error!.code).toBe('42501'); // viola la política RLS
  });

  it('un usuario no puede modificar ni borrar pacientes del otro', async () => {
    const [a, b] = users;
    const { data: pacienteB } = await b.client
      .from('alma_patients')
      .select('id')
      .limit(1)
      .single();

    const { data: updated, error: updErr } = await a.client
      .from('alma_patients')
      .update({ nombre: 'Hackeado' })
      .eq('id', pacienteB!.id)
      .select();
    expect(updErr).toBeNull();
    expect(updated).toEqual([]); // RLS: 0 filas alcanzadas

    const { data: deleted, error: delErr } = await a.client
      .from('alma_patients')
      .delete()
      .eq('id', pacienteB!.id)
      .select();
    expect(delErr).toBeNull();
    expect(deleted).toEqual([]);

    // el paciente de B sigue intacto
    const { data: sigue } = await b.client
      .from('alma_patients')
      .select('nombre')
      .eq('id', pacienteB!.id)
      .single();
    expect(sigue?.nombre).toBe('Paciente de B');
  });

  it('un usuario no puede reasignar sus datos a otro tenant (update de tenant_id)', async () => {
    const [a, b] = users;
    const { data: propio, error: insErr } = await a.client
      .from('alma_patients')
      .insert({ tenant_id: a.tenantId, nombre: 'Paciente de A' })
      .select('id')
      .single();
    expect(insErr).toBeNull();

    const { data: moved, error } = await a.client
      .from('alma_patients')
      .update({ tenant_id: b.tenantId })
      .eq('id', propio!.id)
      .select();
    // el with check de la política rechaza la fila nueva
    expect(error?.code ?? (moved?.length === 0 ? '42501' : 'ok')).toBe('42501');
  });

  it('sin sesión (anon) no se lee nada de alma_*', async () => {
    const anon = createClient(url!, anonKey!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await anon.from('alma_patients').select('id');
    // revoke a anon ⇒ permission denied; si no, RLS deja la lista vacía
    expect(error !== null || data?.length === 0).toBe(true);
  });

  it('el cliente no puede escribir en alma_payments (reservado al servidor)', async () => {
    const [a] = users;
    const { error } = await a.client
      .from('alma_payments')
      .insert({ tenant_id: a.tenantId, mp_id: 'test', monto: 100, status: 'approved' });
    expect(error).not.toBeNull();
  });
});
