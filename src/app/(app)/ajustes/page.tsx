import { createServerSupabase } from '@/lib/supabase/server';
import { AjustesForm } from '@/components/ajustes-form';
import { MpConexion } from '@/components/mp-conexion';
import { guardarAjustes } from './actions';

type Settings = {
  precio_default?: number;
  sena_default?: number;
  duracion_default?: number;
  alias_mp?: string | null;
};

const MENSAJES_MP: Record<string, { texto: string; error?: boolean }> = {
  conectado: { texto: 'Listo. Tu Mercado Pago quedó conectado.' },
  desconectado: { texto: 'Tu Mercado Pago quedó desconectado.' },
  en_uso: { texto: 'Esa cuenta de Mercado Pago ya está conectada a otro espacio.', error: true },
  error: { texto: 'No pudimos conectar tu Mercado Pago. Probá de nuevo.', error: true },
  sin_config: { texto: 'Falta configurar la aplicación de Mercado Pago en el server.', error: true },
};

export default async function AjustesPage({
  searchParams,
}: {
  searchParams: Promise<{ mp?: string }>;
}) {
  const { mp } = await searchParams;
  const supabase = await createServerSupabase();
  const [{ data: tenant }, { data: cuentaMp }] = await Promise.all([
    supabase.from('alma_tenants').select('nombre, profesion, settings').maybeSingle(),
    supabase.from('alma_mp_accounts').select('collector_id, connected_at').maybeSingle(),
  ]);

  const s = (tenant?.settings ?? {}) as Settings;
  const aviso = mp ? MENSAJES_MP[mp] : undefined;

  return (
    <main className="pb-10">
      <header className="mb-5">
        <h1 className="text-[22px] font-semibold">Ajustes</h1>
      </header>

      {aviso && (
        <p
          role={aviso.error ? 'alert' : 'status'}
          className={`mb-4 rounded-md px-3.5 py-2.5 text-sm font-medium ${
            aviso.error
              ? 'bg-[var(--error-soft)] text-[var(--error-600)]'
              : 'bg-[var(--success-soft)] text-[var(--success-600)]'
          }`}
        >
          {aviso.texto}
        </p>
      )}

      <section className="mb-6 rounded-lg border border-[var(--alma-border)] bg-[var(--alma-surface)] p-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[.08em] text-[var(--alma-text-muted)]">
          Cobros · Mercado Pago
        </p>
        <MpConexion cuenta={cuentaMp ?? null} />
      </section>

      <AjustesForm
        action={guardarAjustes}
        defaults={{
          nombre: tenant?.nombre ?? '',
          profesion: tenant?.profesion ?? '',
          precio_default: s.precio_default ?? 0,
          sena_default: s.sena_default ?? 0,
          duracion_default: s.duracion_default ?? 45,
          alias_mp: s.alias_mp ?? '',
        }}
      />
    </main>
  );
}
