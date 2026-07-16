import Link from 'next/link';
import { semanasDelMes } from '@/lib/fecha';

const CABECERA = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

/**
 * Grilla del mes: cada día linkea a su vista día y muestra
 * cuántos turnos en pie tiene (los cancelados/ausentes no cuentan).
 */
export function MesGrid({
  ym,
  conteos,
  hoy,
}: {
  ym: string;
  conteos: Record<string, number>;
  hoy: string;
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
              href={`/agenda?d=${iso}`}
              className={`flex min-h-[56px] flex-col items-center gap-1 rounded-md border pt-1.5 transition-colors duration-micro ease-alma hover:border-[var(--alma-text-muted)] ${
                iso === hoy
                  ? 'border-[var(--alma-action)] bg-[var(--alma-surface)]'
                  : 'border-[var(--alma-border)] bg-[var(--alma-surface)]'
              }`}
            >
              <span className={`tnum text-sm ${iso === hoy ? 'font-semibold' : 'font-medium'}`}>
                {Number(iso.slice(8))}
              </span>
              {conteos[iso] ? (
                <span className="tnum rounded-full bg-[var(--alma-action-soft)] px-1.5 text-[11px] font-semibold leading-[18px] text-[var(--alma-action)]">
                  {conteos[iso]}
                </span>
              ) : null}
            </Link>
          ) : (
            <span key={`v${i}`} aria-hidden="true" />
          ),
        )}
      </div>
    </div>
  );
}
