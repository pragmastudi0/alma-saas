import { createServerSupabase } from '@/lib/supabase/server';
import { TurnoForm } from '@/components/turno-form';
import { BackLink } from '@/components/back-link';
import { crearTurno } from '../actions';
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
  searchParams: Promise<{ d?: string }>;
}) {
  const { d } = await searchParams;
  const dia = d && FECHA.test(d) ? d : hoyISO();

  const supabase = await createServerSupabase();
  const [{ data: pacientes }, { data: tenant }] = await Promise.all([
    supabase.from('alma_patients').select('id, nombre').order('nombre'),
    supabase.from('alma_tenants').select('settings').maybeSingle(),
  ]);

  const s = (tenant?.settings ?? {}) as Settings;

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
        defaults={{
          fecha: dia,
          hora: '09:00',
          duracion_min: s.duracion_default ?? 45,
          precio: s.precio_default ?? 0,
          sena_monto: s.sena_default ?? 0,
        }}
      />
    </main>
  );
}
