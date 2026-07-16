import Link from 'next/link';
import { IconoChevron } from '@/components/icons';

export function DiaNav({
  prevHref,
  nextHref,
  titulo,
  subtitulo,
  prevLabel = 'Día anterior',
  nextLabel = 'Día siguiente',
}: {
  prevHref: string;
  nextHref: string;
  titulo: string;
  subtitulo?: string | null;
  prevLabel?: string;
  nextLabel?: string;
}) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <Link
        href={prevHref}
        aria-label={prevLabel}
        className="rounded-md p-2 text-[var(--alma-text-muted)] transition-colors duration-micro ease-alma hover:text-[var(--alma-text)]"
      >
        <IconoChevron dir="left" className="h-5 w-5" />
      </Link>
      <div className="text-center">
        {subtitulo && (
          <p className="text-[11px] font-semibold uppercase tracking-[.1em] text-[var(--alma-action)]">
            {subtitulo}
          </p>
        )}
        <p className="text-[17px] font-semibold capitalize leading-tight">{titulo}</p>
      </div>
      <Link
        href={nextHref}
        aria-label={nextLabel}
        className="rounded-md p-2 text-[var(--alma-text-muted)] transition-colors duration-micro ease-alma hover:text-[var(--alma-text)]"
      >
        <IconoChevron dir="right" className="h-5 w-5" />
      </Link>
    </div>
  );
}
