'use client';

import Link from 'next/link';
import { useActionState, useRef } from 'react';
import {
  cancelarTurno,
  completarTurno,
  confirmarSena,
  marcarAusente,
} from '@/app/(app)/agenda/actions';
import { SenaLinkBoton, type CobroSena, type WaCtx } from '@/components/sena-link-boton';
import { WhatsAppLink } from '@/components/whatsapp-link';
import { mensajeCancelacion, mensajeRecordatorio, waLink } from '@/lib/whatsapp';
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

/**
 * Cancela el turno y abre WhatsApp con el aviso en el mismo toque: el link
 * wa.me se abre con el gesto del usuario (sin bloqueo de popups) mientras el
 * form dispara la cancelación real. Si la transición falla, se muestra el error.
 */
function CancelarAvisando({ id, href }: { id: string; href: string }) {
  const [state, formAction, pending] = useActionState(cancelarTurno, {});
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <div>
      <form ref={formRef} action={formAction}>
        <input type="hidden" name="id" value={id} />
      </form>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        aria-disabled={pending}
        onClick={() => formRef.current?.requestSubmit()}
        className="flex w-full items-center justify-center rounded-md border border-[var(--alma-border)] px-4 py-3 font-semibold text-[var(--alma-text-muted)] transition-colors duration-micro ease-alma hover:text-[var(--alma-text)]"
      >
        {pending ? 'Un momento…' : 'Cancelar y avisar por WhatsApp'}
      </a>
      {state.error && (
        <p role="alert" className="mt-1.5 text-sm text-[var(--error-600)]">
          {state.error}
        </p>
      )}
    </div>
  );
}

function Cancelar({ id, wa, plantillaCancel }: { id: string; wa: WaCtx; plantillaCancel: string }) {
  const href = waLink(
    wa.telefono,
    mensajeCancelacion(plantillaCancel, {
      nombre: wa.nombre,
      apellido: wa.apellido,
      fecha: wa.fecha,
      hora: wa.hora,
    }),
  );
  if (!href) {
    return (
      <Accion action={cancelarTurno} id={id} variant="ghost">
        Cancelar turno
      </Accion>
    );
  }
  return (
    <>
      <CancelarAvisando id={id} href={href} />
      <Accion action={cancelarTurno} id={id} variant="ghost">
        Cancelar sin avisar
      </Accion>
    </>
  );
}

export function EstadoAcciones({
  id,
  estado,
  wa,
  cobro,
  plantillaCancel = '',
  reprogramarHref,
}: {
  id: string;
  estado: Estado;
  wa: WaCtx;
  cobro: CobroSena;
  plantillaCancel?: string;
  reprogramarHref?: string;
}) {
  if (estado === 'pendiente_sena') {
    return (
      <div className="flex flex-col gap-2.5">
        <SenaLinkBoton id={id} wa={wa} cobro={cobro} />
        <Accion action={confirmarSena} id={id} variant="primary">
          Marcar seña cobrada
        </Accion>
        <Cancelar id={id} wa={wa} plantillaCancel={plantillaCancel} />
      </div>
    );
  }

  if (estado === 'confirmado') {
    return (
      <div className="flex flex-col gap-2.5">
        <WhatsAppLink href={waLink(wa.telefono, mensajeRecordatorio(wa.nombre, wa.fecha, wa.hora))}>
          Recordar por WhatsApp
        </WhatsAppLink>
        <Accion action={completarTurno} id={id} variant="primary">
          Marcar como completado
        </Accion>
        <Accion action={marcarAusente} id={id} variant="ghost">
          No vino (ausente)
        </Accion>
        <Cancelar id={id} wa={wa} plantillaCancel={plantillaCancel} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2.5">
      {reprogramarHref && (
        <Link
          href={reprogramarHref}
          className="flex w-full items-center justify-center rounded-md bg-[var(--alma-action)] px-4 py-3 font-semibold text-[var(--alma-on-action)] shadow-brand transition-opacity duration-micro ease-alma hover:opacity-90"
        >
          Reprogramar turno
        </Link>
      )}
      <p className="text-sm text-[var(--alma-text-muted)]">Este turno ya está cerrado.</p>
    </div>
  );
}
