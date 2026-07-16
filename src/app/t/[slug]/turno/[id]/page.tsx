import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PagarSenaBoton } from '@/components/portal/pagar-sena-boton';
import { etiquetaDia } from '@/lib/fecha';
import { horaCorta, pesos } from '@/lib/format';
import { getTenantPorSlug } from '@/lib/portal';
import { createAdminSupabase } from '@/lib/supabase/admin';

// El estado cambia cuando el webhook confirma el pago: siempre fresco.
export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function TurnoPublicoPage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { slug, id } = await params;
  if (!UUID.test(id)) notFound();

  const tenant = await getTenantPorSlug(slug);
  if (!tenant) notFound();

  const admin = createAdminSupabase();
  // Solo el turno del tenant del slug; el uuid es inadivinable y no exponemos
  // ningún dato personal en esta página.
  const [{ data: turno }, { data: cuentaMp }] = await Promise.all([
    admin
      .from('alma_appointments')
      .select('id, fecha, hora, estado, sena_monto, sena_pagada')
      .eq('id', id)
      .eq('tenant_id', tenant.id)
      .maybeSingle(),
    admin.from('alma_mp_accounts').select('tenant_id').eq('tenant_id', tenant.id).maybeSingle(),
  ]);
  if (!turno) notFound();

  const sena = Number(turno.sena_monto);
  const cuando = (
    <p className="mt-2 text-[17px] font-semibold capitalize">
      {etiquetaDia(turno.fecha)} · <span className="tnum">{horaCorta(turno.hora)}</span>
    </p>
  );

  if (turno.estado === 'pendiente_sena') {
    const alias = tenant.settings.alias_mp;
    return (
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="voice text-[26px] leading-[1.15]">Falta la seña para confirmar</h1>
          {cuando}
          <p className="mt-2 text-sm text-[var(--alma-text-muted)]">
            Tu horario está reservado. Para confirmarlo, dejá la seña de{' '}
            <span className="tnum font-medium">{pesos(sena)}</span>.
          </p>
        </div>
        {cuentaMp ? (
          <>
            <PagarSenaBoton slug={slug} id={turno.id} />
            <p className="text-center text-xs text-[var(--alma-text-muted)]">
              ¿Ya pagaste? Puede tardar unos segundos en acreditarse — actualizá esta página.
            </p>
          </>
        ) : alias ? (
          // Sin cuenta MP conectada: seña por transferencia al alias, confirmación manual.
          <div className="rounded-lg border border-[var(--alma-border)] bg-[var(--alma-surface)] p-4">
            <p className="text-sm text-[var(--alma-text-muted)]">Transferí la seña al alias</p>
            <p className="mt-1 select-all text-[17px] font-semibold">{alias}</p>
            <p className="mt-2 text-xs text-[var(--alma-text-muted)]">
              Cuando {tenant.nombre} vea la transferencia, te confirma el turno.
            </p>
          </div>
        ) : (
          <p className="text-sm text-[var(--alma-text-muted)]">
            {tenant.nombre} te va a escribir para coordinar la seña.
          </p>
        )}
      </div>
    );
  }

  if (turno.estado === 'confirmado' || turno.estado === 'completado') {
    return (
      <div>
        <h1 className="voice text-[26px] leading-[1.15]">Listo, tu turno quedó confirmado</h1>
        {cuando}
        {sena > 0 && turno.sena_pagada && (
          <p className="mt-2 text-sm text-[var(--alma-text-muted)]">
            Seña de <span className="tnum">{pesos(sena)}</span> recibida. ¡Nos vemos!
          </p>
        )}
      </div>
    );
  }

  return (
    <div>
      <h1 className="voice text-[26px] leading-[1.15]">Este turno se canceló</h1>
      <p className="mt-2 text-sm text-[var(--alma-text-muted)]">
        Si querés, podés{' '}
        <Link href={`/t/${slug}`} className="font-semibold text-[var(--alma-action)]">
          reservar otro horario
        </Link>
        .
      </p>
    </div>
  );
}
