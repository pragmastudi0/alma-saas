/**
 * OAuth de Mercado Pago: cada profesional conecta SU cuenta y cobra en ella.
 * alma es la aplicación (MP_CLIENT_ID/MP_CLIENT_SECRET); los tokens del
 * vendedor se guardan cifrados en alma_mp_accounts. Solo server.
 *
 * Vida útil según MP: access_token 180 días; refresh_token rota en cada
 * renovación (requiere scope offline_access).
 */
import crypto from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { cifrar, descifrar } from '@/lib/crypto';

const MP_AUTH_URL = 'https://auth.mercadopago.com.ar/authorization';
const MP_TOKEN_URL = 'https://api.mercadopago.com/oauth/token';

/** Renovamos anticipadamente si el token vence dentro de este margen. */
const MARGEN_REFRESH_MS = 30 * 24 * 60 * 60 * 1000; // 30 días

function clientId(): string {
  const v = process.env.MP_CLIENT_ID;
  if (!v) throw new Error('Falta MP_CLIENT_ID en el entorno del server.');
  return v;
}

function clientSecret(): string {
  const v = process.env.MP_CLIENT_SECRET;
  if (!v) throw new Error('Falta MP_CLIENT_SECRET en el entorno del server.');
  return v;
}

/** ¿Está configurada la aplicación de MP? (para no romper la UI si falta env) */
export function mpAppConfigurada(): boolean {
  return !!process.env.MP_CLIENT_ID && !!process.env.MP_CLIENT_SECRET;
}

// ============================================================
// PKCE + URL de autorización
// ============================================================

const b64url = (b: Buffer) => b.toString('base64url');

export function generarPkce(): { verifier: string; challenge: string } {
  const verifier = b64url(crypto.randomBytes(32));
  const challenge = b64url(crypto.createHash('sha256').update(verifier).digest());
  return { verifier, challenge };
}

export function generarState(): string {
  return b64url(crypto.randomBytes(24));
}

export function urlAutorizacion(args: {
  state: string;
  challenge: string;
  redirectUri: string;
}): string {
  const params = new URLSearchParams({
    client_id: clientId(),
    response_type: 'code',
    platform_id: 'mp',
    state: args.state,
    redirect_uri: args.redirectUri,
    code_challenge: args.challenge,
    code_challenge_method: 'S256',
  });
  return `${MP_AUTH_URL}?${params}`;
}

// ============================================================
// Intercambio y refresh de tokens
// ============================================================

export type TokenMp = {
  access_token: string;
  refresh_token?: string;
  expires_in: number; // segundos
  user_id: number; // collector_id del vendedor
  public_key?: string;
  scope?: string;
  live_mode?: boolean;
};

async function pedirToken(body: Record<string, string>): Promise<TokenMp> {
  const res = await fetch(MP_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: clientId(),
      client_secret: clientSecret(),
      ...body,
    }),
  });
  if (!res.ok) {
    throw new Error(`MP oauth/token: HTTP ${res.status}`);
  }
  return (await res.json()) as TokenMp;
}

export function intercambiarCode(args: {
  code: string;
  verifier: string;
  redirectUri: string;
}): Promise<TokenMp> {
  return pedirToken({
    grant_type: 'authorization_code',
    code: args.code,
    code_verifier: args.verifier,
    redirect_uri: args.redirectUri,
  });
}

function refrescarToken(refreshToken: string): Promise<TokenMp> {
  return pedirToken({ grant_type: 'refresh_token', refresh_token: refreshToken });
}

// ============================================================
// Persistencia (siempre vía service role; los tokens van cifrados)
// ============================================================

export async function guardarCuentaMp(
  admin: SupabaseClient,
  tenantId: string,
  token: TokenMp,
): Promise<{ error?: 'cuenta_en_uso' | 'desconocido' }> {
  const { error } = await admin.from('alma_mp_accounts').upsert(
    {
      tenant_id: tenantId,
      collector_id: token.user_id,
      access_token_enc: cifrar(token.access_token),
      refresh_token_enc: token.refresh_token ? cifrar(token.refresh_token) : null,
      public_key: token.public_key ?? null,
      scope: token.scope ?? null,
      live_mode: token.live_mode ?? true,
      expires_at: new Date(Date.now() + token.expires_in * 1000).toISOString(),
    },
    { onConflict: 'tenant_id' },
  );
  if (error?.code === '23505') {
    // El unique de collector_id saltó: esa cuenta de MP ya está conectada a otro tenant.
    return { error: 'cuenta_en_uso' };
  }
  return error ? { error: 'desconocido' } : {};
}

export async function desconectarCuentaMp(admin: SupabaseClient, tenantId: string): Promise<void> {
  await admin.from('alma_mp_accounts').delete().eq('tenant_id', tenantId);
}

export type CredencialMp = { accessToken: string; collectorId: number; tenantId: string };

type FilaCuenta = {
  tenant_id: string;
  collector_id: number;
  access_token_enc: string;
  refresh_token_enc: string | null;
  expires_at: string;
};

async function resolverCredencial(
  admin: SupabaseClient,
  fila: FilaCuenta,
): Promise<CredencialMp | null> {
  const venceEn = new Date(fila.expires_at).getTime() - Date.now();
  const credencial = {
    accessToken: descifrar(fila.access_token_enc),
    collectorId: fila.collector_id,
    tenantId: fila.tenant_id,
  };

  if (venceEn > MARGEN_REFRESH_MS) {
    return credencial;
  }

  // Vence pronto (o venció): intentamos renovar. El refresh_token rota,
  // así que persistimos el par nuevo en el acto.
  if (fila.refresh_token_enc) {
    try {
      const nuevo = await refrescarToken(descifrar(fila.refresh_token_enc));
      await guardarCuentaMp(admin, fila.tenant_id, nuevo);
      return { accessToken: nuevo.access_token, collectorId: nuevo.user_id, tenantId: fila.tenant_id };
    } catch {
      // Si el refresh falló pero el token viejo todavía sirve, lo usamos.
    }
  }
  if (venceEn > 0) {
    return credencial;
  }

  // Token vencido y sin renovación posible: la cuenta quedó desconectada.
  await desconectarCuentaMp(admin, fila.tenant_id);
  return null;
}

/** Credencial vigente del tenant (renueva sola si hace falta); null si no hay cuenta. */
export async function obtenerCredencialMp(
  admin: SupabaseClient,
  tenantId: string,
): Promise<CredencialMp | null> {
  const { data } = await admin
    .from('alma_mp_accounts')
    .select('tenant_id, collector_id, access_token_enc, refresh_token_enc, expires_at')
    .eq('tenant_id', tenantId)
    .maybeSingle();
  if (!data) return null;
  return resolverCredencial(admin, data as FilaCuenta);
}

/** Credencial por collector_id (para resolver el vendedor de un webhook). */
export async function credencialPorCollector(
  admin: SupabaseClient,
  collectorId: number,
): Promise<CredencialMp | null> {
  const { data } = await admin
    .from('alma_mp_accounts')
    .select('tenant_id, collector_id, access_token_enc, refresh_token_enc, expires_at')
    .eq('collector_id', collectorId)
    .maybeSingle();
  if (!data) return null;
  return resolverCredencial(admin, data as FilaCuenta);
}
