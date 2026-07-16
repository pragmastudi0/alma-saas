import Link from 'next/link';
import { NOMBRES_DIAS } from '@/lib/disponibilidad';
import { diaSemanaDe } from '@/lib/fecha';

/** Tira horizontal de próximos días para elegir cuándo reservar. */
export function DiaPicker({
  dias,
  activo,
  diasQueAtiende,
}: {
  dias: string[]; // fechas ISO
  activo: string;
  diasQueAtiende: Set<number>;
}) {
  return (
    <nav aria-label="Elegí el día" className="-mx-5 overflow-x-auto px-5">
      <div className="flex gap-2 pb-1">
        {dias.map((iso) => {
          const dow = diaSemanaDe(iso);
          const atiende = diasQueAtiende.has(dow);
          const esActivo = iso === activo;
          const base =
            'flex w-14 shrink-0 flex-col items-center gap-0.5 rounded-md border py-2 transition-colors duration-micro ease-alma';

          if (!atiende) {
            return (
              <span
                key={iso}
                className={`${base} border-transparent text-[var(--alma-text-muted)] opacity-40`}
              >
                <span className="text-[11px] font-semibold uppercase">
                  {NOMBRES_DIAS[dow].slice(0, 3)}
                </span>
                <span className="tnum text-[15px] font-medium">{Number(iso.slice(8))}</span>
              </span>
            );
          }

          return (
            <Link
              key={iso}
              href={`?d=${iso}`}
              aria-current={esActivo ? 'date' : undefined}
              className={`${base} ${
                esActivo
                  ? 'border-[var(--alma-action)] bg-[var(--alma-action)] text-[var(--alma-on-action)]'
                  : 'border-[var(--alma-border)] bg-[var(--alma-surface)] hover:border-[var(--alma-text-muted)]'
              }`}
            >
              <span className="text-[11px] font-semibold uppercase">
                {NOMBRES_DIAS[dow].slice(0, 3)}
              </span>
              <span className="tnum text-[15px] font-semibold">{Number(iso.slice(8))}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
