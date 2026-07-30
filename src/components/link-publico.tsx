'use client';

import { useState } from 'react';
import { waShareLink } from '@/lib/whatsapp';

/** Muestra el link público de reservas con copiar y compartir por WhatsApp. */
export function LinkPublico({ url }: { url: string }) {
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(url);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // Si el navegador no deja copiar, el link ya está visible para copiar a mano.
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center rounded-md bg-[var(--alma-surface-2)] p-3">
        <input
          readOnly
          value={url}
          aria-label="Tu link de reservas"
          className="min-w-0 flex-1 truncate bg-transparent px-1 text-sm outline-none"
        />
        <button
          type="button"
          onClick={copiar}
          className="shrink-0 rounded px-3 py-2 text-xs font-semibold text-[var(--alma-action)] transition-opacity duration-micro ease-alma hover:opacity-80 whitespace-nowrap"
        >
          {copiado ? 'Copiado' : 'Copiar'}
        </button>
      </div>
      <a
        href={waShareLink(`Reservá tu turno acá: ${url}`)}
        target="_blank"
        rel="noopener noreferrer"
        className="rounded-md border border-[var(--alma-border)] px-4 py-3 text-center text-sm font-semibold text-[var(--alma-text-muted)] transition-colors duration-micro ease-alma hover:text-[var(--alma-text)] w-full"
      >
        Compartir por WhatsApp
      </a>
    </div>
  );
}
