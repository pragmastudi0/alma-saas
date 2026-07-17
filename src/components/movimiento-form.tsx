'use client';

import { useActionState, useState } from 'react';
import { inputCls, labelCls } from '@/components/ui/field';
import type { CajaState, TipoMovimiento } from '@/lib/caja';

type Defaults = {
  fecha: string;
  tipo?: TipoMovimiento;
  categoria?: string;
  descripcion?: string;
  monto?: number;
};

export function MovimientoForm({
  action,
  defaults,
}: {
  action: (prev: CajaState, formData: FormData) => Promise<CajaState>;
  defaults: Defaults;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const [tipo, setTipo] = useState<TipoMovimiento>(defaults.tipo ?? 'ingreso');

  const seg = (activo: boolean) =>
    `rounded-md px-4 py-2.5 text-sm font-semibold transition-colors duration-micro ease-alma ${
      activo
        ? 'bg-[var(--alma-action-soft)] text-[var(--alma-action)]'
        : 'border border-[var(--alma-border)] text-[var(--alma-text-muted)]'
    }`;

  return (
    <form action={formAction} className="flex flex-col gap-4 md:max-w-xl">
      <input type="hidden" name="tipo" value={tipo} />
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={() => setTipo('ingreso')} className={seg(tipo === 'ingreso')}>
          Ingreso
        </button>
        <button type="button" onClick={() => setTipo('gasto')} className={seg(tipo === 'gasto')}>
          Gasto
        </button>
      </div>

      <label className="block">
        <span className={labelCls}>Categoría</span>
        <input
          name="categoria"
          list="alma-cats"
          required
          defaultValue={defaults.categoria}
          placeholder="Ej: Turno, Alquiler, Insumos"
          className={inputCls}
        />
        <datalist id="alma-cats">
          <option value="Turno" />
          <option value="Alquiler" />
          <option value="Insumos" />
          <option value="Otros" />
        </datalist>
      </label>

      <label className="block">
        <span className={labelCls}>Descripción</span>
        <input name="descripcion" defaultValue={defaults.descripcion} className={inputCls} />
      </label>

      <div className="flex gap-3">
        <label className="block flex-1">
          <span className={labelCls}>Monto</span>
          <input
            name="monto"
            type="number"
            min={0}
            step={500}
            required
            defaultValue={defaults.monto}
            className={inputCls + ' tnum'}
          />
        </label>
        <label className="block flex-1">
          <span className={labelCls}>Fecha</span>
          <input
            name="fecha"
            type="date"
            required
            defaultValue={defaults.fecha}
            className={inputCls}
          />
        </label>
      </div>

      {state.error && (
        <p role="alert" className="text-sm text-[var(--error-600)]">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-[var(--alma-action)] px-4 py-3 font-semibold text-[var(--alma-on-action)] shadow-brand transition-opacity duration-micro ease-alma disabled:opacity-40"
      >
        {pending ? 'Un momento…' : 'Guardar movimiento'}
      </button>
    </form>
  );
}
