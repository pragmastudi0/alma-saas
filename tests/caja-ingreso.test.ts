/**
 * B · Ingreso de turno en caja (registrarIngresoTurno).
 *
 * Verifica el invariante del asiento automático: la seña y el saldo de un turno
 * entran a la caja una sola vez por categoría (idempotencia), de modo que un
 * reintento —o el doble disparo del webhook— nunca duplica el dinero.
 *
 * Corre contra el proyecto Supabase real.
 * Requiere: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
 * SUPABASE_SERVICE_ROLE_KEY (solo local/CI).
 */
import { createClient } from '@supabase/supabase-js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { hoyISO, TZ_DEFAULT } from '../src/lib/fecha';
import { registrarIngresoTurno } from '../src/lib/caja';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !anonKey || !serviceKey) {
  throw new Error(
    'Faltan variables de entorno: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY y SUPABASE_SERVICE_ROLE_KEY.',
  );
}

const admin = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const PASSWORD = 'alma-caja-test-8!';
let userId = '';
let tenantId = '';
let appointmentId = '';

beforeAll(async () => {
  const email = `caja-${Date.now()}-${Math.floor(Math.random() * 1e6)}@alma-test.local`;
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
  });
  if (createErr || !created.user) throw createErr ?? new Error('createUser sin usuario');
  userId = created.user.id;

  const client = createClient(url!, anonKey!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error: signInErr } = await client.auth.signInWithPassword({ email, password: PASSWORD });
  if (signInErr) throw signInErr;

  const { data: tid, error: bootErr } = await client.rpc('alma_bootstrap_tenant', {
    p_nombre: 'Test Caja',
  });
  if (bootErr || !tid) throw bootErr ?? new Error('bootstrap sin tenant');
  tenantId = tid;

  const { data: pac } = await admin
    .from('alma_patients')
    .insert({ tenant_id: tenantId, nombre: 'Caja', apellido: 'Test' })
    .select('id')
    .single();

  const { data: appt } = await admin
    .from('alma_appointments')
    .insert({
      tenant_id: tenantId,
      patient_id: pac!.id,
      fecha: hoyISO(TZ_DEFAULT),
      hora: '10:00',
      duracion_min: 45,
      precio: 15000,
      sena_monto: 5000,
      estado: 'confirmado',
    })
    .select('id')
    .single();
  appointmentId = appt!.id;
});

afterAll(async () => {
  await admin.from('alma_tenants').delete().eq('id', tenantId);
  await admin.auth.admin.deleteUser(userId);
});

async function montos(categoria: string): Promise<number[]> {
  const { data } = await admin
    .from('alma_cash_entries')
    .select('monto')
    .eq('appointment_id', appointmentId)
    .eq('categoria', categoria)
    .eq('tipo', 'ingreso');
  return (data ?? []).map((r) => Number(r.monto));
}

describe('registrarIngresoTurno', () => {
  it('asienta el saldo una vez y no duplica al reintentar', async () => {
    const saldo = 15000 - 5000;
    await registrarIngresoTurno(admin, {
      tenantId,
      appointmentId,
      categoria: 'Turno',
      monto: saldo,
    });
    // Reintento: mismo turno, misma categoría → no debe duplicar.
    await registrarIngresoTurno(admin, {
      tenantId,
      appointmentId,
      categoria: 'Turno',
      monto: saldo,
    });

    const entradas = await montos('Turno');
    expect(entradas).toEqual([saldo]);
  });

  it('la seña es un asiento distinto (otra categoría), también único', async () => {
    await registrarIngresoTurno(admin, {
      tenantId,
      appointmentId,
      categoria: 'Seña',
      monto: 5000,
    });
    await registrarIngresoTurno(admin, {
      tenantId,
      appointmentId,
      categoria: 'Seña',
      monto: 5000,
    });

    expect(await montos('Seña')).toEqual([5000]);
  });

  it('monto cero no genera asiento', async () => {
    await registrarIngresoTurno(admin, {
      tenantId,
      appointmentId,
      categoria: 'Vacío',
      monto: 0,
    });
    expect(await montos('Vacío')).toEqual([]);
  });
});
