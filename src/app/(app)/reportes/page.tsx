import Link from 'next/link';
import { createServerSupabase } from '@/lib/supabase/server';
import { DiaNav } from '@/components/dia-nav';
import { EmptyState } from '@/components/empty-state';
import { InactivoCard } from '@/components/inactivo-card';
import { addMeses, etiquetaMes, hoyISO, mesActual, rangoMes } from '@/lib/fecha';
import { pesos } from '@/lib/format';
import { nombrePaciente } from '@/lib/caja';
import {
  conteoEstados,
  resumenPorClave,
  senasCobradas,
  tasaAusentismo,
  topPacientes,
  variacionPct,
  type EstadoTurno,
  type FilaResumen,
  type TurnoReporte,
} from '@/lib/reportes';
import {
  INACTIVIDAD_DIAS_DEFAULT,
  pacientesInactivos,
  type PacienteUltimoTurno,
} from '@/lib/inactivos';

const MES = /^\d{4}-\d{2}$/;

export default async function ReportesPage({
  searchParams,
}: {
  searchParams: Promise<{ m?: string }>;
}) {
  const { m } = await searchParams;
  const ym = m && MES.test(m) ? m : mesActual();
  const { desde, hasta } = rangoMes(ym);
  const ymPrev = addMeses(ym, -1);
  const { desde: desdePrev, hasta: hastaPrev } = rangoMes(ymPrev);
  const hoy = hoyISO();

  const supabase = await createServerSupabase();
  const [
    { data: turnosMes },
    { data: mov },
    { data: movPrev },
    { data: servicios },
    { data: empleados },
    { count: nuevos },
    { data: tenant },
    { data: pacientes },
  ] = await Promise.all([
    supabase
      .from('alma_appointments')
      .select(
        'estado, precio, sena_monto, sena_pagada, service_id, employee_id, patient_id, alma_patients(nombre, apellido)',
      )
      .gte('fecha', desde)
      .lt('fecha', hasta),
    supabase.from('alma_cash_entries').select('tipo, monto').gte('fecha', desde).lt('fecha', hasta),
    supabase
      .from('alma_cash_entries')
      .select('tipo, monto')
      .gte('fecha', desdePrev)
      .lt('fecha', hastaPrev),
    supabase.from('alma_services').select('id, nombre'),
    supabase.from('alma_employees').select('id, nombre'),
    supabase
      .from('alma_patients')
      .select('id', { count: 'exact', head: true })
      .eq('archivado', false)
      .gte('created_at', desde)
      .lt('created_at', hasta),
    supabase.from('alma_tenants').select('settings').maybeSingle(),
    // Último turno con intención de venir (ni cancelado ni ausente) por paciente.
    supabase
      .from('alma_patients')
      .select('id, nombre, apellido, telefono, created_at, alma_appointments(fecha)')
      .eq('archivado', false)
      .not('alma_appointments.estado', 'in', '("cancelado","ausente")')
      .order('fecha', { referencedTable: 'alma_appointments', ascending: false })
      .limit(1, { referencedTable: 'alma_appointments' }),
  ]);

  const turnos: TurnoReporte[] = (turnosMes ?? []).map((t) => ({
    estado: t.estado as EstadoTurno,
    precio: Number(t.precio),
    sena_monto: Number(t.sena_monto),
    sena_pagada: Boolean(t.sena_pagada),
    service_id: t.service_id,
    employee_id: t.employee_id,
    patient_id: t.patient_id,
  }));

  const conteo = conteoEstados(turnos);
  const ausentismo = tasaAusentismo(conteo);
  const senas = senasCobradas(turnos);

  const sumar = (xs: { tipo: string; monto: unknown }[] | null, tipo: string) =>
    (xs ?? []).filter((x) => x.tipo === tipo).reduce((s, x) => s + Number(x.monto), 0);
  const ingresos = sumar(mov, 'ingreso');
  const gastos = sumar(mov, 'gasto');
  const variacion = variacionPct(ingresos, sumar(movPrev, 'ingreso'));

  const porServicio = resumenPorClave(
    turnos,
    'service_id',
    new Map((servicios ?? []).map((s) => [s.id, s.nombre])),
  );
  const porEmpleado = resumenPorClave(
    turnos,
    'employee_id',
    new Map((empleados ?? []).map((e) => [e.id, e.nombre])),
  );

  const nombres = new Map<string, string>();
  for (const t of turnosMes ?? []) {
    nombres.set(t.patient_id, nombrePaciente(t.alma_patients));
  }
  const top = topPacientes(turnos, nombres);
  const atendidos = new Set(
    turnos.filter((t) => t.estado === 'completado').map((t) => t.patient_id),
  ).size;

  const s = (tenant?.settings ?? {}) as { inactividad_dias?: number };
  const umbral = s.inactividad_dias ?? INACTIVIDAD_DIAS_DEFAULT;
  const base: PacienteUltimoTurno[] = (pacientes ?? []).map((p) => ({
    id: p.id,
    nombre: [p.nombre, p.apellido].filter(Boolean).join(' ').trim(),
    telefono: p.telefono ?? '',
    creado: String(p.created_at).slice(0, 10),
    ultimaFecha: p.alma_appointments?.[0]?.fecha ?? null,
  }));
  const inactivos = pacientesInactivos(base, umbral, hoy);

  return (
    <main className="pb-24 md:pb-8">
      <header className="mb-4">
        <h1 className="text-[22px] font-semibold">Reportes</h1>
      </header>

      <DiaNav
        prevHref={`/reportes?m=${addMeses(ym, -1)}`}
        nextHref={`/reportes?m=${addMeses(ym, 1)}`}
        titulo={etiquetaMes(ym)}
        prevLabel="Mes anterior"
        nextLabel="Mes siguiente"
      />

      <section className="rounded-lg border border-[var(--alma-border)] bg-[var(--alma-surface)] p-4">
        <p className="text-xs font-semibold uppercase tracking-[.08em] text-[var(--alma-text-muted)]">
          Turnos
        </p>
        {conteo.total === 0 ? (
          <p className="mt-2 text-sm text-[var(--alma-text-muted)]">Este mes no tiene turnos.</p>
        ) : (
          <>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Cifra etiqueta="Completados" valor={conteo.completados} />
              <Cifra etiqueta="En pie" valor={conteo.enPie} />
              <Cifra etiqueta="Cancelados" valor={conteo.cancelados} />
              <Cifra etiqueta="Ausentes" valor={conteo.ausentes} />
            </div>
            {ausentismo !== null && (
              <p className="mt-3 text-xs text-[var(--alma-text-muted)]">
                De los turnos ya cerrados, el <span className="tnum">{ausentismo}%</span> terminó en
                ausencia.
              </p>
            )}
          </>
        )}
      </section>

      <section className="mt-4 rounded-lg border border-[var(--alma-border)] bg-[var(--alma-surface)] p-4">
        <p className="text-xs font-semibold uppercase tracking-[.08em] text-[var(--alma-text-muted)]">
          Caja del mes
        </p>
        <div className="mt-3 grid grid-cols-3 gap-3">
          <Cifra etiqueta="Ingresos" valor={pesos(ingresos)} />
          <Cifra etiqueta="Gastos" valor={pesos(gastos)} />
          <Cifra etiqueta="Balance" valor={pesos(ingresos - gastos)} />
        </div>
        {(variacion !== null || senas > 0) && (
          <div className="mt-3 flex flex-col gap-0.5">
            {variacion !== null && (
              <p className="text-xs text-[var(--alma-text-muted)]">
                Ingresos <span className="tnum">{variacion >= 0 ? `+${variacion}` : variacion}%</span>{' '}
                respecto de {etiquetaMes(ymPrev)}.
              </p>
            )}
            {senas > 0 && (
              <p className="text-xs text-[var(--alma-text-muted)]">
                Señas ya cobradas de turnos de este mes: <span className="tnum">{pesos(senas)}</span>.
              </p>
            )}
          </div>
        )}
      </section>

      {porServicio.length > 0 && <TablaResumen titulo="Servicios" filas={porServicio} />}
      {porEmpleado.length > 0 && <TablaResumen titulo="Empleados" filas={porEmpleado} />}

      <section className="mt-4 rounded-lg border border-[var(--alma-border)] bg-[var(--alma-surface)] p-4">
        <p className="text-xs font-semibold uppercase tracking-[.08em] text-[var(--alma-text-muted)]">
          Pacientes
        </p>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <Cifra etiqueta="Nuevos este mes" valor={nuevos ?? 0} />
          <Cifra etiqueta="Atendidos" valor={atendidos} />
        </div>
        {top.length > 0 && (
          <ul className="mt-3 border-t border-[var(--alma-border)]">
            {top.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between gap-3 border-b border-[var(--alma-border)] py-2 last:border-b-0"
              >
                <Link
                  href={`/pacientes/${p.id}`}
                  className="min-w-0 flex-1 truncate text-sm font-medium transition-colors duration-micro ease-alma hover:text-[var(--alma-action)]"
                >
                  {p.nombre}
                </Link>
                <span className="tnum shrink-0 text-sm text-[var(--alma-text-muted)]">
                  {p.visitas} {p.visitas === 1 ? 'visita' : 'visitas'}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-8">
        <h2 className="text-[17px] font-semibold">Pacientes que hace tiempo no vienen</h2>
        <p className="mb-4 mt-1 text-sm text-[var(--alma-text-muted)]">
          Sin turnos hace {umbral} días o más. Podés cambiar el período en{' '}
          <Link href="/ajustes" className="underline underline-offset-2 hover:text-[var(--alma-text)]">
            Ajustes
          </Link>
          .
        </p>
        {inactivos.length === 0 ? (
          <EmptyState mensaje="Ningún paciente lleva tanto tiempo sin venir." />
        ) : (
          <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {inactivos.map((p) => (
              <li key={p.id}>
                <InactivoCard p={p} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

function Cifra({ etiqueta, valor }: { etiqueta: string; valor: number | string }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-[.08em] text-[var(--alma-text-muted)]">
        {etiqueta}
      </p>
      <p className="tnum mt-0.5 text-[22px] font-semibold leading-tight">{valor}</p>
    </div>
  );
}

function TablaResumen({ titulo, filas }: { titulo: string; filas: FilaResumen[] }) {
  return (
    <section className="mt-4 rounded-lg border border-[var(--alma-border)] bg-[var(--alma-surface)] p-4">
      <p className="text-xs font-semibold uppercase tracking-[.08em] text-[var(--alma-text-muted)]">
        {titulo} · turnos completados
      </p>
      <ul className="mt-2">
        {filas.map((f) => (
          <li
            key={f.id}
            className="flex items-center justify-between gap-3 border-b border-[var(--alma-border)] py-2 last:border-b-0"
          >
            <span className="min-w-0 flex-1 truncate text-sm font-medium">{f.nombre}</span>
            <span className="tnum shrink-0 text-sm text-[var(--alma-text-muted)]">
              {f.cantidad} {f.cantidad === 1 ? 'turno' : 'turnos'}
            </span>
            <span className="tnum w-20 shrink-0 text-right text-sm font-semibold">
              {pesos(f.facturado)}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
