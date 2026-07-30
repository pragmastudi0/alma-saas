import Link from 'next/link';
import { EstadoBadge } from '@/components/estado-badge';
import { IconoChevron } from '@/components/icons';
import { TurnoAccionesRapidas } from '@/components/turno-acciones-rapidas';
import { horaCorta, pesos } from '@/lib/format';
import { SENA_MODO_DEFAULT, type SenaModo } from '@/lib/sena';
import type { Estado } from '@/lib/turno';

export type TurnoCardData = {
  id: string;
  hora: string;
  duracion_min: number;
  precio: number;
  estado: Estado;
  paciente: string;
  empleado?: string;
};

export function TurnoCard({
  t,
  conAcciones = true,
  senaModo = SENA_MODO_DEFAULT,
}: {
  t: TurnoCardData;
  conAcciones?: boolean;
  senaModo?: SenaModo;
}) {
  return (
    <div className="rounded-lg border border-[var(--alma-border)] bg-[var(--alma-surface)] transition-colors duration-micro ease-alma hover:border-[var(--alma-text-muted)]">
      <Link href={`/agenda/${t.id}`} className="flex items-center gap-3 p-3.5">
        <div className="tnum w-14 shrink-0 text-[15px] font-semibold">{horaCorta(t.hora)}</div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{t.paciente}</p>
          <p className="mt-0.5 text-xs text-[var(--alma-text-muted)]">
            <span className="tnum">{t.duracion_min}</span> min ·{' '}
            <span className="tnum">{pesos(t.precio)}</span>
            {t.empleado && <span> · {t.empleado}</span>}
          </p>
        </div>
        <EstadoBadge estado={t.estado} />
        <IconoChevron dir="right" className="h-4 w-4 shrink-0 text-[var(--alma-text-muted)]" />
      </Link>
      {conAcciones && (t.estado === 'pendiente_sena' || t.estado === 'confirmado') && (
        <div className="border-t border-[var(--alma-border)] px-3.5 py-2.5">
          <TurnoAccionesRapidas id={t.id} estado={t.estado} senaModo={senaModo} />
        </div>
      )}
    </div>
  );
}
