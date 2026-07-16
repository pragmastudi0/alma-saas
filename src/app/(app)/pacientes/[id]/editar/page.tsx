import { notFound } from 'next/navigation';
import { createServerSupabase } from '@/lib/supabase/server';
import { PacienteForm } from '@/components/paciente-form';
import { BackLink } from '@/components/back-link';
import { editarPaciente } from '../../actions';

export default async function EditarPacientePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createServerSupabase();
  const { data: p } = await supabase
    .from('alma_patients')
    .select('id, nombre, telefono, email, notas')
    .eq('id', id)
    .maybeSingle();

  if (!p) notFound();

  return (
    <main className="pb-10">
      <header className="mb-5 flex items-center gap-2">
        <BackLink href={`/pacientes/${p.id}`} />
        <h1 className="text-[22px] font-semibold">Editar paciente</h1>
      </header>

      <PacienteForm
        action={editarPaciente}
        submitLabel="Guardar cambios"
        pacienteId={p.id}
        defaults={{
          nombre: p.nombre,
          telefono: p.telefono ?? '',
          email: p.email ?? '',
          notas: p.notas ?? '',
        }}
      />
    </main>
  );
}
