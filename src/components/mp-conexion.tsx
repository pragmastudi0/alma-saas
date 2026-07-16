import { desconectarMp } from '@/app/(app)/ajustes/actions';

/** Estado de la conexión con Mercado Pago en Ajustes (server component). */
export function MpConexion({
  cuenta,
}: {
  cuenta: { collector_id: number; connected_at: string } | null;
}) {
  if (!cuenta) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-sm text-[var(--alma-text-muted)]">
          Conectá tu cuenta y las señas te llegan directo, con el turno confirmándose solo.
        </p>
        <a
          href="/api/mp/conectar"
          className="flex w-full items-center justify-center rounded-md bg-[var(--alma-action)] px-4 py-3 font-semibold text-[var(--alma-on-action)] shadow-brand transition-opacity duration-micro ease-alma hover:opacity-90"
        >
          Conectar Mercado Pago
        </a>
      </div>
    );
  }

  const desde = new Date(cuenta.connected_at).toLocaleDateString('es-AR');

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center gap-2">
        <span className="rounded-full bg-[var(--success-soft)] px-2.5 py-1 text-xs font-semibold text-[var(--success-600)]">
          Conectado
        </span>
        <p className="text-sm text-[var(--alma-text-muted)]">
          Cuenta <span className="tnum font-semibold">{cuenta.collector_id}</span> · desde{' '}
          <span className="tnum">{desde}</span>
        </p>
      </div>
      <p className="text-sm text-[var(--alma-text-muted)]">
        Las señas entran a tu Mercado Pago y el turno se confirma solo al acreditarse.
      </p>
      <form action={desconectarMp}>
        <button
          type="submit"
          className="rounded-md border border-[var(--alma-border)] px-3.5 py-2 text-sm font-semibold text-[var(--alma-text-muted)] transition-colors duration-micro ease-alma hover:text-[var(--alma-text)]"
        >
          Desconectar
        </button>
      </form>
    </div>
  );
}
