'use client';

import { useActionState } from 'react';
import { eliminarMovimiento } from '@/app/(app)/caja/actions';

export function EliminarMovimientoBoton({ id }: { id: string }) {
  const [, formAction, pending] = useActionState(eliminarMovimiento, {});
  return (
    <form action={formAction}>
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        disabled={pending}
        aria-label="Borrar movimiento"
        className="shrink-0 rounded p-1.5 text-[var(--alma-text-muted)] transition-colors duration-micro ease-alma hover:text-[var(--error-600)] disabled:opacity-40"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 11v6M14 11v6" />
        </svg>
      </button>
    </form>
  );
}
