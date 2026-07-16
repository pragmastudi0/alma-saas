import { notFound } from 'next/navigation';
import { createServerSupabase } from '@/lib/supabase/server';
import { TurnoForm } from '@/components/turno-form';
import { BackLink } from '@/components/back-link';
import { editarTurno } from '../../actions';
import { horaCorta } from '@/lib/format';

export default async function EditarTurnoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = await createServerSupabase();
  const { data } = await supabase
    .from('alma_appointments')
    .select('id, fecha, hora, duracion_min, precio, sena_monto')
    .eq('id', id)
    .maybeSingle();

  if (!data) notFound();

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
        defaults={{
          fecha: data.fecha,
          hora: horaCorta(data.hora),
          duracion_min: data.duracion_min,
          precio: Number(data.precio),
          sena_monto: Number(data.sena_monto),
        }}
      />
    </main>
  );
}
