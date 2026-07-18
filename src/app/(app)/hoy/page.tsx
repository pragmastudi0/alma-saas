import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSessionContext } from '@/lib/tenant';
import { createServerSupabase } from '@/lib/supabase/server';
import { TurnoCard, type TurnoCardData } from '@/components/turno-card';
import { EstadoBadge } from '@/components/estado-badge';
import { EmptyState } from '@/components/empty-state';
import { Fab, AccionNueva } from '@/components/fab';
import { nombrePaciente } from '@/lib/caja';
import { etiquetaDia, hoyISO } from '@/lib/fecha';
import { pesos } from '@/lib/format';

export default async function HoyPage() {
  const ctx = await getSessionContext();
  if (!ctx) redirect('/login');

  const dia = hoyISO();
  const supabase = await createServerSupabase();
  const [{ data }, { data: caja }, { data: futuros }] = await Promise.all([
    supabase
      .from('alma_appointments')
      .select('id, hora, duracion_min, precio, estado, alma_patients(nombre, apellido)')
      .eq('fecha', dia)
      .order('hora', { ascending: true }),
    supabase.from('alma_cash_entries').select('tipo, monto').eq('fecha', dia),
    supabase
      .from('alma_appointments')
      .select('id, fecha, hora, estado, alma_patients(nombre, apellido)')
      .gt('fecha', dia)
      .not('estado', 'in', '("cancelado","ausente")')
      .order('fecha', { ascending: true })
      .order('hora', { ascending: true })
      .limit(6),
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
    paciente: nombrePaciente(r.alma_patients) || 'Paciente',
  }));

  const proximos = (futuros ?? []).map((r) => ({
    id: r.id,
    fecha: r.fecha,
    hora: String(r.hora).slice(0, 5),
    estado: r.estado as TurnoCardData['estado'],
    paciente: nombrePaciente(r.alma_patients) || 'Paciente',
  }));

  // Para la cifra del hero contamos los que siguen en pie.
  const enPie = turnos.filter((t) => t.estado !== 'cancelado' && t.estado !== 'ausente');
  const n = enPie.length;

  return (
    <main className="pb-24 md:pb-8">
      <header className="mb-5 flex items-start justify-between gap-3">
        <div>
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
        </div>
        <AccionNueva href={`/agenda/nuevo?d=${dia}`} label="Nuevo turno" />
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
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

      <section className="rounded-lg border border-[var(--alma-border)] bg-[var(--alma-surface)] p-4">
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
      </div>

      <section className="mt-6">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-[.08em] text-[var(--alma-text-muted)]">
          Turnos de hoy
        </h2>
        {turnos.length === 0 ? (
          <EmptyState
            mensaje="Hoy no tenés turnos. Disfrutá el día."
            ctaHref={`/agenda/nuevo?d=${dia}`}
            ctaLabel="Agendar un turno"
          />
        ) : (
          <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {turnos.map((t) => (
              <li key={t.id}>
                <TurnoCard t={t} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {proximos.length > 0 && (
        <section className="mt-8">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-[.08em] text-[var(--alma-text-muted)]">
              Próximos turnos
            </h2>
            <Link
              href="/agenda"
              className="text-xs font-semibold text-[var(--alma-action)] transition-opacity duration-micro ease-alma hover:opacity-80"
            >
              Ver agenda
            </Link>
          </div>
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {proximos.map((t) => (
              <li key={t.id}>
                <Link
                  href={`/agenda/${t.id}`}
                  className="flex items-center gap-3 rounded-lg border border-[var(--alma-border)] bg-[var(--alma-surface)] px-3.5 py-3 transition-colors duration-micro ease-alma hover:border-[var(--alma-text-muted)]"
                >
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">{t.paciente}</span>
                  <span className="shrink-0 text-xs capitalize text-[var(--alma-text-muted)]">
                    {etiquetaDia(t.fecha)} · <span className="tnum">{t.hora}</span>
                  </span>
                  <EstadoBadge estado={t.estado} />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <Fab href={`/agenda/nuevo?d=${dia}`} label="Nuevo turno" />
    </main>
  );
}
