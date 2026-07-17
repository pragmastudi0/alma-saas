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

export default async function PortalPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ d?: string }>;
}) {
  const [{ slug }, { d }] = await Promise.all([params, searchParams]);
  const tenant = await getTenantPorSlug(slug);
  if (!tenant) notFound();

  const hoy = hoyISO(tenant.timezone);
  const dias = Array.from({ length: DIAS_VISIBLES }, (_, i) => addDias(hoy, i));
  const dia = d && FECHA.test(d) && dias.includes(d) ? d : hoy;

  const admin = createAdminSupabase();

  // Qué días de la semana atiende (para atenuar los que no) + slots del día elegido.
  const [{ data: dispo }, slots] = await Promise.all([
    admin.from('alma_availability').select('dia_semana').eq('tenant_id', tenant.id),
    slotsDelDia(
      admin,
      {
        id: tenant.id,
        timezone: tenant.timezone,
        duracionMin: tenant.settings.duracion_default ?? 45,
      },
      dia,
    ),
  ]);
  const diasQueAtiende = new Set((dispo ?? []).map((x) => x.dia_semana));

  const precio = tenant.settings.precio_default ?? 0;
  const sena = tenant.settings.sena_default ?? 0;

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-xl border border-[var(--alma-border)] bg-[var(--alma-surface)] p-5 shadow-1">
        <h1 className="voice text-[28px] leading-[1.1] text-[var(--alma-voice)]">
          Reservá tu turno
        </h1>
        {precio > 0 && (
          <p className="mt-2 text-sm text-[var(--alma-text-muted)]">
            La sesión cuesta <span className="tnum font-medium">{pesos(precio)}</span>
            {sena > 0 && (
              <>
                {' '}
                (seña de <span className="tnum font-medium">{pesos(sena)}</span> para confirmar)
              </>
            )}
            .
          </p>
        )}
      </div>

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
        />
      )}
    </div>
  );
}
