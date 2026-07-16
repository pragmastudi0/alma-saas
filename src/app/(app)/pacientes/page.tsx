import { createServerSupabase } from '@/lib/supabase/server';
import { PacienteCard, type PacienteCardData } from '@/components/paciente-card';
import { Fab } from '@/components/fab';
import { inputCls } from '@/components/ui/field';

export default async function PacientesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const term = (q ?? '').trim();

  const supabase = await createServerSupabase();
  let query = supabase.from('alma_patients').select('id, nombre, telefono').order('nombre');
  if (term) {
    // Sacamos caracteres reservados de PostgREST/ilike antes de armar el patrón.
    const safe = term.replace(/[%,()]/g, ' ');
    query = query.ilike('nombre', `%${safe}%`);
  }
  const { data } = await query;

  const pacientes: PacienteCardData[] = (data ?? []).map((p) => ({
    id: p.id,
    nombre: p.nombre,
    telefono: p.telefono ?? '',
  }));

  return (
    <main className="pb-24">
      <header className="mb-4">
        <h1 className="text-[22px] font-semibold">Pacientes</h1>
      </header>

      <form className="mb-4">
        <input
          name="q"
          defaultValue={term}
          placeholder="Buscar por nombre"
          aria-label="Buscar por nombre"
          className={inputCls}
        />
      </form>

      {pacientes.length === 0 ? (
        <p className="rounded-lg border border-dashed border-[var(--alma-border)] p-8 text-center text-sm text-[var(--alma-text-muted)]">
          {term ? 'No encontramos a nadie con ese nombre.' : 'Todavía no cargaste pacientes.'}
        </p>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {pacientes.map((p) => (
            <li key={p.id}>
              <PacienteCard p={p} />
            </li>
          ))}
        </ul>
      )}

      <Fab href="/pacientes/nuevo" label="Nuevo paciente" />
    </main>
  );
}
