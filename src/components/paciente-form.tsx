'use client';

import { useActionState } from 'react';
import { inputCls, labelCls } from '@/components/ui/field';
import type { PacienteState } from '@/lib/paciente';

type Defaults = {
  nombre?: string;
  apellido?: string;
  telefono?: string;
  email?: string;
  fecha_nacimiento?: string;
  notas?: string;
};

export function PacienteForm({
  action,
  submitLabel,
  defaults = {},
  pacienteId,
}: {
  action: (prev: PacienteState, formData: FormData) => Promise<PacienteState>;
  submitLabel: string;
  defaults?: Defaults;
  pacienteId?: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <form action={formAction} className="flex flex-col gap-4 md:max-w-xl">
      {pacienteId && <input type="hidden" name="id" value={pacienteId} />}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="block">
          <span className={labelCls}>Nombre</span>
          <input
            name="nombre"
            required
            autoComplete="given-name"
            defaultValue={defaults.nombre}
            placeholder="Valentina"
            className={inputCls}
          />
        </label>
        <label className="block">
          <span className={labelCls}>Apellido</span>
          <input
            name="apellido"
            autoComplete="family-name"
            defaultValue={defaults.apellido}
            placeholder="Ríos"
            className={inputCls}
          />
        </label>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="block">
          <span className={labelCls}>Teléfono</span>
          <input
            name="telefono"
            inputMode="tel"
            autoComplete="tel"
            defaultValue={defaults.telefono}
            className={inputCls}
          />
        </label>
        <label className="block">
          <span className={labelCls}>Correo</span>
          <input
            name="email"
            type="email"
            autoComplete="email"
            defaultValue={defaults.email}
            className={inputCls}
          />
        </label>
      </div>

      <label className="block sm:max-w-[16rem]">
        <span className={labelCls}>Fecha de nacimiento</span>
        <input
          name="fecha_nacimiento"
          type="date"
          defaultValue={defaults.fecha_nacimiento}
          className={inputCls}
        />
      </label>

      <label className="block">
        <span className={labelCls}>Notas</span>
        <textarea
          name="notas"
          rows={4}
          defaultValue={defaults.notas}
          placeholder="Lo que quieras recordar de esta persona."
          className={inputCls + ' resize-y'}
        />
      </label>

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
