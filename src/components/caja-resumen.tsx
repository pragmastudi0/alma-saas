import { pesos } from '@/lib/format';

export function CajaResumen({ ingresos, gastos }: { ingresos: number; gastos: number }) {
  const balance = ingresos - gastos;
  return (
    <section className="rounded-xl bg-gradient-to-br from-verde-600 to-verde-700 p-6 text-white shadow-brand">
      <p className="text-xs font-semibold uppercase tracking-[.1em] opacity-75">Balance del mes</p>
      <p className="voice mt-1 text-[44px] leading-[1.05] tnum">{pesos(balance)}</p>
      <div className="mt-4 grid grid-cols-2 gap-3 border-t border-white/20 pt-3">
        <div>
          <p className="text-xs uppercase tracking-[.08em] opacity-75">Ingresos</p>
          <p className="tnum mt-0.5 font-semibold">{pesos(ingresos)}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[.08em] opacity-75">Gastos</p>
          <p className="tnum mt-0.5 font-semibold">{pesos(gastos)}</p>
        </div>
      </div>
    </section>
  );
}
