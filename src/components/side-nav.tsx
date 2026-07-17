'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Flor } from '@/components/flor';
import { NAV_ITEMS } from '@/components/nav-items';
import { logout } from '@/app/(auth)/actions';

/** Navegación lateral fija, solo en desktop (md+). En mobile va la barra inferior. */
export function SideNav() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 hidden h-dvh w-[220px] shrink-0 flex-col border-r border-[var(--alma-border)] px-4 py-5 md:flex">
      <div className="mb-8 flex items-center gap-2 px-2">
        <Flor className="h-[21px] w-[21px] text-verde-600" />
        <span className="voice text-2xl leading-none">alma</span>
      </div>

      <nav aria-label="Secciones" className="flex flex-col gap-1">
        {NAV_ITEMS.map(({ href, label, Icono }) => {
          const activo = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              aria-current={activo ? 'page' : undefined}
              className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-semibold transition-colors duration-micro ease-alma ${
                activo
                  ? 'bg-[var(--alma-action-soft)] text-[var(--alma-action)]'
                  : 'text-[var(--alma-text-muted)] hover:bg-[var(--alma-surface)] hover:text-[var(--alma-text)]'
              }`}
            >
              <Icono className="h-5 w-5" />
              {label}
            </Link>
          );
        })}
      </nav>

      <form action={logout} className="mt-auto">
        <button
          type="submit"
          className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-semibold text-[var(--alma-text-muted)] transition-colors duration-micro ease-alma hover:text-[var(--alma-text)]"
        >
          Salir
        </button>
      </form>
    </aside>
  );
}
