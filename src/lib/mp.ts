/**
 * Cliente de Mercado Pago (Checkout Pro) — solo server.
 * Lee MP_ACCESS_TOKEN y MP_WEBHOOK_SECRET del entorno. Nada de secrets en el cliente.
 */
import crypto from 'node:crypto';

const MP_API = 'https://api.mercadopago.com';

function accessToken(): string {
  const t = process.env.MP_ACCESS_TOKEN;
  if (!t) throw new Error('Falta MP_ACCESS_TOKEN en el entorno del server.');
  return t;
}

function siteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
  );
}

/** Crea una preferencia de pago para la seña y devuelve el link (init_point). */
export async function crearPreferenciaSena(args: {
  appointmentId: string;
  titulo: string;
  monto: number;
}): Promise<string> {
  const base = siteUrl();
  const res = await fetch(`${MP_API}/checkout/preferences`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      items: [
        {
          title: args.titulo,
          quantity: 1,
          unit_price: args.monto,
          currency_id: 'ARS',
        },
      ],
      // Con esto el webhook sabe a qué turno pertenece el pago.
      external_reference: args.appointmentId,
      notification_url: `${base}/api/mp/webhook`,
      back_urls: {
        success: `${base}/agenda`,
        failure: `${base}/agenda`,
        pending: `${base}/agenda`,
      },
      auto_return: 'approved',
    }),
  });
  if (!res.ok) {
    throw new Error(`MP preferencia: HTTP ${res.status}`);
  }
  const data = (await res.json()) as { init_point?: string };
  if (!data.init_point) {
    throw new Error('MP preferencia: sin init_point');
  }
  return data.init_point;
}

export type PagoMp = {
  id: string;
  status: string;
  transaction_amount: number;
  external_reference: string | null;
};

/** Trae el detalle de un pago desde MP para saber su estado real. */
export async function obtenerPago(paymentId: string): Promise<PagoMp> {
  const res = await fetch(`${MP_API}/v1/payments/${paymentId}`, {
    headers: { Authorization: `Bearer ${accessToken()}` },
  });
  if (!res.ok) {
    throw new Error(`MP pago: HTTP ${res.status}`);
  }
  const d = (await res.json()) as {
    id: number | string;
    status: string;
    transaction_amount: number;
    external_reference?: string | null;
  };
  return {
    id: String(d.id),
    status: d.status,
    transaction_amount: d.transaction_amount,
    external_reference: d.external_reference ?? null,
  };
}

/**
 * Verifica la firma del webhook (header x-signature: "ts=...,v1=...").
 * Manifest de MP: id:<data.id>;request-id:<x-request-id>;ts:<ts>;
 */
export function verificarFirmaWebhook(args: {
  xSignature: string | null;
  xRequestId: string | null;
  dataId: string | null;
}): boolean {
  const secret = process.env.MP_WEBHOOK_SECRET;
  if (!secret || !args.xSignature || !args.dataId) return false;

  const parts = Object.fromEntries(
    args.xSignature.split(',').map((p) => {
      const [k, v] = p.split('=');
      return [k?.trim(), v?.trim()];
    }),
  ) as Record<string, string | undefined>;

  const ts = parts.ts;
  const v1 = parts.v1;
  if (!ts || !v1) return false;

  const manifest = `id:${args.dataId};request-id:${args.xRequestId ?? ''};ts:${ts};`;
  const hmac = crypto.createHmac('sha256', secret).update(manifest).digest('hex');

  try {
    return crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(v1));
  } catch {
    return false;
  }
}
