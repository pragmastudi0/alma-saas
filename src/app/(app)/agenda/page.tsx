import { createServerSupabase } from '@/lib/supabase/server';
import { DiaNav } from '@/components/dia-nav';
import { TurnoCard, type TurnoCardData } from '@/components/turno-card';
import { EmptyState } from '@/components/empty-state';
import { Fab } from '@/components/fab';
import { addDias, etiquetaDia, etiquetaRelativa, hoyISO } from '@/lib/fecha';

const FECHA = /^\d{4}-\d{2}-\d{2}$/;

function nombrePaciente(rel: unknown): string {
  const p = Array.isArray(rel) ? rel[0] : rel;
  return (p as { nombre?: string } | null)?.nombre ?? 'Paciente';
}

export default async function AgendaPage({
  searchParams,
}: {
  searchParams: Promise<{ d?: string }>;
}) {
  const { d } = await searchParams;
  const dia = d && FECHA.test(d) ? d : hoyISO();

  const supabase = await createServerSupabase();
  const { data } = await supabase
    .from('alma_appointments')
    .select('id, hora, duracion_min, precio, estado, alma_patients(nombre)')
    .eq('fecha', dia)
    .order('hora', { ascending: true });

  const turnos: TurnoCardData[] = (data ?? []).map((r) => ({
    id: r.id,
    hora: r.hora,
    duracion_min: r.duracion_min,
    precio: Number(r.precio),
    estado: r.estado,
    paciente: nombrePaciente(r.alma_patients),
  }));

  return (
    <main className="pb-24">
      <DiaNav
        prevHref={`/agenda?d=${addDias(dia, -1)}`}
        nextHref={`/agenda?d=${addDias(dia, 1)}`}
        titulo={etiquetaDia(dia)}
        subtitulo={etiquetaRelativa(dia)}
      />

      {turnos.length === 0 ? (
        <EmptyState
          mensaje="Este día está libre."
          ctaHref={`/agenda/nuevo?d=${dia}`}
          ctaLabel="Agendar un turno"
        />
      ) : (
        <ul className="flex flex-col gap-2.5">
          {turnos.map((t) => (
            <li key={t.id}>
              <TurnoCard t={t} />
            </li>
          ))}
        </ul>
      )}

      <Fab href={`/agenda/nuevo?d=${dia}`} label="Nuevo turno" />
    </main>
  );
}
