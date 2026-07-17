import Link from 'next/link';
import { createServerSupabase } from '@/lib/supabase/server';
import { DiaNav } from '@/components/dia-nav';
import { TurnoCard, type TurnoCardData } from '@/components/turno-card';
import { EmptyState } from '@/components/empty-state';
import { Fab, AccionNueva } from '@/components/fab';
import { MesGrid } from '@/components/mes-grid';
import { nombrePaciente } from '@/lib/caja';
import {
  addDias,
  addMeses,
  etiquetaDia,
  etiquetaMes,
  etiquetaRelativa,
  hoyISO,
  mesActual,
  mesDe,
  rangoMes,
} from '@/lib/fecha';

const FECHA = /^\d{4}-\d{2}-\d{2}$/;
const MES = /^\d{4}-\d{2}$/;

/** Toggle Día | Mes, conservando el contexto actual. */
function VistaToggle({ vista, dia }: { vista: 'dia' | 'mes'; dia: string }) {
  const base =
    'flex-1 rounded-md px-3 py-1.5 text-center text-sm font-semibold transition-colors duration-micro ease-alma';
  const activo = 'bg-[var(--alma-surface)] text-[var(--alma-text)] shadow-1';
  const inactivo = 'text-[var(--alma-text-muted)] hover:text-[var(--alma-text)]';

  return (
    <div className="mb-4 flex gap-1 rounded-lg bg-[var(--alma-surface-2)] p-1">
      <Link href={`/agenda?d=${dia}`} className={`${base} ${vista === 'dia' ? activo : inactivo}`}>
        Día
      </Link>
      <Link
        href={`/agenda?v=mes&m=${mesDe(dia)}`}
        className={`${base} ${vista === 'mes' ? activo : inactivo}`}
      >
        Mes
      </Link>
    </div>
  );
}

export default async function AgendaPage({
  searchParams,
}: {
  searchParams: Promise<{ d?: string; v?: string; m?: string }>;
}) {
  const { d, v, m } = await searchParams;
  const dia = d && FECHA.test(d) ? d : hoyISO();
  const supabase = await createServerSupabase();

  if (v === 'mes') {
    const ym = m && MES.test(m) ? m : mesActual();
    const { desde, hasta } = rangoMes(ym);
    const { data } = await supabase
      .from('alma_appointments')
      .select('fecha, estado')
      .gte('fecha', desde)
      .lt('fecha', hasta);

    const conteos: Record<string, number> = {};
    for (const r of data ?? []) {
      if (r.estado === 'cancelado' || r.estado === 'ausente') continue;
      conteos[r.fecha] = (conteos[r.fecha] ?? 0) + 1;
    }

    // Al volver a "Día" desde el mes: hoy si es el mes actual, si no el día 1.
    const diaDestino = ym === mesActual() ? hoyISO() : `${ym}-01`;

    return (
      <main className="pb-24 md:pb-8">
        <div className="mb-4 hidden justify-end md:flex">
          <AccionNueva href={`/agenda/nuevo?d=${hoyISO()}`} label="Nuevo turno" />
        </div>
        <VistaToggle vista="mes" dia={diaDestino} />
        <DiaNav
          prevHref={`/agenda?v=mes&m=${addMeses(ym, -1)}`}
          nextHref={`/agenda?v=mes&m=${addMeses(ym, 1)}`}
          titulo={etiquetaMes(ym)}
          prevLabel="Mes anterior"
          nextLabel="Mes siguiente"
        />
        <MesGrid ym={ym} conteos={conteos} hoy={hoyISO()} />
        <Fab href={`/agenda/nuevo?d=${hoyISO()}`} label="Nuevo turno" />
      </main>
    );
  }

  const { data } = await supabase
    .from('alma_appointments')
    .select('id, hora, duracion_min, precio, estado, alma_patients(nombre, apellido)')
    .eq('fecha', dia)
    .order('hora', { ascending: true });

  const turnos: TurnoCardData[] = (data ?? []).map((r) => ({
    id: r.id,
    hora: r.hora,
    duracion_min: r.duracion_min,
    precio: Number(r.precio),
    estado: r.estado,
    paciente: nombrePaciente(r.alma_patients) || 'Paciente',
  }));

  return (
    <main className="pb-24 md:pb-8">
      <div className="mb-4 hidden justify-end md:flex">
        <AccionNueva href={`/agenda/nuevo?d=${dia}`} label="Nuevo turno" />
      </div>
      <VistaToggle vista="dia" dia={dia} />
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
        <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
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
