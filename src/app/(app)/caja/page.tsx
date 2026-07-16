import { createServerSupabase } from '@/lib/supabase/server';
import { CajaResumen } from '@/components/caja-resumen';
import { MovimientoCard, type MovimientoData } from '@/components/movimiento-card';
import { DiaNav } from '@/components/dia-nav';
import { Fab } from '@/components/fab';
import { addMeses, etiquetaMes, mesActual, rangoMes } from '@/lib/fecha';

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
  const { data } = await supabase
    .from('alma_cash_entries')
    .select('id, tipo, categoria, descripcion, monto, fecha')
    .gte('fecha', desde)
    .lt('fecha', hasta)
    .order('fecha', { ascending: false });

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
    <main className="pb-24">
      <DiaNav
        prevHref={`/caja?m=${addMeses(ym, -1)}`}
        nextHref={`/caja?m=${addMeses(ym, 1)}`}
        titulo={etiquetaMes(ym)}
        prevLabel="Mes anterior"
        nextLabel="Mes siguiente"
      />

      <CajaResumen ingresos={ingresos} gastos={gastos} />

      <section className="mt-6">
        {movimientos.length === 0 ? (
          <p className="rounded-lg border border-dashed border-[var(--alma-border)] p-8 text-center text-sm text-[var(--alma-text-muted)]">
            Este mes no tiene movimientos.
          </p>
        ) : (
          <ul className="flex flex-col gap-2.5">
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
