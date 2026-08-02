'use client';

import { useActionState } from 'react';
import { eliminarTurno } from '@/app/(app)/agenda/actions';

/**
 * Borra el turno para siempre. `conCobros` avisa que la plata ya asentada
 * sigue en la caja, así el profesional sabe qué queda y qué no.
 */
export function EliminarTurnoBoton({ id, conCobros = false }: { id: string; conCobros?: boolean }) {
  const [state, formAction, pending] = useActionState(eliminarTurno, {});

  const aviso = conCobros
    ? '¿Eliminar este turno? Lo que ya cobraste queda en la caja. No se puede deshacer.'
    : '¿Eliminar este turno? No se puede deshacer.';

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (!confirm(aviso)) {
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
        {pending ? 'Un momento…' : 'Eliminar turno'}
      </button>
      {state.error && (
        <p role="alert" className="mt-1 text-sm text-[var(--error-600)]">
          {state.error}
        </p>
      )}
    </form>
  );
}
