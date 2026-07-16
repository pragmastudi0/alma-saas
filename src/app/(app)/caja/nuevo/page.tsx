import { MovimientoForm } from '@/components/movimiento-form';
import { BackLink } from '@/components/back-link';
import { crearMovimiento } from '../actions';
import { hoyISO } from '@/lib/fecha';

export default async function NuevoMovimientoPage({
  searchParams,
}: {
  searchParams: Promise<{ tipo?: string; monto?: string; desc?: string; cat?: string }>;
}) {
  const sp = await searchParams;
  const tipo = sp.tipo === 'gasto' ? 'gasto' : 'ingreso';
  const monto = sp.monto && /^\d+(\.\d+)?$/.test(sp.monto) ? Number(sp.monto) : undefined;

  return (
    <main className="pb-10">
      <header className="mb-5 flex items-center gap-2">
        <BackLink href="/caja" />
        <h1 className="text-[22px] font-semibold">Nuevo movimiento</h1>
      </header>

      <MovimientoForm
        action={crearMovimiento}
        defaults={{
          fecha: hoyISO(),
          tipo,
          categoria: sp.cat,
          descripcion: sp.desc,
          monto,
        }}
      />
    </main>
  );
}
