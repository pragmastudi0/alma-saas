'use client';

import { useActionState } from 'react';
import { eliminarPaciente } from '@/app/(app)/pacientes/actions';

export function EliminarPacienteBoton({
  id,
  nombre,
}: {
  id: string;
  nombre: string;
}) {
  const [state, formAction, pending] = useActionState(eliminarPaciente, {});

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (!confirm(`¿Eliminar a ${nombre}? Si tiene turnos, se archiva y su historial queda intacto.`)) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        disabled={pending}
        className="text-sm font-semibold text-[var(--alma-text-muted)] transition-colors duration-micro ease-alma hover:text-[var(--error-600)] disabled:opacity-40"
      >
        {pending ? 'Un momento…' : 'Eliminar'}
      </button>
      {state.error && (
        <p role="alert" className="mt-1 text-sm text-[var(--error-600)]">
          {state.error}
        </p>
      )}
    </form>
  );
}
