'use client';

import { useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import { IconoCampana } from '@/components/icons';
import { turnosNuevos, marcarNotifVistas } from '@/app/(app)/_notif/actions';
import { etiquetaDia } from '@/lib/fecha';
import type { NotifTurno } from '@/lib/notif';

const POLL_MS = 25_000;

/** Campanita de turnos nuevos (reservas del portal). Refresca en vivo por polling. */
export function CampanaNotif() {
  const [count, setCount] = useState(0);
  const [items, setItems] = useState<NotifTurno[]>([]);
  const [abierto, setAbierto] = useState(false);
  const [, start] = useTransition();

  useEffect(() => {
    let vivo = true;
    async function cargar() {
      const r = await turnosNuevos();
      if (!vivo) return;
      setCount(r.count);
      setItems(r.items);
    }
    cargar();
    const id = setInterval(cargar, POLL_MS);
    return () => {
      vivo = false;
      clearInterval(id);
    };
  }, []);

  function toggle() {
    const abrir = !abierto;
    setAbierto(abrir);
    // Al abrir, se dan por vistas: el badge se apaga y se persiste la marca.
    if (abrir && count > 0) {
      setCount(0);
      start(async () => {
        await marcarNotifVistas();
      });
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={toggle}
        aria-label={count > 0 ? `${count} turnos nuevos` : 'Notificaciones'}
        className="relative flex h-10 w-10 items-center justify-center rounded-full text-[var(--alma-text-muted)] transition-colors duration-micro ease-alma hover:bg-[var(--alma-surface)] hover:text-[var(--alma-text)]"
      >
        <IconoCampana className="h-5 w-5" />
        {count > 0 && (
          <span className="tnum absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--alma-action)] px-1 text-[10px] font-semibold leading-none text-[var(--alma-on-action)]">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {abierto && (
        <>
          {/* Captura el click afuera para cerrar. */}
          <button
            type="button"
            aria-hidden
            tabIndex={-1}
            onClick={() => setAbierto(false)}
            className="fixed inset-0 z-40 cursor-default"
          />
          <div className="absolute right-0 z-50 mt-2 w-72 overflow-hidden rounded-lg border border-[var(--alma-border)] bg-[var(--alma-surface)] shadow-2">
            <p className="border-b border-[var(--alma-border)] px-4 py-2.5 text-xs font-semibold uppercase tracking-[.08em] text-[var(--alma-text-muted)]">
              Turnos nuevos
            </p>
            {items.length === 0 ? (
              <p className="px-4 py-5 text-sm text-[var(--alma-text-muted)]">
                Sin reservas nuevas por ahora.
              </p>
            ) : (
              <ul className="max-h-80 overflow-y-auto">
                {items.map((i) => (
                  <li key={i.id}>
                    <Link
                      href={`/agenda/${i.id}`}
                      onClick={() => setAbierto(false)}
                      className="flex items-center gap-2 px-4 py-2.5 transition-colors duration-micro ease-alma hover:bg-[var(--alma-surface-2)]"
                    >
                      {i.nuevo ? (
                        <span className="h-2 w-2 shrink-0 rounded-full bg-[var(--alma-action)]" />
                      ) : (
                        <span className="h-2 w-2 shrink-0" />
                      )}
                      <span className="min-w-0 flex-1 truncate text-sm font-medium">
                        {i.paciente}
                      </span>
                      <span className="shrink-0 text-xs capitalize text-[var(--alma-text-muted)]">
                        {etiquetaDia(i.fecha)} · <span className="tnum">{i.hora}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
