'use client';

import { useActionState, useState } from 'react';
import {
  cancelarTurno,
  completarTurno,
  confirmarSena,
  confirmarSinSena,
  marcarAusente,
} from '@/app/(app)/agenda/actions';
import { SENA_MODO_DEFAULT, permiteConfirmarSinSena, type SenaModo } from '@/lib/sena';
import type { AgendaState, Estado } from '@/lib/turno';

type Action = (prev: AgendaState, formData: FormData) => Promise<AgendaState>;

const BTN =
  'min-h-[44px] rounded-md px-3.5 text-sm font-semibold transition-opacity duration-micro ease-alma disabled:opacity-40';
const PRIMARIO = `${BTN} bg-[var(--alma-action)] text-[var(--alma-on-action)] shadow-brand`;
const GHOST = `${BTN} border border-[var(--alma-border)] text-[var(--alma-text-muted)] hover:text-[var(--alma-text)]`;
const PELIGRO = `${BTN} border border-[var(--alma-border)] text-[var(--error-600)]`;

function Boton({
  action,
  id,
  className,
  children,
}: {
  action: Action;
  id: string;
  className: string;
  children: React.ReactNode;
}) {
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <>
      <form action={formAction} className="contents">
        <input type="hidden" name="id" value={id} />
        <button type="submit" disabled={pending} className={className}>
          {pending ? 'Un momento…' : children}
        </button>
      </form>
      {state.error && (
        <p role="alert" className="w-full text-sm text-[var(--error-600)]">
          {state.error}
        </p>
      )}
    </>
  );
}

/**
 * Acciones de estado directo desde la lista, sin entrar al detalle.
 * Cancelar y ausente piden confirmación inline (dos pasos, sin diálogos del navegador).
 */
export function TurnoAccionesRapidas({
  id,
  estado,
  senaModo = SENA_MODO_DEFAULT,
}: {
  id: string;
  estado: Estado;
  senaModo?: SenaModo;
}) {
  const [confirmando, setConfirmando] = useState<'cancelar' | 'ausente' | null>(null);

  if (estado !== 'pendiente_sena' && estado !== 'confirmado') return null;

  if (confirmando) {
    const esCancelar = confirmando === 'cancelar';
    return (
      <div className="flex flex-wrap items-center gap-2">
        <p className="mr-1 text-sm text-[var(--alma-text)]">
          {esCancelar ? '¿Cancelás este turno?' : '¿Marcás que no vino?'}
        </p>
        <Boton action={esCancelar ? cancelarTurno : marcarAusente} id={id} className={PELIGRO}>
          {esCancelar ? 'Sí, cancelar' : 'Sí, no vino'}
        </Boton>
        <button type="button" onClick={() => setConfirmando(null)} className={GHOST}>
          Volver
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {estado === 'pendiente_sena' ? (
        <>
          <Boton action={confirmarSena} id={id} className={PRIMARIO}>
            Seña cobrada
          </Boton>
          {permiteConfirmarSinSena(senaModo) && (
            <Boton action={confirmarSinSena} id={id} className={GHOST}>
              Confirmar sin seña
            </Boton>
          )}
        </>
      ) : (
        <>
          <Boton action={completarTurno} id={id} className={PRIMARIO}>
            Completar
          </Boton>
          <button type="button" onClick={() => setConfirmando('ausente')} className={GHOST}>
            No vino
          </button>
        </>
      )}
      <button type="button" onClick={() => setConfirmando('cancelar')} className={GHOST}>
        Cancelar
      </button>
    </div>
  );
}
