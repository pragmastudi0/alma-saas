'use client';

import { useActionState } from 'react';
import { pagarSena } from '@/app/t/[slug]/actions';
import type { ReservaState } from '@/lib/portal';

/** Botón de pago (o reintento) de la seña desde la página pública del turno. */
export function PagarSenaBoton({ slug, id }: { slug: string; id: string }) {
  const [state, formAction, pending] = useActionState<ReservaState, FormData>(pagarSena, {});

  return (
    <div className="flex flex-col gap-2">
      <form action={formAction}>
        <input type="hidden" name="slug" value={slug} />
        <input type="hidden" name="id" value={id} />
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-md bg-[var(--alma-action)] px-4 py-3 font-semibold text-[var(--alma-on-action)] shadow-brand transition-opacity duration-micro ease-alma disabled:opacity-40"
        >
          {pending ? 'Un momento…' : 'Pagar la seña'}
        </button>
      </form>
      {state.error && (
        <p role="alert" className="text-sm text-[var(--error-600)]">
          {state.error}
        </p>
      )}
    </div>
  );
}
