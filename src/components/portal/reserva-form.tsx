'use client';

import { useActionState, useState } from 'react';
import { reservarTurno } from '@/app/t/[slug]/actions';
import { inputCls, labelCls } from '@/components/ui/field';
import { pesos } from '@/lib/format';
import type { ReservaState } from '@/lib/portal';

/** Elegir horario + datos del paciente. El horario elegido viaja como hidden. */
export function ReservaForm({
  slug,
  fecha,
  slots,
  nombreProfesional,
  sena,
}: {
  slug: string;
  fecha: string;
  slots: string[];
  nombreProfesional: string;
  sena: number;
}) {
  const [state, formAction, pending] = useActionState<ReservaState, FormData>(reservarTurno, {});
  const [hora, setHora] = useState<string | null>(null);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="fecha" value={fecha} />
      {hora && <input type="hidden" name="hora" value={hora} />}
      {/* Honeypot: oculto para humanos. */}
      <input
        type="text"
        name="sitio"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="hidden"
      />

      <div>
        <p className={labelCls}>Elegí un horario</p>
        <div className="mt-1 grid grid-cols-3 gap-2">
          {slots.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setHora(s)}
              aria-pressed={hora === s}
              className={`tnum min-h-[44px] rounded-md border text-sm font-semibold transition-colors duration-micro ease-alma ${
                hora === s
                  ? 'border-[var(--alma-action)] bg-[var(--alma-action)] text-[var(--alma-on-action)]'
                  : 'border-[var(--alma-border)] bg-[var(--alma-surface)] hover:border-[var(--alma-text-muted)]'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <label className="block">
        <span className={labelCls}>Tu nombre</span>
        <input name="nombre" required minLength={2} maxLength={80} className={inputCls} />
      </label>

      <label className="block">
        <span className={labelCls}>Tu teléfono</span>
        <input
          name="telefono"
          type="tel"
          required
          minLength={6}
          maxLength={40}
          placeholder="11 5555 4444"
          className={inputCls + ' tnum'}
        />
      </label>

      {state.error && (
        <p role="alert" className="text-sm text-[var(--error-600)]">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending || !hora}
        className="rounded-md bg-[var(--alma-action)] px-4 py-3 font-semibold text-[var(--alma-on-action)] shadow-brand transition-opacity duration-micro ease-alma disabled:opacity-40"
      >
        {pending ? 'Un momento…' : sena > 0 ? `Reservar y pagar la seña` : 'Reservar el turno'}
      </button>

      <p className="text-center text-xs text-[var(--alma-text-muted)]">
        {sena > 0
          ? `Para confirmar el turno vas a dejar una seña de ${pesos(sena)} por Mercado Pago.`
          : `Al reservar, ${nombreProfesional} te va a estar esperando.`}
      </p>
    </form>
  );
}
