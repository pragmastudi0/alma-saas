'use client';

import { useActionState, useState } from 'react';
import { inputCls, labelCls } from '@/components/ui/field';
import type { AgendaState } from '@/lib/turno';

type Paciente = { id: string; nombre: string };

type Defaults = {
  fecha: string;
  hora: string;
  duracion_min: number;
  precio: number;
  sena_monto: number;
  patient_id?: string;
};

export function TurnoForm({
  action,
  submitLabel,
  defaults,
  pacientes,
  turnoId,
}: {
  action: (prev: AgendaState, formData: FormData) => Promise<AgendaState>;
  submitLabel: string;
  defaults: Defaults;
  pacientes?: Paciente[];
  turnoId?: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const [nuevo, setNuevo] = useState(pacientes?.length === 0);

  return (
    <form action={formAction} className="flex flex-col gap-4 md:max-w-xl">
      {turnoId && <input type="hidden" name="id" value={turnoId} />}

      {pacientes && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--alma-text-muted)]">Paciente</span>
            <button
              type="button"
              onClick={() => setNuevo((v) => !v)}
              className="text-xs font-semibold text-[var(--alma-action)] transition-opacity duration-micro ease-alma hover:opacity-80"
            >
              {nuevo ? 'Elegir de la lista' : 'Paciente nuevo'}
            </button>
          </div>

          {nuevo ? (
            <div className="flex flex-col gap-3">
              <input
                name="nuevo_nombre"
                placeholder="Nombre y apellido"
                autoComplete="off"
                className={inputCls}
              />
              <input
                name="nuevo_telefono"
                placeholder="Teléfono (opcional)"
                inputMode="tel"
                autoComplete="off"
                className={inputCls}
              />
            </div>
          ) : (
            <select
              name="patient_id"
              defaultValue={defaults.patient_id ?? ''}
              className={inputCls}
            >
              <option value="" disabled>
                Elegí un paciente
              </option>
              {pacientes.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      <div className="flex gap-3">
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
        <label className="block flex-1">
          <span className={labelCls}>Hora</span>
          <input name="hora" type="time" required defaultValue={defaults.hora} className={inputCls} />
        </label>
      </div>

      <label className="block">
        <span className={labelCls}>Duración (minutos)</span>
        <input
          name="duracion_min"
          type="number"
          min={5}
          step={5}
          required
          defaultValue={defaults.duracion_min}
          className={inputCls + ' tnum'}
        />
      </label>

      <div className="flex gap-3">
        <label className="block flex-1">
          <span className={labelCls}>Precio</span>
          <input
            name="precio"
            type="number"
            min={0}
            step={500}
            defaultValue={defaults.precio}
            className={inputCls + ' tnum'}
          />
        </label>
        <label className="block flex-1">
          <span className={labelCls}>Seña</span>
          <input
            name="sena_monto"
            type="number"
            min={0}
            step={500}
            defaultValue={defaults.sena_monto}
            className={inputCls + ' tnum'}
          />
        </label>
      </div>

      <p className="text-xs text-[var(--alma-text-muted)]">
        Con seña, el turno queda a la espera de la seña. Sin seña, nace confirmado.
      </p>

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
        {pending ? 'Un momento…' : submitLabel}
      </button>
    </form>
  );
}
