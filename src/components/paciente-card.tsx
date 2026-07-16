import Link from 'next/link';

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
      <span className="min-w-0 truncate font-medium">{p.nombre}</span>
      {p.telefono ? (
        <span className="tnum shrink-0 text-sm text-[var(--alma-text-muted)]">{p.telefono}</span>
      ) : null}
    </Link>
  );
}
