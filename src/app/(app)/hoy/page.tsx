import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSessionContext } from '@/lib/tenant';
import { createServerSupabase } from '@/lib/supabase/server';
import { TurnoCard, type TurnoCardData } from '@/components/turno-card';
import { EmptyState } from '@/components/empty-state';
import { Fab } from '@/components/fab';
import { etiquetaDia, hoyISO } from '@/lib/fecha';
import { pesos } from '@/lib/format';

function nombrePaciente(rel: unknown): string {
  const p = Array.isArray(rel) ? rel[0] : rel;
  return (p as { nombre?: string } | null)?.nombre ?? 'Paciente';
}

export default async function HoyPage() {
  const ctx = await getSessionContext();
  if (!ctx) redirect('/login');

  const dia = hoyISO();
  const supabase = await createServerSupabase();
  const [{ data }, { data: caja }] = await Promise.all([
    supabase
      .from('alma_appointments')
      .select('id, hora, duracion_min, precio, estado, alma_patients(nombre)')
      .eq('fecha', dia)
      .order('hora', { ascending: true }),
    supabase.from('alma_cash_entries').select('tipo, monto').eq('fecha', dia),
  ]);

  const ingresosHoy = (caja ?? [])
    .filter((c) => c.tipo === 'ingreso')
    .reduce((s, c) => s + Number(c.monto), 0);
  const gastosHoy = (caja ?? [])
    .filter((c) => c.tipo === 'gasto')
    .reduce((s, c) => s + Number(c.monto), 0);
  const hayCaja = (caja ?? []).length > 0;

  const turnos: TurnoCardData[] = (data ?? []).map((r) => ({
    id: r.id,
    hora: r.hora,
    duracion_min: r.duracion_min,
    precio: Number(r.precio),
    estado: r.estado,
    paciente: nombrePaciente(r.alma_patients),
  }));

  // Para la cifra del hero contamos los que siguen en pie.
  const enPie = turnos.filter((t) => t.estado !== 'cancelado' && t.estado !== 'ausente');
  const n = enPie.length;

  return (
    <main className="pb-24">
      <header className="mb-5">
        <h1 className="voice text-[32px] leading-[1.12]">
          {ctx.nombre ? (
            <>
              Hola, <em className="text-[var(--alma-voice)]">{ctx.nombre}</em>
            </>
          ) : (
            'Hola'
          )}
        </h1>
        <p className="mt-1.5 text-xs font-medium uppercase capitalize tracking-[.08em] text-[var(--alma-text-muted)]">
          {etiquetaDia(dia)}
        </p>
      </header>

      <section className="rounded-xl bg-gradient-to-br from-verde-600 to-verde-700 p-6 text-white shadow-brand">
        <p className="text-xs font-semibold uppercase tracking-[.1em] opacity-75">Hoy tenés</p>
        <p className="voice mt-1 text-[52px] leading-[1.05] tnum">
          {n} <span className="text-[21px] opacity-85">{n === 1 ? 'turno' : 'turnos'}</span>
        </p>
        <div className="mt-3 border-t border-white/20 pt-3">
          <Link
            href="/agenda"
            className="text-[13.5px] font-semibold opacity-90 transition-opacity duration-micro ease-alma hover:opacity-100"
          >
            Ver la agenda completa
          </Link>
        </div>
      </section>

      <section className="mt-4 rounded-lg border border-[var(--alma-border)] bg-[var(--alma-surface)] p-4">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-[.08em] text-[var(--alma-text-muted)]">
            Caja de hoy
          </p>
          <Link
            href="/caja"
            className="text-xs font-semibold text-[var(--alma-action)] transition-opacity duration-micro ease-alma hover:opacity-80"
          >
            Ver caja
          </Link>
        </div>
        {hayCaja ? (
          <>
            <p className="tnum mt-1 text-[26px] font-semibold">{pesos(ingresosHoy - gastosHoy)}</p>
            <p className="mt-0.5 text-xs text-[var(--alma-text-muted)]">
              <span className="tnum">{pesos(ingresosHoy)}</span> ingresos ·{' '}
              <span className="tnum">{pesos(gastosHoy)}</span> gastos
            </p>
          </>
        ) : (
          <p className="mt-1 text-sm text-[var(--alma-text-muted)]">Todavía no registraste nada hoy.</p>
        )}
      </section>

      <section className="mt-6">
        {turnos.length === 0 ? (
          <EmptyState
            mensaje="Hoy no tenés turnos. Disfrutá el día."
            ctaHref={`/agenda/nuevo?d=${dia}`}
            ctaLabel="Agendar un turno"
          />
        ) : (
          <ul className="flex flex-col gap-2.5">
            {turnos.map((t) => (
              <li key={t.id}>
                <TurnoCard t={t} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <Fab href={`/agenda/nuevo?d=${dia}`} label="Nuevo turno" />
    </main>
  );
}
