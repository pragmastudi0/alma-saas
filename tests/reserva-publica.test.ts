/**
 * D · Reserva pública del portal (/t/[slug]).
 *
 * Corre contra el proyecto Supabase real. Verifica las invariantes del motor:
 * solo se reserva dentro de la disponibilidad, un slot tomado no se puede
 * repetir, la seña define el estado inicial, el paciente se reusa por teléfono
 * y hay un tope de turnos futuros por paciente.
 *
 * Requiere: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
 * SUPABASE_SERVICE_ROLE_KEY (solo local/CI, nunca en el cliente).
 */
import { createClient } from '@supabase/supabase-js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { addDias, diaSemanaDe, hoyISO, TZ_DEFAULT } from '../src/lib/fecha';
import { crearReservaPublica, type DatosReserva } from '../src/lib/reserva';

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

const PASSWORD = 'alma-reserva-test-8!';
let userId = '';
let tenantId = '';

// Una semana adelante (dentro de la ventana de 60 días); misma semana siguiente.
const FECHA = addDias(hoyISO(TZ_DEFAULT), 7);
const FECHA_2 = addDias(hoyISO(TZ_DEFAULT), 14);

const SETTINGS = { precio_default: 15000, sena_default: 5000, duracion_default: 60 };

function datos(extra: Partial<DatosReserva>): DatosReserva {
  return {
    tenantId,
    timezone: TZ_DEFAULT,
    settings: SETTINGS,
    fecha: FECHA,
    hora: '09:00',
    nombre: 'Paciente Portal',
    apellido: 'Del Portal',
    telefono: '11 5555 4444',
    email: 'paciente.portal@alma-test.local',
    fechaNacimiento: '1990-05-12',
    ...extra,
  };
}

beforeAll(async () => {
  const email = `reserva-${Date.now()}-${Math.floor(Math.random() * 1e6)}@alma-test.local`;
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
    p_nombre: 'Test Reserva',
  });
  if (bootErr || !tid) throw bootErr ?? new Error('bootstrap sin tenant');
  tenantId = tid;

  // Atiende 09:00–13:00 el día de semana de FECHA (y FECHA_2, que cae igual).
  const { error: dispErr } = await admin.from('alma_availability').insert({
    tenant_id: tenantId,
    dia_semana: diaSemanaDe(FECHA),
    hora_desde: '09:00',
    hora_hasta: '13:00',
  });
  if (dispErr) throw dispErr;
});

afterAll(async () => {
  await admin.from('alma_tenants').delete().eq('id', tenantId);
  await admin.auth.admin.deleteUser(userId);
});

describe('reserva pública', () => {
  it('slot válido con seña: crea el turno pendiente_sena (bloquea el horario)', async () => {
    const r = await crearReservaPublica(admin, datos({}));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.estado).toBe('pendiente_sena');
    expect(r.senaMonto).toBe(5000);

    const { data: t } = await admin
      .from('alma_appointments')
      .select('estado, sena_monto, duracion_min, precio')
      .eq('id', r.turnoId)
      .single();
    expect(t?.estado).toBe('pendiente_sena');
    expect(Number(t?.sena_monto)).toBe(5000);
    expect(t?.duracion_min).toBe(60);
    expect(Number(t?.precio)).toBe(15000);
  });

  it('arma el perfil del paciente con todos los datos del turnero', async () => {
    const { data: p } = await admin
      .from('alma_patients')
      .select('nombre, apellido, email, fecha_nacimiento')
      .eq('tenant_id', tenantId)
      .eq('telefono', '5491155554444')
      .single();
    expect(p?.nombre).toBe('Paciente Portal');
    expect(p?.apellido).toBe('Del Portal');
    expect(p?.email).toBe('paciente.portal@alma-test.local');
    expect(p?.fecha_nacimiento).toBe('1990-05-12');
  });

  it('el mismo slot ya no se puede reservar', async () => {
    const r = await crearReservaPublica(
      admin,
      datos({ telefono: '11 4444 3333', nombre: 'Otra Persona' }),
    );
    expect(r.ok).toBe(false);
    if (r.ok) return;
    // El pre-chequeo lo ve ocupado; en carrera el trigger devuelve 'ocupado'.
    expect(['sin_disponibilidad', 'ocupado']).toContain(r.motivo);
  });

  it('fuera de la disponibilidad se rechaza', async () => {
    const r = await crearReservaPublica(admin, datos({ hora: '15:00', telefono: '11 4444 3333' }));
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.motivo).toBe('sin_disponibilidad');
  });

  it('fuera de la ventana de 60 días se rechaza', async () => {
    const lejos = addDias(hoyISO(TZ_DEFAULT), 90);
    const r = await crearReservaPublica(admin, datos({ fecha: lejos, telefono: '11 4444 3333' }));
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.motivo).toBe('sin_disponibilidad');
  });

  it('mismo teléfono en otro formato: reusa el paciente, no lo duplica', async () => {
    const r = await crearReservaPublica(
      admin,
      datos({ hora: '10:00', telefono: '+54 9 11 5555-4444', nombre: 'Paciente Portal' }),
    );
    expect(r.ok).toBe(true);

    const { count } = await admin
      .from('alma_patients')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('telefono', '5491155554444');
    expect(count).toBe(1);
  });

  it('sin seña configurada el turno nace confirmado', async () => {
    const r = await crearReservaPublica(
      admin,
      datos({
        hora: '11:00',
        telefono: '11 2222 1111',
        nombre: 'Sin Sena',
        settings: { ...SETTINGS, sena_default: 0 },
      }),
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.estado).toBe('confirmado');
    expect(r.senaMonto).toBe(0);
  });

  it('tope de turnos futuros por paciente', async () => {
    // El paciente de las reservas 1 y 5 ya tiene 2 turnos futuros; el 3ro entra.
    const tercero = await crearReservaPublica(admin, datos({ hora: '12:00' }));
    expect(tercero.ok).toBe(true);

    // El 4to (otra fecha, mismo teléfono) se corta por el tope.
    const cuarto = await crearReservaPublica(admin, datos({ fecha: FECHA_2 }));
    expect(cuarto.ok).toBe(false);
    if (cuarto.ok) return;
    expect(cuarto.motivo).toBe('limite');
  });
});
