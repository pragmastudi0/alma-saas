import { createServerSupabase } from '@/lib/supabase/server';
import { TurnoForm } from '@/components/turno-form';
import { BackLink } from '@/components/back-link';
import { crearTurno, horariosDelDia } from '../actions';
import { hoyISO } from '@/lib/fecha';
import { nombrePaciente } from '@/lib/caja';
import { montoSenaEfectivo, senaModoDe } from '@/lib/sena';

const FECHA = /^\d{4}-\d{2}-\d{2}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Settings = {
  precio_default?: number;
  sena_default?: number;
  duracion_default?: number;
};

/** Número no negativo desde un query param, o undefined si no sirve. */
function montoParam(v?: string): number | undefined {
  if (v === undefined) return undefined;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

export default async function NuevoTurnoPage({
  searchParams,
}: {
  searchParams: Promise<{
    d?: string;
    p?: string;
    svc?: string;
    emp?: string;
    precio?: string;
    sena?: string;
    origen?: string;
  }>;
}) {
  const { d, p, svc, emp, precio, sena, origen } = await searchParams;
  const dia = d && FECHA.test(d) ? d : hoyISO();

  // Paciente prellenado (al reprogramar). Validamos el uuid antes de meterlo en
  // un filtro de PostgREST.
  const pacienteIdPrefill = p && UUID.test(p) ? p : undefined;

  const supabase = await createServerSupabase();

  // Los archivados no se ofrecen — salvo el prellenado, para que reprogramar un
  // turno viejo siga funcionando.
  const pacientesQuery = supabase
    .from('alma_patients')
    .select('id, nombre, apellido')
    .order('nombre')
    .order('apellido');

  const [{ data: pacientes }, { data: tenant }, { data: servicios }, { data: empleados }, { data: svcEmps }] =
    await Promise.all([
      pacienteIdPrefill
        ? pacientesQuery.or(`archivado.eq.false,id.eq.${pacienteIdPrefill}`)
        : pacientesQuery.eq('archivado', false),
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

  // En el selector va nombre y apellido: con solo el nombre, dos pacientes que
  // se llaman igual son indistinguibles.
  const opcionesPacientes = (pacientes ?? []).map((pa) => ({
    id: pa.id,
    nombre: nombrePaciente(pa) || 'Paciente',
  }));

  // Armar mapa service_id → employee_ids
  const empPorServicio: Record<string, string[]> = {};
  for (const r of svcEmps ?? []) {
    if (!empPorServicio[r.service_id]) empPorServicio[r.service_id] = [];
    empPorServicio[r.service_id].push(r.employee_id);
  }

  const s = (tenant?.settings ?? {}) as Settings;
  const senaModo = senaModoDe(s);
  const duracion = s.duracion_default ?? 45;
  const horariosIniciales = await horariosDelDia(dia, duracion);

  // Prellenado al reprogramar: paciente/servicio/empleado/precio/seña del original.
  const serviceId = svc && UUID.test(svc) ? svc : undefined;
  const employeeId = emp && UUID.test(emp) ? emp : undefined;
  const origenId = origen && UUID.test(origen) ? origen : undefined;
  const precioPrefill = montoParam(precio) ?? s.precio_default ?? 0;
  const senaPrefill = montoSenaEfectivo(montoParam(sena) ?? s.sena_default ?? 0, senaModo);

  return (
    <main className="pb-10">
      <header className="mb-5 flex items-center gap-2">
        <BackLink href={`/agenda?d=${dia}`} />
        <h1 className="text-[22px] font-semibold">Nuevo turno</h1>
      </header>

      <TurnoForm
        action={crearTurno}
        submitLabel="Guardar turno"
        origen={origenId}
        pacientes={opcionesPacientes}
        servicios={servicios ?? []}
        empleados={empleados ?? []}
        empleadosPorServicio={empPorServicio}
        horariosIniciales={horariosIniciales}
        senaModo={senaModo}
        defaults={{
          fecha: dia,
          hora: '09:00',
          duracion_min: duracion,
          precio: precioPrefill,
          sena_monto: senaPrefill,
          patient_id: pacienteIdPrefill,
          service_id: serviceId,
          employee_id: employeeId,
        }}
      />
    </main>
  );
}
