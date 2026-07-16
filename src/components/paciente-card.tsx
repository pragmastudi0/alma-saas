import Link from 'next/link';
import { IconoChevron } from '@/components/icons';

export type PacienteCardData = {
  id: string;
  nombre: string;
  telefono: string;
};

export function PacienteCard({ p }: { p: PacienteCardData }) {
  return (
    <Link
      href={`/pacientes/${p.id}`}
      className="flex items-center justify-between gap-3 rounded-lg border border-[var(--alma-border)] bg-[var(--alma-surface)] p-3.5 transition-colors duration-micro ease-alma hover:border-[var(--alma-text-muted)]"
    >
      <span className="min-w-0 flex-1 truncate font-medium">{p.nombre}</span>
      {p.telefono ? (
        <span className="tnum shrink-0 text-sm text-[var(--alma-text-muted)]">{p.telefono}</span>
      ) : null}
      <IconoChevron dir="right" className="h-4 w-4 shrink-0 text-[var(--alma-text-muted)]" />
    </Link>
  );
}
