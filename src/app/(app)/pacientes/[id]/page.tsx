import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createServerSupabase } from '@/lib/supabase/server';
import { EstadoBadge } from '@/components/estado-badge';
import { BackLink } from '@/components/back-link';
import { WhatsAppLink } from '@/components/whatsapp-link';
import { EliminarPacienteBoton } from '@/components/eliminar-paciente-boton';
import { horaCorta } from '@/lib/format';
import { etiquetaDia } from '@/lib/fecha';
import { waLink } from '@/lib/whatsapp';
import type { Estado } from '@/lib/turno';

type TurnoRow = {
  id: string;
  fecha: string;
  hora: string;
  estado: Estado;
  reprogramado_a?: string | null;
};

export default async function PacienteDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createServerSupabase();
  const { data: p } = await supabase
    .from('alma_patients')
    .select('id, nombre, apellido, telefono, email, fecha_nacimiento, notas')
    .eq('id', id)
    .maybeSingle();

  if (!p) notFound();

  const nombreCompleto = [p.nombre, p.apellido].filter(Boolean).join(' ').trim();
  // 'YYYY-MM-DD' → 'DD/MM/YYYY' sin construir Date (evita corrimientos de zona).
  const nacimiento = p.fecha_nacimiento
    ? p.fecha_nacimiento.split('-').reverse().join('/')
    : '';

  const { data: turnos } = await supabase
    .from('alma_appointments')
    .select('id, fecha, hora, estado, reprogramado_a')
    .eq('patient_id', id)
    .order('fecha', { ascending: true })
    .order('hora', { ascending: false })
    .limit(50);

  const historial = (turnos ?? []) as TurnoRow[];

  return (
    <main className="pb-10">
      <header className="mb-5 flex items-center gap-2">
        <BackLink href="/pacientes" />
        <h1 className="min-w-0 truncate text-[22px] font-semibold">{nombreCompleto}</h1>
      </header>

      <section className="rounded-lg border border-[var(--alma-border)] bg-[var(--alma-surface)] p-5">
        <dl className="grid grid-cols-1 gap-3 text-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-[var(--alma-text-muted)]">Teléfono</dt>
            <dd className="tnum font-medium">{p.telefono || '—'}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-[var(--alma-text-muted)]">Correo</dt>
            <dd className="min-w-0 truncate font-medium">{p.email || '—'}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-[var(--alma-text-muted)]">Nacimiento</dt>
            <dd className="tnum font-medium">{nacimiento || '—'}</dd>
          </div>
        </dl>

        {p.notas ? (
          <div className="mt-4 border-t border-[var(--alma-border)] pt-4">
            <p className="mb-1 text-xs uppercase tracking-[.06em] text-[var(--alma-text-muted)]">
              Notas
            </p>
            <p className="whitespace-pre-wrap text-sm">{p.notas}</p>
          </div>
        ) : null}
      </section>

      {p.telefono ? (
        <div className="mt-4">
          <WhatsAppLink href={waLink(p.telefono, `Hola ${p.nombre}!`)}>
            Escribir por WhatsApp
          </WhatsAppLink>
        </div>
      ) : null}

      <div className="mt-4 flex items-center gap-4">
        <Link
          href={`/agenda/nuevo?p=${p.id}`}
          className="text-sm font-semibold text-[var(--alma-action)] transition-opacity duration-micro ease-alma hover:opacity-80"
        >
          Nuevo turno
        </Link>
        <Link
          href={`/pacientes/${p.id}/editar`}
          className="text-sm font-semibold text-[var(--alma-text-muted)] transition-colors duration-micro ease-alma hover:text-[var(--alma-text)]"
        >
          Editar
        </Link>
        <EliminarPacienteBoton id={p.id} nombre={nombreCompleto || 'este paciente'} />
      </div>

      <section className="mt-6">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-[.08em] text-[var(--alma-text-muted)]">
          Turnos
        </h2>
        {historial.length === 0 ? (
          <p className="text-sm text-[var(--alma-text-muted)]">Todavía no tiene turnos.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {historial.map((t) => {
              const puedReprogramar = (t.estado === 'cancelado' || t.estado === 'ausente') && !t.reprogramado_a;
              return (
                <li key={t.id}>
                  {puedReprogramar ? (
                    <Link
                      href={`/agenda/nuevo?p=${p.id}&origen=${t.id}`}
                      className="flex items-center justify-between gap-3 rounded-lg border border-verde-600 bg-verde-50 px-3.5 py-3 font-semibold text-verde-700 transition-colors duration-micro ease-alma hover:bg-verde-100"
                    >
                      <span className="text-sm">
                        {etiquetaDia(t.fecha)} · <span className="tnum">{horaCorta(t.hora)}</span> · Reprogramar
                      </span>
                      <EstadoBadge estado={t.estado} />
                    </Link>
                  ) : (
                    <Link
                      href={`/agenda/${t.id}`}
                      className="flex items-center justify-between gap-3 rounded-lg border border-[var(--alma-border)] bg-[var(--alma-surface)] px-3.5 py-3 transition-colors duration-micro ease-alma hover:border-[var(--alma-text-muted)]"
                    >
                      <span className="text-sm capitalize">
                        {etiquetaDia(t.fecha)} · <span className="tnum">{horaCorta(t.hora)}</span>
                      </span>
                      <EstadoBadge estado={t.estado} />
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}
