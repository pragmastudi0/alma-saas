'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS = [
  { href: '/hoy', label: 'Hoy' },
  { href: '/agenda', label: 'Agenda' },
  { href: '/pacientes', label: 'Pacientes' },
  { href: '/caja', label: 'Caja' },
  { href: '/ajustes', label: 'Ajustes' },
];

export function AppNav() {
  const pathname = usePathname();

  return (
    <nav className="mb-5 flex gap-5 overflow-x-auto text-sm font-semibold">
      {LINKS.map((l) => {
        const activo = pathname === l.href || pathname.startsWith(l.href + '/');
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={activo ? 'page' : undefined}
            className={`shrink-0 border-b-2 pb-1 transition-colors duration-micro ease-alma ${
              activo
                ? 'border-[var(--alma-action)] text-[var(--alma-text)]'
                : 'border-transparent text-[var(--alma-text-muted)] hover:text-[var(--alma-text)]'
            }`}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
