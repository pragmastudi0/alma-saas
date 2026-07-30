import { notFound } from 'next/navigation';
import { createServerSupabase } from '@/lib/supabase/server';
import { TurnoForm } from '@/components/turno-form';
import { BackLink } from '@/components/back-link';
import { editarTurno } from '../../actions';
import { horaCorta } from '@/lib/format';
import { senaModoDe } from '@/lib/sena';

export default async function EditarTurnoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = await createServerSupabase();
  const [{ data }, { data: servicios }, { data: empleados }, { data: svcEmps }, { data: tenant }] = await Promise.all([
    supabase
      .from('alma_appointments')
      .select('id, fecha, hora, duracion_min, precio, sena_monto, service_id, employee_id')
      .eq('id', id)
      .maybeSingle(),
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
    supabase.from('alma_tenants').select('settings').maybeSingle(),
  ]);

  if (!data) notFound();

  const empPorServicio: Record<string, string[]> = {};
  for (const r of svcEmps ?? []) {
    if (!empPorServicio[r.service_id]) empPorServicio[r.service_id] = [];
    empPorServicio[r.service_id].push(r.employee_id);
  }

  return (
    <main className="pb-10">
      <header className="mb-5 flex items-center gap-2">
        <BackLink href={`/agenda/${data.id}`} />
        <h1 className="text-[22px] font-semibold">Editar turno</h1>
      </header>

      <TurnoForm
        action={editarTurno}
        submitLabel="Guardar cambios"
        turnoId={data.id}
        servicios={servicios ?? []}
        empleados={empleados ?? []}
        empleadosPorServicio={empPorServicio}
        senaModo={senaModoDe(tenant?.settings)}
        defaults={{
          fecha: data.fecha,
          hora: horaCorta(data.hora),
          duracion_min: data.duracion_min,
          precio: Number(data.precio),
          sena_monto: Number(data.sena_monto),
          service_id: data.service_id ?? undefined,
          employee_id: data.employee_id ?? undefined,
        }}
      />
    </main>
  );
}
