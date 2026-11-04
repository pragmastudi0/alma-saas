'use client';

import { useActionState } from 'react';
import { reintentarGoogle } from '@/app/(app)/agenda/actions';

export function GoogleSyncStatus({ id, fallo }: { id: string; fallo: boolean }) {
  const [state, action, pending] = useActionState(reintentarGoogle, {});
  if (!fallo && !state.info && !state.error) return null;
  return (
    <div role="status" className="mb-4 rounded-lg border border-[var(--alma-border)] bg-[var(--alma-surface)] p-4 text-sm">
      {state.info ? <p className="text-[var(--alma-action)]">{state.info}</p> :
        <p className="text-[var(--error-600)]">{state.error ?? 'Guardado en ALMA; no se pudo sincronizar con Google.'}</p>}
      {!state.info && (
        <form action={action} className="mt-2">
          <input type="hidden" name="id" value={id} />
          <button disabled={pending} className="font-semibold text-[var(--alma-action)] disabled:opacity-40">
            {pending ? 'Sincronizando…' : 'Reintentar sincronización'}
          </button>
        </form>
      )}
    </div>
  );
}
