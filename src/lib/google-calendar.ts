/** Sincronización unidireccional: ALMA es la fuente de verdad. Solo server. */
import crypto from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { cifrar, descifrar } from '@/lib/crypto';
import { addDias } from '@/lib/fecha';

const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const EVENTS_URL = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';
const SCOPE = 'https://www.googleapis.com/auth/calendar.events';
const KEY_ENV = 'GOOGLE_TOKEN_ENC_KEY';

const tokenSchema = z.object({
  access_token: z.string().min(1),
  refresh_token: z.string().min(1).optional(),
  expires_in: z.number().positive(),
  scope: z.string().optional(),
});

export function googleConfigurado(): boolean {
  return !!process.env.GOOGLE_CALENDAR_CLIENT_ID && !!process.env.GOOGLE_CALENDAR_CLIENT_SECRET && !!process.env.GOOGLE_TOKEN_ENC_KEY;
}

export function generarGooglePkce() {
  const verifier = crypto.randomBytes(32).toString('base64url');
  const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');
  return { verifier, challenge };
}

export function generarGoogleState(): string {
  return crypto.randomBytes(24).toString('base64url');
}

export function urlGoogleAutorizacion(state: string, challenge: string, redirectUri: string): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CALENDAR_CLIENT_ID!,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: SCOPE,
    access_type: 'offline',
    prompt: 'consent',
    code_challenge: challenge,
    code_challenge_method: 'S256',
    state,
  });
  return `${AUTH_URL}?${params}`;
}

async function pedirToken(body: URLSearchParams) {
  body.set('client_id', process.env.GOOGLE_CALENDAR_CLIENT_ID!);
  body.set('client_secret', process.env.GOOGLE_CALENDAR_CLIENT_SECRET!);
  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
    cache: 'no-store',
  });
  if (!response.ok) throw new Error(`Google OAuth HTTP ${response.status}`);
  const parsed = tokenSchema.safeParse(await response.json());
  if (!parsed.success) throw new Error('Respuesta OAuth de Google inválida.');
  return parsed.data;
}

export async function conectarGoogle(
  admin: SupabaseClient,
  tenantId: string,
  code: string,
  verifier: string,
  redirectUri: string,
): Promise<void> {
  const token = await pedirToken(new URLSearchParams({
    grant_type: 'authorization_code', code, code_verifier: verifier, redirect_uri: redirectUri,
  }));
  if (!token.refresh_token || (token.scope && !token.scope.split(' ').includes(SCOPE))) {
    throw new Error('Google no concedió acceso sin conexión al calendario.');
  }
  const { error } = await admin.from('alma_google_calendar_accounts').upsert({
    tenant_id: tenantId,
    access_token_enc: cifrar(token.access_token, KEY_ENV),
    refresh_token_enc: cifrar(token.refresh_token, KEY_ENV),
    expires_at: new Date(Date.now() + token.expires_in * 1000).toISOString(),
  }, { onConflict: 'tenant_id' });
  if (error) throw error;
}

async function accessToken(admin: SupabaseClient, tenantId: string): Promise<string | null> {
  const { data: account, error } = await admin.from('alma_google_calendar_accounts')
    .select('access_token_enc, refresh_token_enc, expires_at')
    .eq('tenant_id', tenantId).maybeSingle();
  if (error) throw error;
  if (!account) return null;
  if (new Date(account.expires_at).getTime() > Date.now() + 60_000) return descifrar(account.access_token_enc, KEY_ENV);
  const token = await pedirToken(new URLSearchParams({
    grant_type: 'refresh_token', refresh_token: descifrar(account.refresh_token_enc, KEY_ENV),
  }));
  const { error: saveError } = await admin.from('alma_google_calendar_accounts').update({
    access_token_enc: cifrar(token.access_token, KEY_ENV),
    ...(token.refresh_token ? { refresh_token_enc: cifrar(token.refresh_token, KEY_ENV) } : {}),
    expires_at: new Date(Date.now() + token.expires_in * 1000).toISOString(),
  }).eq('tenant_id', tenantId);
  if (saveError) throw saveError;
  return token.access_token;
}

export function googleEventId(appointmentId: string): string {
  return `alma${appointmentId.replaceAll('-', '')}`;
}

export function googleFechaFin(fecha: string, hora: string, duracion: number): string {
  const [hh, mm] = hora.slice(0, 5).split(':').map(Number);
  const total = hh * 60 + mm + duracion;
  const fechaFinal = addDias(fecha, Math.floor(total / 1440));
  const minutoFinal = total % 1440;
  return `${fechaFinal}T${String(Math.floor(minutoFinal / 60)).padStart(2, '0')}:${String(minutoFinal % 60).padStart(2, '0')}:00`;
}

async function googleRequest(token: string, method: string, url: string, body?: unknown): Promise<Response> {
  return fetch(url, {
    method,
    headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  });
}

export type ResultadoGoogle = 'sin_conexion' | 'sincronizado';

export async function sincronizarGoogle(
  tenantId: string,
  appointmentId: string,
  accion: 'CREATE' | 'UPDATE' | 'DELETE',
  soloDuracion = false,
): Promise<ResultadoGoogle> {
  const admin = createAdminSupabase();
  const token = await accessToken(admin, tenantId);
  if (!token) return 'sin_conexion';
  const id = googleEventId(appointmentId);
  const url = `${EVENTS_URL}/${id}`;
  const { data: turno, error: turnoError } = accion === 'DELETE'
    ? { data: null, error: null }
    : await admin.from('alma_appointments')
      .select('id, fecha, hora, duracion_min, estado, patient_id, service_id')
      .eq('id', appointmentId).eq('tenant_id', tenantId).maybeSingle();
  if (turnoError) throw turnoError;
  const borrar = accion === 'DELETE' || !turno || !['confirmado', 'completado'].includes(turno.estado);
  const { error: pendingError } = await admin.from('alma_google_calendar_events').upsert({
    tenant_id: tenantId, appointment_id: appointmentId, event_id: id,
    sync_state: 'pending', updated_at: new Date().toISOString(),
  }, { onConflict: 'appointment_id' });
  // Un turno eliminado ya cascó la fila de estado: igual se puede borrar en Google por ID estable.
  if (pendingError && accion !== 'DELETE') throw pendingError;
  try {
    if (borrar) {
      const response = await googleRequest(token, 'DELETE', url);
      if (!response.ok && response.status !== 404 && response.status !== 410) throw new Error(`Google Calendar HTTP ${response.status}`);
    } else {
      const { data: tenant, error: tenantError } = await admin.from('alma_tenants')
        .select('timezone').eq('id', tenantId).single();
      if (tenantError) throw tenantError;
      const timezone = tenant.timezone;
      const end = { dateTime: googleFechaFin(turno.fecha, turno.hora, turno.duracion_min), timeZone: timezone };
      const start = { dateTime: `${turno.fecha}T${turno.hora.slice(0, 5)}:00`, timeZone: timezone };
      // PATCH conserva título, notas, ubicación y otros datos editados en Google.
      const patch = soloDuracion ? { end } : { start, end };
      let response = await googleRequest(token, 'PATCH', url, patch);
      if (response.status === 404) {
        const [{ data: paciente }, { data: servicio }] = await Promise.all([
          admin.from('alma_patients').select('nombre, apellido').eq('id', turno.patient_id).eq('tenant_id', tenantId).single(),
          turno.service_id
            ? admin.from('alma_services').select('nombre').eq('id', turno.service_id).eq('tenant_id', tenantId).maybeSingle()
            : Promise.resolve({ data: null }),
        ]);
        if (!paciente) throw new Error('No pudimos leer el paciente del turno.');
        const summary = [servicio?.nombre, [paciente.nombre, paciente.apellido].filter(Boolean).join(' ')].filter(Boolean).join(' - ');
        response = await googleRequest(token, 'POST', EVENTS_URL, { id, summary, start, end });
        if (response.status === 409) response = await googleRequest(token, 'PATCH', url, patch);
      }
      if (!response.ok) throw new Error(`Google Calendar HTTP ${response.status}`);
    }
    const { error } = await admin.from('alma_google_calendar_events').upsert({
      tenant_id: tenantId, appointment_id: appointmentId, event_id: id,
      sync_state: 'synced', updated_at: new Date().toISOString(),
    }, { onConflict: 'appointment_id' });
    if (error && accion !== 'DELETE') throw error;
    return 'sincronizado';
  } catch (error) {
    if (accion !== 'DELETE') await admin.from('alma_google_calendar_events').upsert({
      tenant_id: tenantId, appointment_id: appointmentId, event_id: id,
      sync_state: 'error', updated_at: new Date().toISOString(),
    }, { onConflict: 'appointment_id' });
    throw error;
  }
}
