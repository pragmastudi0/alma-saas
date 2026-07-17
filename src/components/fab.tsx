import Link from 'next/link';
import { IconoMas } from '@/components/icons';

/**
 * Botón flotante extendido: ícono + texto, para que se entienda qué crea.
 * Solo en mobile (flota arriba de la barra de secciones). En desktop la acción
 * de crear vive en el header de cada pantalla (ver AccionNueva).
 */
export function Fab({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="fixed right-4 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-[var(--alma-z-fab)] flex h-14 items-center gap-2 rounded-full bg-[var(--alma-action)] pl-5 pr-6 text-[var(--alma-on-action)] shadow-brand transition-transform duration-micro ease-alma hover:scale-105 active:scale-95 md:hidden"
    >
      <IconoMas className="h-5 w-5" />
      <span className="text-sm font-semibold">{label}</span>
    </Link>
  );
}

/**
 * Acción de crear para el header de una pantalla, visible solo en desktop
 * (en mobile la cubre el Fab). Mismo destino, tratamiento de botón sólido.
 */
export function AccionNueva({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="hidden h-10 items-center gap-2 rounded-full bg-[var(--alma-action)] pl-4 pr-5 text-sm font-semibold text-[var(--alma-on-action)] shadow-brand transition-transform duration-micro ease-alma hover:scale-105 active:scale-95 md:inline-flex"
    >
      <IconoMas className="h-4 w-4" />
      {label}
    </Link>
  );
}
