import { createServerSupabase } from '@/lib/supabase/server';
import { getSessionContext } from '@/lib/tenant';
import { cargarCumpleanos } from '@/lib/cumpleanos';
import { PLANTILLA_CUMPLEANOS_DEFAULT } from '@/lib/whatsapp';
import { CumpleanosCard } from '@/components/cumpleanos-card';
import { EmptyState } from '@/components/empty-state';
import { redirect } from 'next/navigation';

export default async function CumpleanosPage() {
  const ctx = await getSessionContext();
  if (!ctx) redirect('/login');
  const supabase = await createServerSupabase();
  const { data: tenant, error } = await supabase.from('alma_tenants').select('timezone, settings').eq('id', ctx.tenantId).single();
  if (error || !tenant) throw new Error('No pudimos cargar los cumpleaños.');
  const cumpleanos = await cargarCumpleanos(supabase, ctx.tenantId, tenant.timezone);
  const settings = tenant.settings as { plantilla_cumpleanos?: string | null };
  const plantilla = settings.plantilla_cumpleanos ?? PLANTILLA_CUMPLEANOS_DEFAULT;
  const hoy = cumpleanos.filter((c) => c.dias === 0);
  const proximos = cumpleanos.filter((c) => c.dias > 0);

  return (
    <main className="pb-24 md:pb-8">
      <h1 className="mb-5 text-[22px] font-semibold">Cumpleaños</h1>
      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-[.08em] text-[var(--alma-text-muted)]">Hoy</h2>
        {hoy.length ? <ul className="grid gap-2.5 sm:grid-cols-2">{hoy.map((c) => <CumpleanosCard key={c.id} cumple={c} plantilla={plantilla} />)}</ul> : <EmptyState mensaje="Hoy no hay cumpleaños." />}
      </section>
      <section className="mt-8">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-[.08em] text-[var(--alma-text-muted)]">Próximos 30 días</h2>
        {proximos.length ? <ul className="grid gap-2.5 sm:grid-cols-2">{proximos.map((c) => <CumpleanosCard key={c.id} cumple={c} plantilla={plantilla} />)}</ul> : <EmptyState mensaje="No hay cumpleaños en los próximos 30 días." />}
      </section>
    </main>
  );
}
