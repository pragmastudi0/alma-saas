import { pesos } from '@/lib/format';
import { EliminarMovimientoBoton } from '@/components/eliminar-movimiento-boton';
import type { TipoMovimiento } from '@/lib/caja';

export type MovimientoData = {
  id: string;
  tipo: TipoMovimiento;
  categoria: string;
  descripcion: string;
  monto: number;
};

export function MovimientoCard({ m }: { m: MovimientoData }) {
  const ingreso = m.tipo === 'ingreso';
  return (
    <div className="flex items-center gap-3 rounded-lg border border-[var(--alma-border)] bg-[var(--alma-surface)] p-3.5">
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{m.descripcion || m.categoria}</p>
        <p className="mt-0.5 text-xs text-[var(--alma-text-muted)]">{m.categoria}</p>
      </div>
      <span
        className={`tnum shrink-0 font-semibold ${
          ingreso ? 'text-[var(--success-600)]' : 'text-[var(--error-600)]'
        }`}
      >
        {ingreso ? '+' : '−'}
        {pesos(m.monto)}
      </span>
      <EliminarMovimientoBoton id={m.id} />
    </div>
  );
}
