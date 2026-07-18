import Link from 'next/link';
import { EstadoBadge } from '@/components/estado-badge';
import { etiquetaDia } from '@/lib/fecha';
import { horaCorta } from '@/lib/format';
import type { Estado } from '@/lib/turno';

export type MesTurno = {
  id: string;
  fecha: string;
  hora: string;
  estado: Estado;
  paciente: string;
};

/**
 * Agenda del mes en lista, agrupada por día: cada turno muestra hora + nombre
 * y linkea a su detalle (desde ahí se cancela). Reemplaza al conteo por día.
 */
export function MesAgenda({ turnos, hoy }: { turnos: MesTurno[]; hoy: string }) {
  if (turnos.length === 0) {
    return (
      <p className="mt-2 text-sm text-[var(--alma-text-muted)]">Este mes no tenés turnos.</p>
    );
  }

  // Ya vienen ordenados por fecha y hora: agrupamos preservando el orden.
  const grupos: { fecha: string; items: MesTurno[] }[] = [];
  for (const t of turnos) {
    const ultimo = grupos[grupos.length - 1];
    if (ultimo && ultimo.fecha === t.fecha) ultimo.items.push(t);
    else grupos.push({ fecha: t.fecha, items: [t] });
  }

  return (
    <div className="flex flex-col gap-5">
      {grupos.map((g) => (
        <div key={g.fecha}>
          <p
            className={`mb-2 text-xs font-semibold uppercase tracking-[.08em] ${
              g.fecha === hoy ? 'text-[var(--alma-action)]' : 'text-[var(--alma-text-muted)]'
            }`}
          >
            <span className="capitalize">{etiquetaDia(g.fecha)}</span>
            {g.fecha === hoy ? ' · hoy' : ''}
          </p>
          <ul className="flex flex-col gap-2">
            {g.items.map((t) => (
              <li key={t.id}>
                <Link
                  href={`/agenda/${t.id}`}
                  className="flex items-center gap-3 rounded-lg border border-[var(--alma-border)] bg-[var(--alma-surface)] px-3.5 py-3 transition-colors duration-micro ease-alma hover:border-[var(--alma-text-muted)]"
                >
                  <span className="tnum shrink-0 text-sm font-semibold">{horaCorta(t.hora)}</span>
                  <span className="min-w-0 flex-1 truncate text-sm">{t.paciente}</span>
                  <EstadoBadge estado={t.estado} />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
