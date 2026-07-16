function IconoChat() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 11.5a8.5 8.5 0 0 1-12.5 7.5L3 20l1.5-4.5A8.5 8.5 0 1 1 21 11.5Z" />
    </svg>
  );
}

/** Link a wa.me como botón. Presentacional; si href es null no renderiza nada. */
export function WhatsAppLink({
  href,
  children,
  variant = 'ghost',
}: {
  href: string | null;
  children: React.ReactNode;
  variant?: 'primary' | 'ghost';
}) {
  if (!href) return null;

  const cls =
    variant === 'primary'
      ? 'bg-[var(--alma-action)] text-[var(--alma-on-action)] shadow-brand'
      : 'border border-[var(--alma-border)] text-[var(--alma-text-muted)] hover:text-[var(--alma-text)]';

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`flex w-full items-center justify-center gap-2 rounded-md px-4 py-3 font-semibold transition-colors duration-micro ease-alma ${cls}`}
    >
      <IconoChat />
      {children}
    </a>
  );
}
