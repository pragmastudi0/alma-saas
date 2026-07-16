/**
 * F3b · Cuentas de Mercado Pago por tenant.
 *
 * Verifica el cifrado de tokens (round-trip AES-256-GCM) y la RLS de
 * alma_mp_accounts: el cliente puede ver que SU cuenta existe (sin tokens),
 * no ve cuentas ajenas y no puede escribir la tabla.
 *
 * Requiere: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
 * SUPABASE_SERVICE_ROLE_KEY (solo local/CI, nunca en el cliente).
 */
import crypto from 'node:crypto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

// Clave efímera para el round-trip de cifrado (no toca ningún entorno real).
process.env.MP_TOKEN_ENC_KEY ??= crypto.randomBytes(32).toString('base64');

import { cifrar, descifrar } from '../src/lib/crypto';

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

const PASSWORD = 'alma-mpoauth-test-8!';

type TestUser = { id: string; client: SupabaseClient; tenantId: string };
const users: TestUser[] = [];
let collectorBase = 0;

async function crearUsuario(tag: string): Promise<TestUser> {
  const email = `mpo-${tag}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@alma-test.local`;
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

  const { data: tid, error: bootErr } = await client.rpc('alma_bootstrap_tenant', {
    p_nombre: `Test ${tag}`,
  });
  if (bootErr || !tid) throw bootErr ?? new Error('bootstrap sin tenant');

  return { id: created.user.id, client, tenantId: tid };
}

beforeAll(async () => {
  users.push(await crearUsuario('a'), await crearUsuario('b'));
  collectorBase = Math.floor(Date.now() / 1000);

  // Solo el tenant A tiene cuenta MP conectada (la escribe el service role).
  const { error } = await admin.from('alma_mp_accounts').insert({
    tenant_id: users[0].tenantId,
    collector_id: collectorBase,
    access_token_enc: cifrar('APP_USR-token-secreto'),
    refresh_token_enc: cifrar('TG-refresh-secreto'),
    expires_at: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(),
  });
  if (error) throw error;
});

afterAll(async () => {
  for (const u of users) {
    await admin.from('alma_tenants').delete().eq('id', u.tenantId);
    await admin.auth.admin.deleteUser(u.id);
  }
});

describe('cifrado de tokens', () => {
  it('cifrar/descifrar es round-trip y no deja el texto plano en el payload', () => {
    const secreto = 'APP_USR-1234567890-abcdef';
    const payload = cifrar(secreto);
    expect(payload).not.toContain(secreto);
    expect(descifrar(payload)).toBe(secreto);
  });

  it('dos cifrados del mismo texto no se repiten (IV aleatorio)', () => {
    expect(cifrar('igual')).not.toEqual(cifrar('igual'));
  });
});

describe('RLS de alma_mp_accounts', () => {
  it('el dueño ve el estado de su conexión (sin tokens)', async () => {
    const [a] = users;
    const { data, error } = await a.client
      .from('alma_mp_accounts')
      .select('tenant_id, collector_id, live_mode, connected_at, expires_at')
      .maybeSingle();
    expect(error).toBeNull();
    expect(data?.tenant_id).toBe(a.tenantId);
    expect(Number(data?.collector_id)).toBe(collectorBase);
  });

  it('el dueño NO puede leer las columnas de tokens', async () => {
    const [a] = users;
    const { error } = await a.client.from('alma_mp_accounts').select('access_token_enc');
    expect(error).not.toBeNull(); // permiso de columna denegado
  });

  it('otro tenant no ve la cuenta ajena', async () => {
    const [, b] = users;
    const { data, error } = await b.client
      .from('alma_mp_accounts')
      .select('tenant_id, collector_id');
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it('el cliente no puede escribir la tabla (insert/update/delete)', async () => {
    const [a, b] = users;

    const { error: insErr } = await b.client.from('alma_mp_accounts').insert({
      tenant_id: b.tenantId,
      collector_id: collectorBase + 1,
      access_token_enc: 'x',
      expires_at: new Date(Date.now() + 1000).toISOString(),
    });
    expect(insErr).not.toBeNull();

    const { error: updErr } = await a.client
      .from('alma_mp_accounts')
      .update({ collector_id: collectorBase + 2 })
      .eq('tenant_id', a.tenantId);
    expect(updErr).not.toBeNull();

    const { error: delErr } = await a.client
      .from('alma_mp_accounts')
      .delete()
      .eq('tenant_id', a.tenantId);
    expect(delErr).not.toBeNull();

    // la fila sigue intacta
    const { data } = await admin
      .from('alma_mp_accounts')
      .select('collector_id')
      .eq('tenant_id', a.tenantId)
      .single();
    expect(Number(data?.collector_id)).toBe(collectorBase);
  });
});
