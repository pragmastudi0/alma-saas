import Link from 'next/link';
import { notFound } from 'next/navigation';
import { DiaPicker } from '@/components/portal/dia-picker';
import { ReservaForm } from '@/components/portal/reserva-form';
import { addDias, etiquetaDia, etiquetaRelativa, hoyISO } from '@/lib/fecha';
import { pesos } from '@/lib/format';
import { getTenantPorSlug } from '@/lib/portal';
import { slotsDelDia } from '@/lib/slots';
import { createAdminSupabase } from '@/lib/supabase/admin';

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

type EmpleadoPublico = {
  id: string;
  nombre: string;
};

const cardCls = (activo: boolean) =>
  `block cursor-pointer rounded-lg border p-4 transition-colors duration-micro ease-alma ${
    activo
      ? 'border-[var(--alma-action)] bg-[var(--alma-surface)] ring-1 ring-[var(--alma-action)]'
      : 'border-[var(--alma-border)] bg-[var(--alma-bg)] hover:border-[var(--alma-text-muted)]'
  }`;

export default async function PortalPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ d?: string; s?: string; emp?: string }>;
}) {
  const [{ slug }, { d, s, emp }] = await Promise.all([params, searchParams]);
  const tenant = await getTenantPorSlug(slug);
  if (!tenant) notFound();

  const admin = createAdminSupabase();

  // ── Servicios ──────────────────────────────────────
  const { data: servicios } = await admin
    .from('alma_services')
    .select('id, nombre, descripcion, precio, duracion_min, sena_monto')
    .eq('activo', true)
    .eq('tenant_id', tenant.id)
    .order('nombre');

  const servicioElegido: ServicioPublico | null =
    servicios && servicios.length > 0
      ? servicios.find((sv) => sv.id === s) ?? servicios[0]
      : null;
  const serviceId = servicioElegido?.id ?? '';
  const duracionMin = servicioElegido?.duracion_min ?? tenant.settings.duracion_default ?? 45;
  const precio = servicioElegido?.precio ?? tenant.settings.precio_default ?? 0;
  const sena = servicioElegido?.sena_monto ?? tenant.settings.sena_default ?? 0;

  // ── Empleados ──────────────────────────────────────
  const { data: empleados } = await admin
    .from('alma_employees')
    .select('id, nombre')
    .eq('activo', true)
    .eq('tenant_id', tenant.id)
    .order('nombre');

  const { data: svcEmps } = await admin
    .from('alma_service_employees')
    .select('service_id, employee_id')
    .eq('tenant_id', tenant.id);

  // Empleados habilitados para el servicio elegido (o todos si no hay restricción)
  const empIdsPorServicio = serviceId
    ? new Set(
        (svcEmps ?? []).filter((r) => r.service_id === serviceId).map((r) => r.employee_id),
      )
    : null;
  const empleadosVisibles =
    empIdsPorServicio && empIdsPorServicio.size > 0
      ? (empleados ?? []).filter((e) => empIdsPorServicio.has(e.id))
      : (empleados ?? []);

  // Empleado seleccionado (de la URL, primero visible, o null si no hay empleados)
  const empleadoElegido: EmpleadoPublico | null =
    empleadosVisibles.length > 0
      ? empleadosVisibles.find((e) => e.id === emp) ?? empleadosVisibles[0]
      : null;
  const employeeId = empleadoElegido?.id ?? '';

  // ── Fecha y slots ──────────────────────────────────
  const hoy = hoyISO(tenant.timezone);
  const dias = Array.from({ length: DIAS_VISIBLES }, (_, i) => addDias(hoy, i));
  const dia = d && FECHA.test(d) && dias.includes(d) ? d : hoy;

  const [{ data: dispo }, slots] = await Promise.all([
    admin.from('alma_availability').select('dia_semana').eq('tenant_id', tenant.id),
    slotsDelDia(
      admin,
      { id: tenant.id, timezone: tenant.timezone, duracionMin },
      dia,
      employeeId || undefined,
    ),
  ]);
  const diasQueAtiende = new Set((dispo ?? []).map((x) => x.dia_semana));

  const urlBase = `/t/${slug}`;

  // Helper: link que preserva servicio + empleado + día
  const linkCon = (params: Record<string, string>) => {
    const p = new URLSearchParams();
    if (serviceId) p.set('s', serviceId);
    if (employeeId) p.set('emp', employeeId);
    if (dia) p.set('d', dia);
    for (const [k, v] of Object.entries(params)) p.set(k, v);
    return `${urlBase}?${p.toString()}`;
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-xl border border-[var(--alma-border)] bg-[var(--alma-surface)] p-5 shadow-1">
        <h1 className="voice text-[28px] leading-[1.1] text-[var(--alma-voice)]">
          Reservá tu turno
        </h1>
        <p className="mt-2 text-sm text-[var(--alma-text-muted)]">
          Elegí el servicio, el profesional, el día y el horario que te quede mejor.
        </p>
      </div>

      {/* Service picker */}
      {servicios && servicios.length > 0 && (
        <section className="rounded-lg border border-[var(--alma-border)] bg-[var(--alma-surface)] p-4 shadow-1">
          <p className="mb-3 text-sm font-semibold text-[var(--alma-text)]">Servicio</p>
          <div className="flex flex-col gap-2">
            {servicios.map((sv) => (
              <Link key={sv.id} href={linkCon({ s: sv.id })} className={cardCls(sv.id === serviceId)}>
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
            ))}
          </div>
        </section>
      )}

      {/* Employee picker */}
      {empleadosVisibles.length > 0 && (
        <section className="rounded-lg border border-[var(--alma-border)] bg-[var(--alma-surface)] p-4 shadow-1">
          <p className="mb-3 text-sm font-semibold text-[var(--alma-text)]">Profesional</p>
          <div className="flex flex-col gap-2">
            {empleadosVisibles.map((emp) => (
              <Link
                key={emp.id}
                href={linkCon({ emp: emp.id })}
                className={cardCls(emp.id === employeeId)}
              >
                <p className="text-sm font-semibold">{emp.nombre}</p>
              </Link>
            ))}
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
          employeeId={employeeId}
          employeeNombre={empleadoElegido?.nombre ?? null}
        />
      )}
    </div>
  );
}
