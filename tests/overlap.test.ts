/**
 * F1 · Test de superposición de turnos.
 *
 * Corre contra el proyecto Supabase real. Verifica el trigger
 * alma_appointments_check_overlap: dos turnos activos del mismo tenant
 * no pueden solaparse en el tiempo. Los turnos adyacentes sí se permiten,
 * los estados cancelado/ausente liberan el horario, y dos tenants distintos
 * pueden tener turnos a la misma hora.
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
  patientId: string;
};

const PASSWORD = 'alma-overlap-test-8chars!';
const users: TestUser[] = [];

/** Turno base; los tests sólo pisan fecha/hora/duración/estado. */
function turno(u: TestUser, over: Record<string, unknown>) {
  return {
    tenant_id: u.tenantId,
    patient_id: u.patientId,
    fecha: '2026-08-06',
    hora: '09:00',
    duracion_min: 45,
    precio: 15000,
    sena_monto: 0,
    estado: 'confirmado',
    ...over,
  };
}

async function createTestUser(tag: string): Promise<TestUser> {
  const email = `overlap-${tag}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@alma-test.local`;

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

  const { data: patient, error: patErr } = await client
    .from('alma_patients')
    .insert({ tenant_id: tenantId, nombre: `Paciente ${tag}` })
    .select('id')
    .single();
  if (patErr || !patient) throw patErr ?? new Error('paciente sin id');

  return { id: created.user.id, email, client, tenantId, patientId: patient.id };
}

beforeAll(async () => {
  users.push(await createTestUser('a'), await createTestUser('b'));
});

afterAll(async () => {
  for (const u of users) {
    // borrar el tenant cascadea profiles/patients/appointments
    await admin.from('alma_tenants').delete().eq('id', u.tenantId);
    await admin.auth.admin.deleteUser(u.id);
  }
});

describe('superposición de turnos (trigger)', () => {
  it('rechaza un turno que se solapa con otro activo', async () => {
    const [a] = users;
    const base = await a.client.from('alma_appointments').insert(turno(a, { hora: '09:00' }));
    expect(base.error).toBeNull();

    // 09:30 cae dentro de 09:00–09:45 ⇒ solape
    const { error } = await a.client.from('alma_appointments').insert(turno(a, { hora: '09:30' }));
    expect(error?.code).toBe('23P01');

    await a.client.from('alma_appointments').delete().eq('tenant_id', a.tenantId);
  });

  it('permite turnos adyacentes (fin de uno = inicio del otro)', async () => {
    const [a] = users;
    const primero = await a.client.from('alma_appointments').insert(turno(a, { hora: '09:00' }));
    expect(primero.error).toBeNull();

    // 09:45 arranca justo cuando termina el de 09:00–09:45 ⇒ sin solape
    const { error } = await a.client.from('alma_appointments').insert(turno(a, { hora: '09:45' }));
    expect(error).toBeNull();

    await a.client.from('alma_appointments').delete().eq('tenant_id', a.tenantId);
  });

  it('un turno cancelado libera su horario', async () => {
    const [a] = users;
    const { data: creado, error: insErr } = await a.client
      .from('alma_appointments')
      .insert(turno(a, { hora: '09:00' }))
      .select('id')
      .single();
    expect(insErr).toBeNull();

    // cancelarlo lo saca de la agenda
    const { error: cancErr } = await a.client
      .from('alma_appointments')
      .update({ estado: 'cancelado' })
      .eq('id', creado!.id);
    expect(cancErr).toBeNull();

    // ahora se puede tomar el mismo horario
    const { error } = await a.client.from('alma_appointments').insert(turno(a, { hora: '09:00' }));
    expect(error).toBeNull();

    await a.client.from('alma_appointments').delete().eq('tenant_id', a.tenantId);
  });

  it('un turno ausente no bloquea el horario', async () => {
    const [a] = users;
    const ausente = await a.client
      .from('alma_appointments')
      .insert(turno(a, { hora: '09:00', estado: 'ausente' }));
    expect(ausente.error).toBeNull();

    const { error } = await a.client.from('alma_appointments').insert(turno(a, { hora: '09:00' }));
    expect(error).toBeNull();

    await a.client.from('alma_appointments').delete().eq('tenant_id', a.tenantId);
  });

  it('dos tenants distintos pueden tener turnos a la misma hora', async () => {
    const [a, b] = users;
    const enA = await a.client.from('alma_appointments').insert(turno(a, { hora: '10:00' }));
    expect(enA.error).toBeNull();

    const enB = await b.client.from('alma_appointments').insert(turno(b, { hora: '10:00' }));
    expect(enB.error).toBeNull();

    await a.client.from('alma_appointments').delete().eq('tenant_id', a.tenantId);
    await b.client.from('alma_appointments').delete().eq('tenant_id', b.tenantId);
  });

  it('rechaza un UPDATE que mueve un turno encima de otro', async () => {
    const [a] = users;
    const fijo = await a.client.from('alma_appointments').insert(turno(a, { hora: '09:00' }));
    expect(fijo.error).toBeNull();

    const { data: movible, error: insErr } = await a.client
      .from('alma_appointments')
      .insert(turno(a, { hora: '11:00' }))
      .select('id')
      .single();
    expect(insErr).toBeNull();

    // mover el de las 11:00 a las 09:15 lo mete adentro del de las 09:00
    const { error } = await a.client
      .from('alma_appointments')
      .update({ hora: '09:15' })
      .eq('id', movible!.id);
    expect(error?.code).toBe('23P01');

    await a.client.from('alma_appointments').delete().eq('tenant_id', a.tenantId);
  });
});
