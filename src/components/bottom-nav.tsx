'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NAV_ITEMS } from '@/components/nav-items';

/**
 * Barra de secciones fija abajo, solo en mobile. En md+ va el sidebar.
 *
 * No es `position: fixed`: es el último tramo del armazón de alto fijo que
 * arma el layout (ver `(app)/layout.tsx`). Así no puede moverse con el scroll
 * ni con la barra del navegador. El padding de abajo respeta el área segura
 * (la franja del indicador de inicio en los iPhone).
 */
export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Secciones"
      className="z-[var(--alma-z-nav)] shrink-0 border-t border-[var(--alma-border)] bg-[var(--alma-bg)] pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <div className="grid grid-cols-6">
        {NAV_ITEMS.map(({ href, label, Icono }) => {
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
