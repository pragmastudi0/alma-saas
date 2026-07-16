import Link from 'next/link';

function Chevron({ dir }: { dir: 'left' | 'right' }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={dir === 'left' ? 'M15 18l-6-6 6-6' : 'M9 18l6-6-6-6'} />
    </svg>
  );
}

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
        <Chevron dir="left" />
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
        <Chevron dir="right" />
      </Link>
    </div>
  );
}
