import Link from 'next/link';
import { notFound } from 'next/navigation';
import { DiaPicker } from '@/components/portal/dia-picker';
import { ReservaForm } from '@/components/portal/reserva-form';
import { addDias, etiquetaDia, etiquetaRelativa, hoyISO } from '@/lib/fecha';
import { pesos } from '@/lib/format';
import { getTenantPorSlug } from '@/lib/portal';
import { slotsDelDia } from '@/lib/slots';
import { createAdminSupabase } from '@/lib/supabase/admin';

// Los horarios cambian con cada reserva: siempre fresco.
export const dynamic = 'force-dynamic';

const FECHA = /^\d{4}-\d{2}-\d{2}$/;
const DIAS_VISIBLES = 14;

type ServicioPublico = {
  id: string;
  nombre: string;
  descripcion: string;
  precio: number;
  duracion_min: number;
  sena_monto: number;
};

const radioCls = /* css */ `
  peer sr-only
`;
const radioLabelCls = /* css */ `
  block cursor-pointer rounded-lg border border-[var(--alma-border)] bg-[var(--alma-surface)] p-4
  transition-colors duration-micro ease-alma
  hover:border-[var(--alma-text-muted)]
  peer-checked:border-[var(--alma-action)] peer-checked:ring-1 peer-checked:ring-[var(--alma-action)]
`;

export default async function PortalPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ d?: string; s?: string }>;
}) {
  const [{ slug }, { d, s }] = await Promise.all([params, searchParams]);
  const tenant = await getTenantPorSlug(slug);
  if (!tenant) notFound();

  const admin = createAdminSupabase();

  const { data: servicios } = await admin
    .from('alma_services')
    .select('id, nombre, descripcion, precio, duracion_min, sena_monto')
    .eq('activo', true)
    .eq('tenant_id', tenant.id)
    .order('nombre');

  // Servicio seleccionado (de la URL, primero activo, o null si no hay servicios)
  const servicioElegido: ServicioPublico | null =
    servicios && servicios.length > 0
      ? servicios.find((sv) => sv.id === s) ?? servicios[0]
      : null;
  const serviceId = servicioElegido?.id ?? '';
  const duracionMin = servicioElegido?.duracion_min ?? tenant.settings.duracion_default ?? 45;
  const precio = servicioElegido?.precio ?? tenant.settings.precio_default ?? 0;
  const sena = servicioElegido?.sena_monto ?? tenant.settings.sena_default ?? 0;

  const hoy = hoyISO(tenant.timezone);
  const dias = Array.from({ length: DIAS_VISIBLES }, (_, i) => addDias(hoy, i));
  const dia = d && FECHA.test(d) && dias.includes(d) ? d : hoy;

  // Qué días de la semana atiende + slots del día elegido (según la duración del servicio).
  const [{ data: dispo }, slots] = await Promise.all([
    admin.from('alma_availability').select('dia_semana').eq('tenant_id', tenant.id),
    slotsDelDia(admin, { id: tenant.id, timezone: tenant.timezone, duracionMin }, dia),
  ]);
  const diasQueAtiende = new Set((dispo ?? []).map((x) => x.dia_semana));

  // Link base para el service picker (preserva el día y cambia el servicio)
  const urlBase = `/t/${slug}`;

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-xl border border-[var(--alma-border)] bg-[var(--alma-surface)] p-5 shadow-1">
        <h1 className="voice text-[28px] leading-[1.1] text-[var(--alma-voice)]">
          Reservá tu turno
        </h1>
        <p className="mt-2 text-sm text-[var(--alma-text-muted)]">
          Elegí el servicio, el día y el horario que te quede mejor.
        </p>
      </div>

      {/* Service picker */}
      {servicios && servicios.length > 0 && (
        <section className="rounded-lg border border-[var(--alma-border)] bg-[var(--alma-surface)] p-4 shadow-1">
          <p className="mb-3 text-sm font-semibold text-[var(--alma-text)]">Servicio</p>
          <div className="flex flex-col gap-2">
            {servicios.map((sv) => {
              const href = `${urlBase}?s=${sv.id}${dia ? `&d=${dia}` : ''}`;
              const activo = sv.id === serviceId;
              return (
                <Link
                  key={sv.id}
                  href={href}
                  className={`block cursor-pointer rounded-lg border p-4 transition-colors duration-micro ease-alma ${
                    activo
                      ? 'border-[var(--alma-action)] bg-[var(--alma-surface)] ring-1 ring-[var(--alma-action)]'
                      : 'border-[var(--alma-border)] bg-[var(--alma-bg)] hover:border-[var(--alma-text-muted)]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold">{sv.nombre}</p>
                    <p className="tnum text-sm font-semibold">{pesos(Number(sv.precio))}</p>
                  </div>
                  <div className="mt-0.5 flex items-center gap-3 text-xs text-[var(--alma-text-muted)]">
                    <span className="tnum">{sv.duracion_min} min</span>
                    {Number(sv.sena_monto) > 0 && (
                      <span>seña de <span className="tnum">{pesos(Number(sv.sena_monto))}</span></span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      <DiaPicker dias={dias} activo={dia} diasQueAtiende={diasQueAtiende} />

      <p className="text-sm font-medium capitalize text-[var(--alma-text)]">
        {etiquetaRelativa(dia, tenant.timezone) ?? etiquetaDia(dia)}
      </p>

      {slots.length === 0 ? (
        <p className="rounded-lg border border-dashed border-[var(--alma-border)] p-8 text-center text-sm text-[var(--alma-text-muted)]">
          Ese día no hay horarios. Probá con otro.
        </p>
      ) : (
        <ReservaForm
          slug={slug}
          fecha={dia}
          slots={slots}
          nombreProfesional={tenant.nombre}
          sena={sena}
          serviceId={serviceId}
          serviceNombre={servicioElegido?.nombre ?? null}
        />
      )}
    </div>
  );
}
