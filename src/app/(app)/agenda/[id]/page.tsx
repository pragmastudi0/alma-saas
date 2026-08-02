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
import { senaModoDe } from '@/lib/sena';
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
  // El turno se pide solo con sus columnas propias: los nombres de paciente,
  // servicio y empleado van aparte. Si una relación falla (o el tenant todavía
  // no tiene servicios), el turno igual se ve en vez de caer en un 404.
  const [{ data, error }, { data: cuentaMp }, { data: tenant }] = await Promise.all([
    supabase
      .from('alma_appointments')
      .select(
        'id, fecha, hora, duracion_min, precio, sena_monto, sena_pagada, estado, mp_init_point, patient_id, service_id, employee_id, reprogramado_a',
      )
      .eq('id', id)
      .maybeSingle(),
    supabase.from('alma_mp_accounts').select('tenant_id').maybeSingle(),
    supabase.from('alma_tenants').select('settings').maybeSingle(),
  ]);

  // Una consulta que falla no es un turno inexistente: si mostráramos "Nada por
  // acá" el problema quedaría invisible. Nunca logueamos datos del paciente.
  if (error) {
    console.error('[TurnoDetalle] No se pudo leer el turno:', error.message, error.code ?? '');
    throw new Error('No pudimos abrir el turno.');
  }
  if (!data) notFound();

  const [{ data: pac }, { data: servicio }, { data: empleado }] = await Promise.all([
    data.patient_id
      ? supabase
          .from('alma_patients')
          .select('nombre, apellido, telefono')
          .eq('id', data.patient_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    data.service_id
      ? supabase.from('alma_services').select('nombre').eq('id', data.service_id).maybeSingle()
      : Promise.resolve({ data: null }),
    data.employee_id
      ? supabase.from('alma_employees').select('nombre').eq('id', data.employee_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const nombreCompleto = nombrePaciente(pac) || 'Paciente';
  const estado = data.estado as Estado;
  const sena = Number(data.sena_monto);

  const settings = tenant?.settings as {
    alias_mp?: string | null;
    plantilla_cancelacion?: string | null;
  } | null;
  const senaModo = senaModoDe(tenant?.settings);

  // Cómo cobra la seña este profesional: MP conectado > alias > nada.
  const alias = (settings?.alias_mp ?? '').trim();
  const cobro: CobroSena = cuentaMp
    ? { modo: 'mp', initPoint: data.mp_init_point ?? null }
    : alias
      ? { modo: 'alias', alias, monto: pesos(sena) }
      : { modo: 'ninguno' };

  // Reprogramar: solo para turnos que no se dieron y que todavía no se reprogramaron.
  const reprogramable = (estado === 'cancelado' || estado === 'ausente') && !data.reprogramado_a;
  let reprogramarHref: string | undefined;
  if (reprogramable && data.patient_id) {
    const params = new URLSearchParams({ p: data.patient_id, origen: data.id });
    if (data.service_id) params.set('svc', data.service_id);
    if (data.employee_id) params.set('emp', data.employee_id);
    if (Number(data.precio) > 0) params.set('precio', String(Number(data.precio)));
    if (sena > 0) params.set('sena', String(sena));
    reprogramarHref = `/agenda/nuevo?${params.toString()}`;
  }

  // Si ya se reprogramó, mostramos a dónde fue.
  let turnoNuevo: { id: string; fecha: string; hora: string } | null = null;
  if (data.reprogramado_a) {
    const { data: destino } = await supabase
      .from('alma_appointments')
      .select('id, fecha, hora')
      .eq('id', data.reprogramado_a)
      .maybeSingle();
    turnoNuevo = destino ?? null;
  }

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
          {senaModo !== 'no' && (
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
          )}
          {servicio?.nombre ? <Dato label="Servicio">{servicio.nombre}</Dato> : null}
          {empleado?.nombre ? <Dato label="Empleado">{empleado.nombre}</Dato> : null}
        </dl>
      </section>

      <div className="mt-5">
        <EstadoAcciones
          id={data.id}
          estado={estado}
          cobro={cobro}
          plantillaCancel={settings?.plantilla_cancelacion ?? ''}
          reprogramarHref={reprogramarHref}
          senaModo={senaModo}
          wa={{
            telefono: pac?.telefono ?? '',
            nombre: pac?.nombre ?? 'Paciente',
            apellido: pac?.apellido ?? '',
            fecha: etiquetaDia(data.fecha),
            hora: horaCorta(data.hora),
          }}
        />
      </div>

      {turnoNuevo ? (
        <p className="mt-4 text-sm text-[var(--alma-text-muted)]">
          Este turno se reprogramó.{' '}
          <Link
            href={`/agenda/${turnoNuevo.id}`}
            className="font-semibold text-[var(--alma-action)] transition-opacity duration-micro ease-alma hover:opacity-80"
          >
            Ver el turno nuevo
          </Link>{' '}
          <span className="capitalize">({etiquetaDia(turnoNuevo.fecha)}</span> a las{' '}
          <span className="tnum">{horaCorta(turnoNuevo.hora)}</span>).
        </p>
      ) : null}

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
