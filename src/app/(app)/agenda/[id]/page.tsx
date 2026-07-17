import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createServerSupabase } from '@/lib/supabase/server';
import { EstadoBadge } from '@/components/estado-badge';
import { EstadoAcciones } from '@/components/estado-acciones';
import type { CobroSena } from '@/components/sena-link-boton';
import { BackLink } from '@/components/back-link';
import { nombrePaciente } from '@/lib/caja';
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
  const [{ data }, { data: cuentaMp }, { data: tenant }] = await Promise.all([
    supabase
      .from('alma_appointments')
      .select(
        'id, fecha, hora, duracion_min, precio, sena_monto, sena_pagada, estado, mp_init_point, alma_patients(nombre, apellido, telefono)',
      )
      .eq('id', id)
      .maybeSingle(),
    supabase.from('alma_mp_accounts').select('tenant_id').maybeSingle(),
    supabase.from('alma_tenants').select('settings').maybeSingle(),
  ]);

  if (!data) notFound();

  const rel = data.alma_patients;
  const pac = (Array.isArray(rel) ? rel[0] : rel) as { nombre?: string; telefono?: string } | null;
  const nombreCompleto = nombrePaciente(rel) || 'Paciente';
  const estado = data.estado as Estado;
  const sena = Number(data.sena_monto);

  // Cómo cobra la seña este profesional: MP conectado > alias > nada.
  const alias = ((tenant?.settings as { alias_mp?: string | null } | null)?.alias_mp ?? '').trim();
  const cobro: CobroSena = cuentaMp
    ? { modo: 'mp', initPoint: data.mp_init_point ?? null }
    : alias
      ? { modo: 'alias', alias, monto: pesos(sena) }
      : { modo: 'ninguno' };

  return (
    <main className="pb-10 md:max-w-2xl">
      <header className="mb-5 flex items-center gap-2">
        <BackLink href={`/agenda?d=${data.fecha}`} />
        <p className="text-xs font-semibold uppercase capitalize tracking-[.08em] text-[var(--alma-text-muted)]">
          {etiquetaDia(data.fecha)}
        </p>
      </header>

      <section className="rounded-lg border border-[var(--alma-border)] bg-[var(--alma-surface)] p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-xl font-semibold">{nombreCompleto}</p>
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
          cobro={cobro}
          wa={{
            telefono: pac?.telefono ?? '',
            nombre: nombreCompleto,
            fecha: etiquetaDia(data.fecha),
            hora: horaCorta(data.hora),
          }}
        />
      </div>

      {estado === 'completado' && Number(data.precio) > 0 ? (
        <p className="mt-4 text-sm text-[var(--alma-text-muted)]">
          El cobro ya quedó registrado en{' '}
          <Link
            href="/caja"
            className="font-semibold text-[var(--alma-action)] transition-opacity duration-micro ease-alma hover:opacity-80"
          >
            la caja
          </Link>
          .
        </p>
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
