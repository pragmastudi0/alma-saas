import Link from 'next/link';
import { EstadoBadge } from '@/components/estado-badge';
import { semanasDelMes, etiquetaDia } from '@/lib/fecha';
import { horaCorta } from '@/lib/format';
import type { MesTurno } from '@/components/mes-agenda';

const CABECERA = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

/**
 * Vista mensual estilo calendario: grilla de días con un punto en los que
 * tienen turnos; al elegir un día se listan sus turnos debajo (con link al
 * detalle para cancelar). El día elegido viaja en la URL (?d=).
 */
export function MesCalendario({
  ym,
  hoy,
  seleccionado,
  diasConTurno,
  turnosDelDia,
}: {
  ym: string;
  hoy: string;
  seleccionado: string;
  diasConTurno: Set<string>;
  turnosDelDia: MesTurno[];
}) {
  const semanas = semanasDelMes(ym);

  return (
    <div>
      <div className="grid grid-cols-7 text-center">
        {CABECERA.map((l, i) => (
          <span
            key={i}
            className="pb-2 text-[11px] font-semibold uppercase tracking-[.08em] text-[var(--alma-text-muted)]"
          >
            {l}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {semanas.flat().map((iso, i) =>
          iso ? (
            <Link
              key={iso}
              href={`/agenda?v=mes&mv=cal&m=${ym}&d=${iso}`}
              scroll={false}
              aria-current={iso === seleccionado ? 'date' : undefined}
              className={`flex min-h-[52px] flex-col items-center justify-center gap-1 rounded-md border text-sm transition-colors duration-micro ease-alma md:min-h-[64px] ${
                iso === seleccionado
                  ? 'border-[var(--alma-action)] bg-[var(--alma-action)] text-[var(--alma-on-action)]'
                  : iso === hoy
                    ? 'border-[var(--alma-action)] bg-[var(--alma-surface)]'
                    : 'border-[var(--alma-border)] bg-[var(--alma-surface)] hover:border-[var(--alma-text-muted)]'
              }`}
            >
              <span className={`tnum ${iso === seleccionado || iso === hoy ? 'font-semibold' : 'font-medium'}`}>
                {Number(iso.slice(8))}
              </span>
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  !diasConTurno.has(iso)
                    ? 'bg-transparent'
                    : iso === seleccionado
                      ? 'bg-[var(--alma-on-action)]'
                      : 'bg-[var(--alma-action)]'
                }`}
              />
            </Link>
          ) : (
            <span key={`v${i}`} aria-hidden="true" />
          ),
        )}
      </div>

      <div className="mt-5">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[.08em] text-[var(--alma-text-muted)]">
          <span className="capitalize">{etiquetaDia(seleccionado)}</span>
          {seleccionado === hoy ? ' · hoy' : ''}
        </p>
        {turnosDelDia.length === 0 ? (
          <p className="text-sm text-[var(--alma-text-muted)]">No hay turnos este día.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {turnosDelDia.map((t) => (
              <li key={t.id}>
                <Link
                  href={`/agenda/${t.id}`}
                  className="flex items-center gap-3 rounded-lg border border-[var(--alma-border)] bg-[var(--alma-surface)] px-3.5 py-3 transition-colors duration-micro ease-alma hover:border-[var(--alma-text-muted)]"
                >
                  <span className="tnum shrink-0 text-sm font-semibold">{horaCorta(t.hora)}</span>
                  <span className="min-w-0 flex-1 truncate text-sm">{t.paciente}</span>
                  {t.empleado && <span className="shrink-0 text-xs text-[var(--alma-text-muted)]">{t.empleado}</span>}
                  <EstadoBadge estado={t.estado} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
