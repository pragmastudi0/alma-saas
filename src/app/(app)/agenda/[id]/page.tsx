import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createServerSupabase } from '@/lib/supabase/server';
import { EstadoBadge } from '@/components/estado-badge';
import { EstadoAcciones } from '@/components/estado-acciones';
import { BackLink } from '@/components/back-link';
import { horaCorta, pesos } from '@/lib/format';
import { etiquetaDia } from '@/lib/fecha';
import type { Estado } from '@/lib/turno';

function Dato({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-[.06em] text-[var(--alma-text-muted)]">{label}</dt>
      <dd className="mt-0.5 font-medium">{children}</dd>
    </div>
  );
}

export default async function TurnoDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = await createServerSupabase();
  const { data } = await supabase
    .from('alma_appointments')
    .select(
      'id, fecha, hora, duracion_min, precio, sena_monto, sena_pagada, estado, alma_patients(nombre, telefono)',
    )
    .eq('id', id)
    .maybeSingle();

  if (!data) notFound();

  const rel = data.alma_patients;
  const pac = (Array.isArray(rel) ? rel[0] : rel) as { nombre?: string; telefono?: string } | null;
  const estado = data.estado as Estado;
  const sena = Number(data.sena_monto);

  return (
    <main className="pb-10">
      <header className="mb-5 flex items-center gap-2">
        <BackLink href={`/agenda?d=${data.fecha}`} />
        <p className="text-xs font-semibold uppercase capitalize tracking-[.08em] text-[var(--alma-text-muted)]">
          {etiquetaDia(data.fecha)}
        </p>
      </header>

      <section className="rounded-lg border border-[var(--alma-border)] bg-[var(--alma-surface)] p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-xl font-semibold">{pac?.nombre ?? 'Paciente'}</p>
            {pac?.telefono ? (
              <p className="tnum mt-0.5 text-sm text-[var(--alma-text-muted)]">{pac.telefono}</p>
            ) : null}
          </div>
          <EstadoBadge estado={estado} />
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-y-4 border-t border-[var(--alma-border)] pt-4 text-sm">
          <Dato label="Hora">
            <span className="tnum">{horaCorta(data.hora)}</span>
          </Dato>
          <Dato label="Duración">
            <span className="tnum">{data.duracion_min}</span> min
          </Dato>
          <Dato label="Precio">
            <span className="tnum">{pesos(Number(data.precio))}</span>
          </Dato>
          <Dato label="Seña">
            {sena > 0 ? (
              <>
                <span className="tnum">{pesos(sena)}</span>{' '}
                <span className="text-[var(--alma-text-muted)]">
                  {data.sena_pagada ? '· cobrada' : '· pendiente'}
                </span>
              </>
            ) : (
              'Sin seña'
            )}
          </Dato>
        </dl>
      </section>

      <div className="mt-5">
        <EstadoAcciones
          id={data.id}
          estado={estado}
          wa={{
            telefono: pac?.telefono ?? '',
            nombre: pac?.nombre ?? 'Paciente',
            fecha: etiquetaDia(data.fecha),
            hora: horaCorta(data.hora),
          }}
        />
      </div>

      {estado === 'completado' && Number(data.precio) > 0 ? (
        <div className="mt-4">
          <Link
            href={`/caja/nuevo?tipo=ingreso&monto=${Number(data.precio)}&cat=Turno&desc=${encodeURIComponent(`Turno ${pac?.nombre ?? ''}`.trim())}`}
            className="text-sm font-semibold text-[var(--alma-action)] transition-opacity duration-micro ease-alma hover:opacity-80"
          >
            Registrar en caja
          </Link>
        </div>
      ) : null}

      <div className="mt-5">
        <Link
          href={`/agenda/${data.id}/editar`}
          className="text-sm font-semibold text-[var(--alma-text-muted)] transition-colors duration-micro ease-alma hover:text-[var(--alma-text)]"
        >
          Editar turno
        </Link>
      </div>
    </main>
  );
}
