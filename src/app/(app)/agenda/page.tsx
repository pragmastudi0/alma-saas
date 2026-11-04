import Link from 'next/link';
import { createServerSupabase } from '@/lib/supabase/server';
import { DiaNav } from '@/components/dia-nav';
import { TurnoCard, type TurnoCardData } from '@/components/turno-card';
import { EmptyState } from '@/components/empty-state';
import { Fab, AccionNueva } from '@/components/fab';
import { MesAgenda, type MesTurno } from '@/components/mes-agenda';
import { MesCalendario } from '@/components/mes-calendario';
import { nombrePaciente } from '@/lib/caja';
import { senaModoDe } from '@/lib/sena';
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

const segBase =
  'flex-1 rounded-md px-3 py-1.5 text-center text-sm font-semibold transition-colors duration-micro ease-alma';
const segActivo = 'bg-[var(--alma-surface)] text-[var(--alma-text)] shadow-1';
const segInactivo = 'text-[var(--alma-text-muted)] hover:text-[var(--alma-text)]';
const seg = (activo: boolean) => `${segBase} ${activo ? segActivo : segInactivo}`;

/** Toggle Día | Mes, conservando el contexto actual. */
function VistaToggle({ vista, dia }: { vista: 'dia' | 'mes'; dia: string }) {
  return (
    <div className="mb-4 flex gap-1 rounded-lg bg-[var(--alma-surface-2)] p-1">
      <Link href={`/agenda?d=${dia}`} className={seg(vista === 'dia')}>
        Día
      </Link>
      <Link href={`/agenda?v=mes&m=${mesDe(dia)}`} className={seg(vista === 'mes')}>
        Mes
      </Link>
    </div>
  );
}

/** Toggle Calendario | Lista dentro de la vista mensual. */
function MesToggle({ mv, ym }: { mv: 'cal' | 'lista'; ym: string }) {
  return (
    <div className="mb-4 flex gap-1 rounded-lg bg-[var(--alma-surface-2)] p-1">
      <Link href={`/agenda?v=mes&mv=cal&m=${ym}`} className={seg(mv === 'cal')}>
        Calendario
      </Link>
      <Link href={`/agenda?v=mes&mv=lista&m=${ym}`} className={seg(mv === 'lista')}>
        Lista
      </Link>
    </div>
  );
}

export default async function AgendaPage({
  searchParams,
}: {
  searchParams: Promise<{ d?: string; v?: string; m?: string; mv?: string; emp?: string }>;
}) {
  const { d, v, m, mv: mvParam, emp } = await searchParams;
  const dia = d && FECHA.test(d) ? d : hoyISO();
  const supabase = await createServerSupabase();

  const { data: empleados } = await supabase
    .from('alma_employees')
    .select('id, nombre')
    .eq('activo', true)
    .order('nombre');

  const employeeId = emp ?? '';

  if (v === 'mes') {
    const ym = m && MES.test(m) ? m : mesActual();
    const { desde, hasta } = rangoMes(ym);
    const { data } = await supabase
      .from('alma_appointments')
      .select('id, fecha, hora, estado, alma_patients(nombre, apellido), alma_employees(nombre)')
      .gte('fecha', desde)
      .lt('fecha', hasta)
      .neq('estado', 'cancelado')
      .order('fecha', { ascending: true })
      .order('hora', { ascending: true });

    const turnosMes: MesTurno[] = (data ?? []).map((r) => ({
      id: r.id,
      fecha: r.fecha,
      hora: String(r.hora),
      estado: r.estado,
      paciente: nombrePaciente(r.alma_patients) || 'Paciente',
      empleado: (r.alma_employees as { nombre?: string } | null)?.nombre ?? undefined,
    }));

    // Calendario (default, estilo Apple) o lista. Ambas comparten los datos.
    const mv = mvParam === 'lista' ? 'lista' : 'cal';
    // Día elegido en el calendario (dentro del mes): del ?d=, si no hoy / día 1.
    const seleccionado =
      d && FECHA.test(d) && d.startsWith(ym) ? d : ym === mesActual() ? hoyISO() : `${ym}-01`;
    const diasConTurno = new Set(turnosMes.map((t) => t.fecha));
    const turnosDelDia = turnosMes.filter((t) => t.fecha === seleccionado);

    // Al volver a "Día" desde el mes: hoy si es el mes actual, si no el día 1.
    const diaDestino = ym === mesActual() ? hoyISO() : `${ym}-01`;

    return (
      <main className="pb-24 md:pb-8">
        <div className="mb-4 hidden justify-end md:flex">
          <AccionNueva href={`/agenda/nuevo?d=${hoyISO()}`} label="Nuevo turno" />
        </div>
        <VistaToggle vista="mes" dia={diaDestino} />
        <DiaNav
          prevHref={`/agenda?v=mes&mv=${mv}&m=${addMeses(ym, -1)}`}
          nextHref={`/agenda?v=mes&mv=${mv}&m=${addMeses(ym, 1)}`}
          titulo={etiquetaMes(ym)}
          prevLabel="Mes anterior"
          nextLabel="Mes siguiente"
        />
        <MesToggle mv={mv} ym={ym} />
        {mv === 'cal' ? (
          <MesCalendario
            ym={ym}
            hoy={hoyISO()}
            seleccionado={seleccionado}
            diasConTurno={diasConTurno}
            turnosDelDia={turnosDelDia}
          />
        ) : (
          <MesAgenda turnos={turnosMes} hoy={hoyISO()} />
        )}
        <Fab href={`/agenda/nuevo?d=${hoyISO()}`} label="Nuevo turno" />
      </main>
    );
  }

  let query = supabase
    .from('alma_appointments')
    .select('id, hora, duracion_min, precio, estado, alma_patients(nombre, apellido), alma_employees(nombre)')
    .eq('fecha', dia)
    .order('hora', { ascending: true });
  if (employeeId) {
    query = query.eq('employee_id', employeeId);
  }
  const [{ data }, { data: tenant }] = await Promise.all([
    query,
    supabase.from('alma_tenants').select('settings').maybeSingle(),
  ]);
  const senaModo = senaModoDe(tenant?.settings);

  const turnos: TurnoCardData[] = (data ?? []).map((r) => ({
    id: r.id,
    hora: r.hora,
    duracion_min: r.duracion_min,
    precio: Number(r.precio),
    estado: r.estado,
    paciente: nombrePaciente(r.alma_patients) || 'Paciente',
    empleado: (r.alma_employees as { nombre?: string } | null)?.nombre ?? undefined,
  }));

  return (
    <main className="pb-24 md:pb-8">
      <div className="mb-4 hidden justify-end md:flex">
        <AccionNueva href={`/agenda/nuevo?d=${dia}${employeeId ? `&emp=${employeeId}` : ''}`} label="Nuevo turno" />
      </div>
      <VistaToggle vista="dia" dia={dia} />
      <DiaNav
        prevHref={`/agenda?d=${addDias(dia, -1)}${employeeId ? `&emp=${employeeId}` : ''}`}
        nextHref={`/agenda?d=${addDias(dia, 1)}${employeeId ? `&emp=${employeeId}` : ''}`}
        titulo={etiquetaDia(dia)}
        subtitulo={etiquetaRelativa(dia)}
      />

      {/* Filtro por empleado */}
      {empleados && empleados.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          <Link
            href={`/agenda?d=${dia}`}
            className={`whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-semibold transition-colors duration-micro ease-alma ${
              !employeeId
                ? 'bg-[var(--alma-action)] text-[var(--alma-on-action)]'
                : 'bg-[var(--alma-surface-2)] text-[var(--alma-text-muted)] hover:text-[var(--alma-text)]'
            }`}
          >
            Todos
          </Link>
          {empleados.map((e) => (
            <Link
              key={e.id}
              href={`/agenda?d=${dia}&emp=${e.id}`}
              className={`whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-semibold transition-colors duration-micro ease-alma ${
                employeeId === e.id
                  ? 'bg-[var(--alma-action)] text-[var(--alma-on-action)]'
                  : 'bg-[var(--alma-surface-2)] text-[var(--alma-text-muted)] hover:text-[var(--alma-text)]'
              }`}
            >
              {e.nombre}
            </Link>
          ))}
        </div>
      )}

      {turnos.length === 0 ? (
        <EmptyState
          mensaje="Este día está libre."
          ctaHref={`/agenda/nuevo?d=${dia}${employeeId ? `&emp=${employeeId}` : ''}`}
          ctaLabel="Agendar un turno"
        />
      ) : (
        <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {turnos.map((t) => (
            <li key={t.id}>
              <TurnoCard t={t} senaModo={senaModo} />
            </li>
          ))}
        </ul>
      )}

      <Fab href={`/agenda/nuevo?d=${dia}${employeeId ? `&emp=${employeeId}` : ''}`} label="Nuevo turno" />
    </main>
  );
}
