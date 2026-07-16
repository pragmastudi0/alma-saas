import { type NextRequest } from 'next/server';
import { obtenerPago, verificarFirmaWebhook } from '@/lib/mp';
import { registrarPagoSena } from '@/lib/mp-webhook';
import { createAdminSupabase } from '@/lib/supabase/admin';

/**
 * Webhook de Mercado Pago. Recibe la notificación de pago, valida la firma,
 * consulta el pago real y registra la seña de forma idempotente.
 * Nunca logueamos datos del pago ni del paciente.
 */
export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  // MP manda los datos por query y/o por body JSON.
  let bodyDataId: string | null = null;
  let bodyType: string | null = null;
  try {
    const body = (await req.json()) as { type?: string; data?: { id?: string | number } };
    bodyType = body?.type ?? null;
    bodyDataId = body?.data?.id != null ? String(body.data.id) : null;
  } catch {
    // sin body JSON: seguimos con los query params
  }

  const dataId = searchParams.get('data.id') ?? searchParams.get('id') ?? bodyDataId;
  const tipo = searchParams.get('type') ?? searchParams.get('topic') ?? bodyType;

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
  if (!dataId) {
    return new Response('sin id', { status: 200 });
  }

  try {
    const pago = await obtenerPago(dataId);
    if (!pago.external_reference) {
      return new Response('sin referencia', { status: 200 });
    }

    const admin = createAdminSupabase();
    await registrarPagoSena(admin, {
      mpId: pago.id,
      status: pago.status,
      monto: pago.transaction_amount,
      appointmentId: pago.external_reference,
      raw: pago,
    });

    return new Response('ok', { status: 200 });
  } catch {
    // 500 → MP reintenta más tarde. No filtramos detalles del error.
    return new Response('error', { status: 500 });
  }
}
