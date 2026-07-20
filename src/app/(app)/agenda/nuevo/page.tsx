import { createServerSupabase } from '@/lib/supabase/server';
import { TurnoForm } from '@/components/turno-form';
import { BackLink } from '@/components/back-link';
import { crearTurno, horariosDelDia } from '../actions';
import { hoyISO } from '@/lib/fecha';

const FECHA = /^\d{4}-\d{2}-\d{2}$/;

type Settings = {
  precio_default?: number;
  sena_default?: number;
  duracion_default?: number;
};

export default async function NuevoTurnoPage({
  searchParams,
}: {
  searchParams: Promise<{ d?: string; p?: string }>;
}) {
  const { d, p } = await searchParams;
  const dia = d && FECHA.test(d) ? d : hoyISO();

  const supabase = await createServerSupabase();
  const [{ data: pacientes }, { data: tenant }, { data: servicios }, { data: empleados }, { data: svcEmps }] =
    await Promise.all([
      supabase.from('alma_patients').select('id, nombre').order('nombre'),
      supabase.from('alma_tenants').select('settings').maybeSingle(),
      supabase
        .from('alma_services')
        .select('id, nombre, precio, duracion_min, sena_monto')
        .eq('activo', true)
        .order('nombre'),
      supabase
        .from('alma_employees')
        .select('id, nombre')
        .eq('activo', true)
        .order('nombre'),
      supabase
        .from('alma_service_employees')
        .select('service_id, employee_id'),
    ]);

  // Armar mapa service_id → employee_ids
  const empPorServicio: Record<string, string[]> = {};
  for (const r of svcEmps ?? []) {
    if (!empPorServicio[r.service_id]) empPorServicio[r.service_id] = [];
    empPorServicio[r.service_id].push(r.employee_id);
  }

  const s = (tenant?.settings ?? {}) as Settings;
  const duracion = s.duracion_default ?? 45;
  const horariosIniciales = await horariosDelDia(dia, duracion);

  return (
    <main className="pb-10">
      <header className="mb-5 flex items-center gap-2">
        <BackLink href={`/agenda?d=${dia}`} />
        <h1 className="text-[22px] font-semibold">Nuevo turno</h1>
      </header>

      <TurnoForm
        action={crearTurno}
        submitLabel="Guardar turno"
        pacientes={pacientes ?? []}
        servicios={servicios ?? []}
        empleados={empleados ?? []}
        empleadosPorServicio={empPorServicio}
        horariosIniciales={horariosIniciales}
        defaults={{
          fecha: dia,
          hora: '09:00',
          duracion_min: duracion,
          precio: s.precio_default ?? 0,
          sena_monto: s.sena_default ?? 0,
          patient_id: p,
        }}
      />
    </main>
  );
}
