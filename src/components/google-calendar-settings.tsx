'use client';

import { useEffect, useRef, useState } from 'react';
import { desconectarGoogle } from '@/app/(app)/ajustes/actions';

export function GoogleCalendarSettings({ conectado, iniciar, configurado }: {
  conectado: boolean; iniciar: boolean; configurado: boolean;
}) {
  const [estado, setEstado] = useState('');
  const [trabajando, setTrabajando] = useState(false);
  const started = useRef(false);

  async function sincronizarFuturos() {
    setTrabajando(true);
    setEstado('Sincronizando turnos futuros…');
    let offset = 0;
    let fallidos = 0;
    try {
      while (true) {
        const response = await fetch('/api/google-calendar/backfill', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ offset }),
        });
        if (!response.ok) throw new Error('No pudimos completar la sincronización. Probá de nuevo.');
        const result = await response.json() as { nextOffset: number; hasMore: boolean; fallidos: number };
        offset = result.nextOffset;
        fallidos += result.fallidos;
        if (!result.hasMore) break;
      }
      setEstado(fallidos
        ? `${offset - fallidos} turnos sincronizados. ${fallidos} pendientes: probá de nuevo.`
        : `${offset} turnos futuros sincronizados con Google.`);
    } catch (error) {
      setEstado(error instanceof Error ? error.message : 'No pudimos sincronizar los turnos.');
    } finally {
      setTrabajando(false);
    }
  }

  useEffect(() => {
    if (conectado && iniciar && !started.current) {
      started.current = true;
      void sincronizarFuturos();
    }
  // Solo debe iniciarse una vez tras el callback OAuth.
  }, [conectado, iniciar]);

  return (
    <div className="mb-4 rounded-lg border border-[var(--alma-border)] bg-[var(--alma-surface)] p-4">
      <h3 className="font-semibold">Google Calendar</h3>
      <p className="mt-1 text-sm text-[var(--alma-text-muted)]">
        ALMA actualiza tu calendario principal. Los cambios en Google no modifican los turnos de ALMA.
      </p>
      {conectado ? (
        <div className="mt-3 flex flex-col gap-3">
          <p className="text-sm text-[var(--alma-action)]">Cuenta conectada.</p>
          <p className="text-xs text-[var(--alma-text-muted)]">
            Si ya tenés el calendario de ALMA agregado desde una URL en Google, quitá esa suscripción para no ver turnos duplicados.
          </p>
          <button type="button" disabled={trabajando} onClick={() => void sincronizarFuturos()}
            className="rounded-md bg-[var(--alma-action)] px-4 py-3 text-sm font-semibold text-[var(--alma-on-action)] disabled:opacity-40">
            {trabajando ? 'Sincronizando…' : 'Sincronizar turnos futuros'}
          </button>
          {estado && <p role="status" className="text-sm text-[var(--alma-text-muted)]">{estado}</p>}
          <form action={desconectarGoogle}>
            <button className="text-sm font-semibold text-[var(--alma-text-muted)]">Desconectar Google</button>
          </form>
        </div>
      ) : configurado ? (
        <a href="/api/google-calendar/conectar"
          className="mt-3 inline-flex rounded-md bg-[var(--alma-action)] px-4 py-3 text-sm font-semibold text-[var(--alma-on-action)]">
          Conectar Google Calendar
        </a>
      ) : (
        <p className="mt-3 text-sm text-[var(--alma-text-muted)]">La conexión directa todavía no está configurada.</p>
      )}
    </div>
  );
}
