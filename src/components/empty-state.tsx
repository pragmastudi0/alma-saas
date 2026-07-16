import Link from 'next/link';

/** Estado vacío con CTA opcional: además de decir que no hay nada, invita a crear. */
export function EmptyState({
  mensaje,
  ctaHref,
  ctaLabel,
}: {
  mensaje: string;
  ctaHref?: string;
  ctaLabel?: string;
}) {
  return (
    <div className="rounded-lg border border-dashed border-[var(--alma-border)] p-8 text-center">
      <p className="text-sm text-[var(--alma-text-muted)]">{mensaje}</p>
      {ctaHref && ctaLabel && (
        <Link
          href={ctaHref}
          className="mt-4 inline-flex rounded-md bg-[var(--alma-action)] px-4 py-3 text-sm font-semibold text-[var(--alma-on-action)] shadow-brand transition-opacity duration-micro ease-alma hover:opacity-90"
        >
          {ctaLabel}
        </Link>
      )}
    </div>
  );
}
