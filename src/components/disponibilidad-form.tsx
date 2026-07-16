'use client';

import { useActionState, useState } from 'react';
import { inputCls } from '@/components/ui/field';
import {
  NOMBRES_DIAS,
  ORDEN_DIAS,
  type DisponibilidadDia,
  type DisponibilidadState,
} from '@/lib/disponibilidad';

/** Fila por día: activar y elegir el rango en que se atiende. */
function Dia({
  n,
  inicial,
}: {
  n: number;
  inicial: DisponibilidadDia | undefined;
}) {
  const [activo, setActivo] = useState(!!inicial);

  return (
    <div className="flex items-center gap-3">
      <label className="flex w-28 shrink-0 items-center gap-2 text-sm font-medium">
        <input
          type="checkbox"
          name={`d${n}_activo`}
          checked={activo}
          onChange={(e) => setActivo(e.target.checked)}
          className="h-4 w-4 accent-[var(--alma-action)]"
        />
        <span className="capitalize">{NOMBRES_DIAS[n]}</span>
      </label>
      {activo ? (
        <div className="flex flex-1 items-center gap-2">
          <input
            type="time"
            name={`d${n}_desde`}
            required
            defaultValue={inicial?.hora_desde ?? '09:00'}
            className={inputCls + ' tnum'}
            aria-label={`${NOMBRES_DIAS[n]}: desde`}
          />
          <span className="text-sm text-[var(--alma-text-muted)]">a</span>
          <input
            type="time"
            name={`d${n}_hasta`}
            required
            defaultValue={inicial?.hora_hasta ?? '18:00'}
            className={inputCls + ' tnum'}
            aria-label={`${NOMBRES_DIAS[n]}: hasta`}
          />
        </div>
      ) : (
        <p className="text-sm text-[var(--alma-text-muted)]">No atendés</p>
      )}
    </div>
  );
}

export function DisponibilidadForm({
  action,
  inicial,
}: {
  action: (prev: DisponibilidadState, formData: FormData) => Promise<DisponibilidadState>;
  inicial: DisponibilidadDia[];
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const porDia = new Map(inicial.map((d) => [d.dia_semana, d]));

  return (
    <form action={formAction} className="flex flex-col gap-3">
      {ORDEN_DIAS.map((n) => (
        <Dia key={n} n={n} inicial={porDia.get(n)} />
      ))}

      {state.error && (
        <p role="alert" className="text-sm text-[var(--error-600)]">
          {state.error}
        </p>
      )}
      {state.info && <p className="text-sm text-[var(--alma-action)]">{state.info}</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-[var(--alma-action)] px-4 py-3 font-semibold text-[var(--alma-on-action)] shadow-brand transition-opacity duration-micro ease-alma disabled:opacity-40"
      >
        {pending ? 'Un momento…' : 'Guardar horarios'}
      </button>
    </form>
  );
}
