import Link from 'next/link';

export function BackLink({ href, label = 'Volver' }: { href: string; label?: string }) {
  return (
    <Link
      href={href}
      aria-label={label}
      className="-ml-2 rounded-md p-2 text-[var(--alma-text-muted)] transition-colors duration-micro ease-alma hover:text-[var(--alma-text)]"
    >
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
        <path d="M15 18l-6-6 6-6" />
      </svg>
    </Link>
  );
}
