/**
 * Seed de desarrollo — universo alma: Valentina Ríos, jueves, $15.000.
 *
 * Crea (o reutiliza) una cuenta demo con su tenant y carga pacientes,
 * turnos y movimientos de caja. Solo para desarrollo: requiere
 * SUPABASE_SERVICE_ROLE_KEY y nunca debe correr contra datos reales.
 *
 * Uso: npm run seed
 */
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: '.env.local' });
config({ path: '.env' });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error('Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY (ver .env.example).');
  process.exit(1);
}

const DEMO_EMAIL = 'demo@alma-dev.local';
const DEMO_PASSWORD = 'alma-demo-2026!';

const admin = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const iso = (d: Date) => d.toISOString().slice(0, 10);

/** Próximo jueves (o hoy si es jueves). */
function proximoJueves(): Date {
  const d = new Date();
  d.setDate(d.getDate() + ((4 - d.getDay() + 7) % 7));
  return d;
}

async function main() {
  // 1. cuenta demo
  let userId: string;
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email: DEMO_EMAIL,
    password: DEMO_PASSWORD,
    email_confirm: true,
    user_metadata: { nombre: 'Sofi' },
  });
  if (created?.user) {
    userId = created.user.id;
  } else if (createErr?.code === 'email_exists') {
    const { data: list } = await admin.auth.admin.listUsers();
    const existing = list.users.find((u) => u.email === DEMO_EMAIL);
    if (!existing) throw new Error('La cuenta demo existe pero no se pudo recuperar.');
    userId = existing.id;
  } else {
    throw createErr ?? new Error('No se pudo crear la cuenta demo.');
  }

  // 2. tenant (idempotente, mismo camino que la app)
  const { data: profile } = await admin
    .from('alma_profiles')
    .select('tenant_id')
    .eq('user_id', userId)
    .maybeSingle();

  let tenantId = profile?.tenant_id as string | undefined;
  if (!tenantId) {
    const { data: tenant, error } = await admin
      .from('alma_tenants')
      .insert({ nombre: 'Sofi' })
      .select('id')
      .single();
    if (error) throw error;
    tenantId = tenant.id;
    const { error: profErr } = await admin
      .from('alma_profiles')
      .insert({ user_id: userId, tenant_id: tenantId, nombre: 'Sofi' });
    if (profErr) throw profErr;
  }

  // 3. datos demo (solo si el tenant está vacío, para poder re-correr sin duplicar)
  const { count } = await admin
    .from('alma_patients')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId);
  if ((count ?? 0) > 0) {
    console.log('El tenant demo ya tiene datos; no se duplica nada.');
    console.log(`Entrá con ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
    return;
  }

  const { data: pacientes, error: patErr } = await admin
    .from('alma_patients')
    .insert([
      { tenant_id: tenantId, nombre: 'Valentina Ríos', telefono: '11 5012 3344' },
      { tenant_id: tenantId, nombre: 'Marcos Peralta', telefono: '11 6788 9900' },
      { tenant_id: tenantId, nombre: 'Lucía Fernández', telefono: '11 4455 6677' },
    ])
    .select('id, nombre');
  if (patErr) throw patErr;

  const valentina = pacientes.find((p) => p.nombre === 'Valentina Ríos')!;
  const marcos = pacientes.find((p) => p.nombre === 'Marcos Peralta')!;

  const jueves = proximoJueves();
  const { error: apptErr } = await admin.from('alma_appointments').insert([
    {
      tenant_id: tenantId,
      patient_id: valentina.id,
      fecha: iso(jueves),
      hora: '09:00',
      duracion_min: 45,
      precio: 15000,
      sena_monto: 5000,
      sena_pagada: true,
      estado: 'confirmado',
    },
    {
      tenant_id: tenantId,
      patient_id: marcos.id,
      fecha: iso(jueves),
      hora: '11:30',
      duracion_min: 45,
      precio: 15000,
      sena_monto: 5000,
      sena_pagada: false,
      estado: 'pendiente_sena',
    },
  ]);
  if (apptErr) throw apptErr;

  const { error: cashErr } = await admin.from('alma_cash_entries').insert([
    {
      tenant_id: tenantId,
      fecha: iso(new Date()),
      tipo: 'ingreso',
      categoria: 'Seña',
      descripcion: 'Seña Valentina Ríos',
      monto: 5000,
    },
    {
      tenant_id: tenantId,
      fecha: iso(new Date()),
      tipo: 'gasto',
      categoria: 'Alquiler',
      descripcion: 'Consultorio',
      monto: 80000,
    },
  ]);
  if (cashErr) throw cashErr;

  console.log('Listo. Datos demo cargados.');
  console.log(`Entrá con ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
