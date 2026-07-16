import Link from 'next/link';

export function Fab({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      aria-label={label}
      className="fixed bottom-6 right-6 z-[var(--alma-z-fab)] flex h-14 w-14 items-center justify-center rounded-full bg-[var(--alma-action)] text-[var(--alma-on-action)] shadow-brand transition-transform duration-micro ease-alma hover:scale-105 active:scale-95"
    >
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        aria-hidden="true"
      >
        <path d="M12 5v14M5 12h14" />
      </svg>
    </Link>
  );
}
