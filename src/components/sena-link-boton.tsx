'use client';

import { useActionState, useState } from 'react';
import { generarLinkSena } from '@/app/(app)/agenda/actions';
import { WhatsAppLink } from '@/components/whatsapp-link';
import { mensajeSena, waLink } from '@/lib/whatsapp';
import type { MpLinkState } from '@/lib/turno';

export type WaCtx = {
  telefono: string;
  nombre: string;
  fecha: string;
  hora: string;
};

export function SenaLinkBoton({ id, wa }: { id: string; wa: WaCtx }) {
  const [state, formAction, pending] = useActionState<MpLinkState, FormData>(generarLinkSena, {});
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    if (!state.link) return;
    try {
      await navigator.clipboard.writeText(state.link);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // Si el navegador no deja copiar, el link ya está visible para copiar a mano.
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <form action={formAction}>
        <input type="hidden" name="id" value={id} />
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-md border border-[var(--alma-border)] px-4 py-3 font-semibold text-[var(--alma-text-muted)] transition-colors duration-micro ease-alma hover:text-[var(--alma-text)] disabled:opacity-40"
        >
          {pending ? 'Generando…' : 'Generar link de seña'}
        </button>
      </form>

      {state.error && (
        <p role="alert" className="text-sm text-[var(--error-600)]">
          {state.error}
        </p>
      )}

      {state.link && (
        <>
          <div className="flex items-center gap-2 rounded-md bg-[var(--alma-surface-2)] p-2">
            <input
              readOnly
              value={state.link}
              aria-label="Link de pago de la seña"
              className="min-w-0 flex-1 truncate bg-transparent px-1 text-sm outline-none"
            />
            <button
              type="button"
              onClick={copiar}
              className="shrink-0 rounded px-2.5 py-1 text-xs font-semibold text-[var(--alma-action)] transition-opacity duration-micro ease-alma hover:opacity-80"
            >
              {copiado ? 'Copiado' : 'Copiar'}
            </button>
          </div>

          <WhatsAppLink
            href={waLink(wa.telefono, mensajeSena(wa.nombre, wa.fecha, wa.hora, state.link))}
            variant="primary"
          >
            Enviar seña por WhatsApp
          </WhatsAppLink>
        </>
      )}
    </div>
  );
}
