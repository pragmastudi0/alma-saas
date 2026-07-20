'use client';

import { useActionState, useState } from 'react';
import { reservarTurno } from '@/app/t/[slug]/actions';
import { inputCls, labelCls } from '@/components/ui/field';
import { pesos } from '@/lib/format';
import type { ReservaState } from '@/lib/portal';

const cardCls =
  'rounded-lg border border-[var(--alma-border)] bg-[var(--alma-surface)] p-4 shadow-1';
const seccionCls = 'mb-3 text-sm font-semibold text-[var(--alma-text)]';

/** Elegir horario + datos del paciente. El horario elegido viaja como hidden. */
export function ReservaForm({
  slug,
  fecha,
  slots,
  nombreProfesional,
  sena,
  serviceId,
  serviceNombre,
}: {
  slug: string;
  fecha: string;
  slots: string[];
  nombreProfesional: string;
  sena: number;
  serviceId?: string;
  serviceNombre?: string | null;
}) {
  const [state, formAction, pending] = useActionState<ReservaState, FormData>(reservarTurno, {});
  const [hora, setHora] = useState<string | null>(null);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="fecha" value={fecha} />
      {serviceId && <input type="hidden" name="service_id" value={serviceId} />}
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

      <section className={cardCls}>
        <p className={seccionCls}>Elegí un horario</p>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {slots.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setHora(s)}
              aria-pressed={hora === s}
              className={`tnum min-h-[44px] rounded-md border text-sm font-semibold transition-colors duration-micro ease-alma ${
                hora === s
                  ? 'border-[var(--alma-action)] bg-[var(--alma-action)] text-[var(--alma-on-action)]'
                  : 'border-[var(--alma-border)] bg-[var(--alma-bg)] hover:border-[var(--alma-text-muted)]'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </section>

      <section className={cardCls}>
        <p className={seccionCls}>Tus datos</p>
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block">
              <span className={labelCls}>Nombre</span>
              <input
                name="nombre"
                required
                minLength={2}
                maxLength={80}
                autoComplete="given-name"
                className={inputCls}
              />
            </label>
            <label className="block">
              <span className={labelCls}>Apellido</span>
              <input
                name="apellido"
                required
                minLength={2}
                maxLength={80}
                autoComplete="family-name"
                className={inputCls}
              />
            </label>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block">
              <span className={labelCls}>Teléfono</span>
              <input
                name="telefono"
                type="tel"
                required
                minLength={6}
                maxLength={40}
                autoComplete="tel"
                placeholder="11 5555 4444"
                className={inputCls + ' tnum'}
              />
            </label>
            <label className="block">
              <span className={labelCls}>Email</span>
              <input
                name="email"
                type="email"
                required
                maxLength={120}
                autoComplete="email"
                placeholder="vos@email.com"
                className={inputCls}
              />
            </label>
          </div>

          <label className="block sm:max-w-[16rem]">
            <span className={labelCls}>Fecha de nacimiento</span>
            <input name="fecha_nacimiento" type="date" required className={inputCls} />
          </label>
        </div>
      </section>

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
          : serviceNombre
            ? `Tu turno de ${serviceNombre} te espera.`
            : `Al reservar, ${nombreProfesional} te va a estar esperando.`}
      </p>
    </form>
  );
}
