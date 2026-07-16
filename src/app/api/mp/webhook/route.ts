import { type NextRequest } from 'next/server';
import { obtenerPago, verificarFirmaWebhook } from '@/lib/mp';
import { credencialPorCollector } from '@/lib/mp-oauth';
import { registrarPagoSena } from '@/lib/mp-webhook';
import { createAdminSupabase } from '@/lib/supabase/admin';

/**
 * Webhook de Mercado Pago (multi-vendedor). La notificación trae el user_id
 * del vendedor (collector): con él resolvemos la cuenta conectada y su token
 * para consultar el pago real, y registramos la seña de forma idempotente.
 * Nunca logueamos datos del pago ni del paciente.
 */
export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  // MP manda los datos por query y/o por body JSON.
  let bodyDataId: string | null = null;
  let bodyType: string | null = null;
  let bodyUserId: string | null = null;
  try {
    const body = (await req.json()) as {
      type?: string;
      data?: { id?: string | number };
      user_id?: string | number;
    };
    bodyType = body?.type ?? null;
    bodyDataId = body?.data?.id != null ? String(body.data.id) : null;
    bodyUserId = body?.user_id != null ? String(body.user_id) : null;
  } catch {
    // sin body JSON: seguimos con los query params
  }

  const dataId = searchParams.get('data.id') ?? searchParams.get('id') ?? bodyDataId;
  const tipo = searchParams.get('type') ?? searchParams.get('topic') ?? bodyType;
  const userId = searchParams.get('user_id') ?? bodyUserId;

  // Firma primero: si no valida, cortamos.
  const firmaOk = verificarFirmaWebhook({
    xSignature: req.headers.get('x-signature'),
    xRequestId: req.headers.get('x-request-id'),
    dataId,
  });
  if (!firmaOk) {
    return new Response('firma inválida', { status: 401 });
  }

  // Sólo procesamos notificaciones de pago; el resto se acusa con 200.
  if (tipo && tipo !== 'payment') {
    return new Response('ignorado', { status: 200 });
  }
  if (!dataId || !userId) {
    return new Response('sin datos', { status: 200 });
  }

  const collectorId = Number(userId);
  if (!Number.isFinite(collectorId)) {
    return new Response('ignorado', { status: 200 });
  }

  try {
    const admin = createAdminSupabase();

    // ¿De qué profesional es esta cuenta de MP?
    const credencial = await credencialPorCollector(admin, collectorId);
    if (!credencial) {
      // Cuenta no conectada a ningún tenant: no es nuestro.
      return new Response('sin cuenta', { status: 200 });
    }

    const pago = await obtenerPago(dataId, credencial.accessToken);
    if (!pago.external_reference) {
      return new Response('sin referencia', { status: 200 });
    }

    await registrarPagoSena(admin, {
      mpId: pago.id,
      status: pago.status,
      monto: pago.transaction_amount,
      appointmentId: pago.external_reference,
      tenantId: credencial.tenantId,
      raw: pago,
    });

    return new Response('ok', { status: 200 });
  } catch {
    // 500 → MP reintenta más tarde. No filtramos detalles del error.
    return new Response('error', { status: 500 });
  }
}
