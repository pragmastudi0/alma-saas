import type { Estado } from '@/lib/turno';

const MAP: Record<Estado, { label: string; cls: string }> = {
  pendiente_sena: {
    label: 'Falta seña',
    cls: 'bg-[var(--warning-soft)] text-[var(--warning-600)]',
  },
  confirmado: {
    label: 'Confirmado',
    cls: 'bg-[var(--alma-action-soft)] text-[var(--alma-action)]',
  },
  completado: {
    label: 'Completado',
    cls: 'bg-[var(--alma-surface-2)] text-[var(--alma-text-muted)]',
  },
  cancelado: {
    label: 'Cancelado',
    cls: 'bg-[var(--error-soft)] text-[var(--error-600)]',
  },
  ausente: {
    label: 'Ausente',
    cls: 'bg-[var(--alma-surface-2)] text-[var(--error-600)]',
  },
};

export function EstadoBadge({ estado }: { estado: Estado }) {
  const { label, cls } = MAP[estado];
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${cls}`}
    >
      {label}
    </span>
  );
}
