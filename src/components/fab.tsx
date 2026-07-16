import Link from 'next/link';
import { IconoMas } from '@/components/icons';

/**
 * Botón flotante extendido: ícono + texto, para que se entienda qué crea.
 * En mobile flota arriba de la barra de secciones; en md+ va a la esquina.
 */
export function Fab({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="fixed right-4 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-[var(--alma-z-fab)] flex h-14 items-center gap-2 rounded-full bg-[var(--alma-action)] pl-5 pr-6 text-[var(--alma-on-action)] shadow-brand transition-transform duration-micro ease-alma hover:scale-105 active:scale-95 md:bottom-6 md:right-6"
    >
      <IconoMas className="h-5 w-5" />
      <span className="text-sm font-semibold">{label}</span>
    </Link>
  );
}
