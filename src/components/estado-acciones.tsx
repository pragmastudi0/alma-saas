'use client';

import { useActionState } from 'react';
import {
  cancelarTurno,
  completarTurno,
  confirmarSena,
  marcarAusente,
} from '@/app/(app)/agenda/actions';
import { SenaLinkBoton } from '@/components/sena-link-boton';
import type { AgendaState, Estado } from '@/lib/turno';

type Action = (prev: AgendaState, formData: FormData) => Promise<AgendaState>;

function Accion({
  action,
  id,
  variant,
  children,
}: {
  action: Action;
  id: string;
  variant: 'primary' | 'ghost';
  children: React.ReactNode;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const cls =
    variant === 'primary'
      ? 'bg-[var(--alma-action)] text-[var(--alma-on-action)] shadow-brand'
      : 'border border-[var(--alma-border)] text-[var(--alma-text-muted)] hover:text-[var(--alma-text)]';

  return (
    <div>
      <form action={formAction}>
        <input type="hidden" name="id" value={id} />
        <button
          type="submit"
          disabled={pending}
          className={`w-full rounded-md px-4 py-3 font-semibold transition-opacity duration-micro ease-alma disabled:opacity-40 ${cls}`}
        >
          {pending ? 'Un momento…' : children}
        </button>
      </form>
      {state.error && (
        <p role="alert" className="mt-1.5 text-sm text-[var(--error-600)]">
          {state.error}
        </p>
      )}
    </div>
  );
}

export function EstadoAcciones({ id, estado }: { id: string; estado: Estado }) {
  if (estado === 'pendiente_sena') {
    return (
      <div className="flex flex-col gap-2.5">
        <SenaLinkBoton id={id} />
        <Accion action={confirmarSena} id={id} variant="primary">
          Marcar seña cobrada
        </Accion>
        <Accion action={cancelarTurno} id={id} variant="ghost">
          Cancelar turno
        </Accion>
      </div>
    );
  }

  if (estado === 'confirmado') {
    return (
      <div className="flex flex-col gap-2.5">
        <Accion action={completarTurno} id={id} variant="primary">
          Marcar como completado
        </Accion>
        <Accion action={marcarAusente} id={id} variant="ghost">
          No vino (ausente)
        </Accion>
        <Accion action={cancelarTurno} id={id} variant="ghost">
          Cancelar turno
        </Accion>
      </div>
    );
  }

  return <p className="text-sm text-[var(--alma-text-muted)]">Este turno ya está cerrado.</p>;
}
