import { createServerSupabase } from '@/lib/supabase/server';
import { CajaResumen } from '@/components/caja-resumen';
import { MovimientoCard, type MovimientoData } from '@/components/movimiento-card';
import { DiaNav } from '@/components/dia-nav';
import { EmptyState } from '@/components/empty-state';
import { Fab, AccionNueva } from '@/components/fab';
import { addMeses, etiquetaMes, hoyISO, mesActual, rangoMes } from '@/lib/fecha';
import { pesos } from '@/lib/format';

const MES = /^\d{4}-\d{2}$/;

export default async function CajaPage({
  searchParams,
}: {
  searchParams: Promise<{ m?: string }>;
}) {
  const { m } = await searchParams;
  const ym = m && MES.test(m) ? m : mesActual();
  const { desde, hasta } = rangoMes(ym);

  const supabase = await createServerSupabase();
  const [{ data }, { data: pend }] = await Promise.all([
    supabase
      .from('alma_cash_entries')
      .select('id, tipo, categoria, descripcion, monto, fecha')
      .gte('fecha', desde)
      .lt('fecha', hasta)
      .order('fecha', { ascending: false }),
    // Turnos activos sin completar (de hoy en adelante): lo que falta cobrar.
    supabase
      .from('alma_appointments')
      .select('precio, sena_monto, sena_pagada')
      .in('estado', ['pendiente_sena', 'confirmado'])
      .gte('fecha', hoyISO()),
  ]);

  // Por cobrar = precio total menos la seña que ya haya entrado a la caja.
  const porCobrar = (pend ?? []).reduce(
    (s, t) => s + (Number(t.precio) - (t.sena_pagada ? Number(t.sena_monto) : 0)),
    0,
  );
  const cantPorCobrar = (pend ?? []).length;

  const movimientos: MovimientoData[] = (data ?? []).map((x) => ({
    id: x.id,
    tipo: x.tipo,
    categoria: x.categoria,
    descripcion: x.descripcion,
    monto: Number(x.monto),
  }));

  const ingresos = movimientos
    .filter((x) => x.tipo === 'ingreso')
    .reduce((s, x) => s + x.monto, 0);
  const gastos = movimientos.filter((x) => x.tipo === 'gasto').reduce((s, x) => s + x.monto, 0);

  return (
    <main className="pb-24 md:pb-8">
      <div className="mb-4 hidden justify-end md:flex">
        <AccionNueva href="/caja/nuevo" label="Nuevo movimiento" />
      </div>
      <DiaNav
        prevHref={`/caja?m=${addMeses(ym, -1)}`}
        nextHref={`/caja?m=${addMeses(ym, 1)}`}
        titulo={etiquetaMes(ym)}
        prevLabel="Mes anterior"
        nextLabel="Mes siguiente"
      />

      <CajaResumen ingresos={ingresos} gastos={gastos} />

      {cantPorCobrar > 0 && (
        <section className="mt-4 rounded-lg border border-dashed border-[var(--alma-border)] bg-[var(--alma-surface)] p-4">
          <p className="text-xs font-semibold uppercase tracking-[.08em] text-[var(--alma-text-muted)]">
            Por cobrar · próximos turnos
          </p>
          <p className="tnum mt-1 text-[26px] font-semibold">{pesos(porCobrar)}</p>
          <p className="mt-0.5 text-xs text-[var(--alma-text-muted)]">
            Falta cobrar de {cantPorCobrar} {cantPorCobrar === 1 ? 'turno agendado' : 'turnos agendados'} sin
            completar. Entra a la caja cuando lo marques completado.
          </p>
        </section>
      )}

      <section className="mt-6">
        {movimientos.length === 0 ? (
          <EmptyState
            mensaje="Este mes no tiene movimientos."
            ctaHref="/caja/nuevo"
            ctaLabel="Anotar un movimiento"
          />
        ) : (
          <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {movimientos.map((mv) => (
              <li key={mv.id}>
                <MovimientoCard m={mv} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <Fab href="/caja/nuevo" label="Nuevo movimiento" />
    </main>
  );
}
