'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  IconoAjustes,
  IconoCaja,
  IconoCalendario,
  IconoPacientes,
  IconoSol,
} from '@/components/icons';

const LINKS = [
  { href: '/hoy', label: 'Hoy', Icono: IconoSol },
  { href: '/agenda', label: 'Agenda', Icono: IconoCalendario },
  { href: '/pacientes', label: 'Pacientes', Icono: IconoPacientes },
  { href: '/caja', label: 'Caja', Icono: IconoCaja },
  { href: '/ajustes', label: 'Ajustes', Icono: IconoAjustes },
];

/** Barra de secciones fija abajo, solo en mobile. En md+ queda la nav de arriba. */
export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Secciones"
      className="fixed inset-x-0 bottom-0 z-[var(--alma-z-nav)] border-t border-[var(--alma-border)] bg-[var(--alma-bg)] pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <div className="mx-auto grid max-w-[960px] grid-cols-5">
        {LINKS.map(({ href, label, Icono }) => {
          const activo = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              aria-current={activo ? 'page' : undefined}
              className={`flex min-h-[52px] flex-col items-center justify-center gap-1 py-2 transition-colors duration-micro ease-alma ${
                activo
                  ? 'text-[var(--alma-action)]'
                  : 'text-[var(--alma-text-muted)] hover:text-[var(--alma-text)]'
              }`}
            >
              <Icono className="h-6 w-6" />
              <span className="text-[11px] font-semibold leading-none">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
