import Link from 'next/link';
import { EstadoBadge } from '@/components/estado-badge';
import { horaCorta, pesos } from '@/lib/format';
import type { Estado } from '@/lib/turno';

export type TurnoCardData = {
  id: string;
  hora: string;
  duracion_min: number;
  precio: number;
  estado: Estado;
  paciente: string;
};

export function TurnoCard({ t }: { t: TurnoCardData }) {
  return (
    <Link
      href={`/agenda/${t.id}`}
      className="flex items-center gap-3 rounded-lg border border-[var(--alma-border)] bg-[var(--alma-surface)] p-3.5 transition-colors duration-micro ease-alma hover:border-[var(--alma-text-muted)]"
    >
      <div className="tnum w-14 shrink-0 text-[15px] font-semibold">{horaCorta(t.hora)}</div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{t.paciente}</p>
        <p className="mt-0.5 text-xs text-[var(--alma-text-muted)]">
          <span className="tnum">{t.duracion_min}</span> min · <span className="tnum">{pesos(t.precio)}</span>
        </p>
      </div>
      <EstadoBadge estado={t.estado} />
    </Link>
  );
}
