/**
 * F3 · Idempotencia del webhook de Mercado Pago (multi-vendedor).
 *
 * Corre contra el proyecto Supabase real. Verifica que registrar el mismo pago
 * dos veces no duplica filas en alma_payments ni re-confirma el turno, que un
 * pago no aprobado no confirma, que un pago de una cuenta MP ajena al turno se
 * ignora, y que la seña acreditada asienta el ingreso en caja una sola vez.
 *
 * Requiere: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
 * SUPABASE_SERVICE_ROLE_KEY (solo local/CI, nunca en el cliente).
 */
import crypto from 'node:crypto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { registrarPagoSena } from '../src/lib/mp-webhook';

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

const PASSWORD = 'alma-mp-test-8chars!';
let userId = '';
let tenantId = '';
let patientId = '';
let client: SupabaseClient;

/** Crea un turno pendiente_sena y devuelve su id. */
async function nuevoTurno(hora: string): Promise<string> {
  const { data, error } = await client
    .from('alma_appointments')
    .insert({
      tenant_id: tenantId,
      patient_id: patientId,
      fecha: '2026-09-03',
      hora,
      duracion_min: 45,
      precio: 15000,
      sena_monto: 5000,
      estado: 'pendiente_sena',
    })
    .select('id')
    .single();
  if (error || !data) throw error ?? new Error('turno sin id');
  return data.id;
}

beforeAll(async () => {
  const email = `mp-${Date.now()}-${Math.floor(Math.random() * 1e6)}@alma-test.local`;
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
  });
  if (createErr || !created.user) throw createErr ?? new Error('createUser sin usuario');
  userId = created.user.id;

  client = createClient(url!, anonKey!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error: signInErr } = await client.auth.signInWithPassword({ email, password: PASSWORD });
  if (signInErr) throw signInErr;

  const { data: tid, error: bootErr } = await client.rpc('alma_bootstrap_tenant', {
    p_nombre: 'Test MP',
  });
  if (bootErr || !tid) throw bootErr ?? new Error('bootstrap sin tenant');
  tenantId = tid;

  const { data: pat, error: patErr } = await client
    .from('alma_patients')
    .insert({ tenant_id: tenantId, nombre: 'Paciente MP' })
    .select('id')
    .single();
  if (patErr || !pat) throw patErr ?? new Error('paciente sin id');
  patientId = pat.id;
});

afterAll(async () => {
  await admin.from('alma_tenants').delete().eq('id', tenantId);
  await admin.auth.admin.deleteUser(userId);
});

describe('idempotencia del webhook MP', () => {
  it('un pago aprobado confirma el turno; repetirlo no duplica ni re-confirma', async () => {
    const turnoId = await nuevoTurno('09:00');
    const mpId = `mp-${Date.now()}-1`;

    const primero = await registrarPagoSena(admin, {
      mpId,
      status: 'approved',
      monto: 5000,
      appointmentId: turnoId,
      tenantId,
      raw: { id: mpId, status: 'approved' },
    });
    expect(primero.registrado).toBe(true);
    expect(primero.confirmado).toBe(true);

    // el turno quedó confirmado, con la seña marcada y el id del pago
    const { data: t1 } = await admin
      .from('alma_appointments')
      .select('estado, sena_pagada, mp_payment_id')
      .eq('id', turnoId)
      .single();
    expect(t1?.estado).toBe('confirmado');
    expect(t1?.sena_pagada).toBe(true);
    expect(t1?.mp_payment_id).toBe(mpId);

    // la seña acreditada entró sola a la caja
    const { data: caja1 } = await admin
      .from('alma_cash_entries')
      .select('id, tipo, categoria, monto')
      .eq('tenant_id', tenantId)
      .eq('appointment_id', turnoId);
    expect(caja1).toHaveLength(1);
    expect(caja1![0].tipo).toBe('ingreso');
    expect(caja1![0].categoria).toBe('Seña');
    expect(Number(caja1![0].monto)).toBe(5000);

    // segunda notificación con el mismo pago: no registra ni re-confirma
    const segundo = await registrarPagoSena(admin, {
      mpId,
      status: 'approved',
      monto: 5000,
      appointmentId: turnoId,
      tenantId,
      raw: { id: mpId, status: 'approved' },
    });
    expect(segundo.registrado).toBe(false);
    expect(segundo.confirmado).toBe(false);

    // una sola fila de pago para ese mp_id
    const { count } = await admin
      .from('alma_payments')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('mp_id', mpId);
    expect(count).toBe(1);

    // y una sola entrada de caja (la transición no se repite)
    const { count: cajaCount } = await admin
      .from('alma_cash_entries')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('appointment_id', turnoId);
    expect(cajaCount).toBe(1);
  });

  it('un pago de una cuenta MP ajena al turno se ignora', async () => {
    const turnoId = await nuevoTurno('10:00');
    const mpId = `mp-${Date.now()}-x`;

    // El collector del pago pertenece a OTRO tenant: no registra ni confirma.
    const res = await registrarPagoSena(admin, {
      mpId,
      status: 'approved',
      monto: 5000,
      appointmentId: turnoId,
      tenantId: crypto.randomUUID(),
      raw: { id: mpId, status: 'approved' },
    });
    expect(res.registrado).toBe(false);
    expect(res.confirmado).toBe(false);

    const { data: t } = await admin
      .from('alma_appointments')
      .select('estado, sena_pagada')
      .eq('id', turnoId)
      .single();
    expect(t?.estado).toBe('pendiente_sena');
    expect(t?.sena_pagada).toBe(false);

    const { count } = await admin
      .from('alma_payments')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('mp_id', mpId);
    expect(count).toBe(0);
  });

  it('un pago no aprobado no confirma el turno', async () => {
    const turnoId = await nuevoTurno('11:00');
    const mpId = `mp-${Date.now()}-2`;

    const res = await registrarPagoSena(admin, {
      mpId,
      status: 'pending',
      monto: 5000,
      appointmentId: turnoId,
      tenantId,
      raw: { id: mpId, status: 'pending' },
    });
    expect(res.registrado).toBe(true);
    expect(res.confirmado).toBe(false);

    const { data: t } = await admin
      .from('alma_appointments')
      .select('estado, sena_pagada')
      .eq('id', turnoId)
      .single();
    expect(t?.estado).toBe('pendiente_sena');
    expect(t?.sena_pagada).toBe(false);
  });
});
