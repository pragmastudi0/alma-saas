import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { cifrar } from '@/lib/crypto';
import { googleEventId, googleFechaFin, sincronizarGoogle } from '@/lib/google-calendar';

const id = '550e8400-e29b-41d4-a716-446655440000';
const estados: string[] = [];

const fakeAdmin = {
  from(table: string) {
    if (table === 'alma_google_calendar_accounts') return {
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: {
        access_token_enc: cifrar('token', 'GOOGLE_TOKEN_ENC_KEY'), refresh_token_enc: cifrar('refresh', 'GOOGLE_TOKEN_ENC_KEY'), expires_at: '2099-01-01T00:00:00Z',
      }, error: null }) }) }),
    };
    if (table === 'alma_appointments') return {
      select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: async () => ({ data: {
        id, fecha: '2026-11-03', hora: '14:30:00', duracion_min: 90, estado: 'confirmado', patient_id: 'p1', service_id: null,
      }, error: null }) }) }) }),
    };
    if (table === 'alma_tenants') return {
      select: () => ({ eq: () => ({ single: async () => ({ data: { timezone: 'America/Argentina/Buenos_Aires' }, error: null }) }) }),
    };
    if (table === 'alma_patients') return {
      select: () => ({ eq: () => ({ eq: () => ({ single: async () => ({ data: { nombre: 'Ana', apellido: 'Pérez' }, error: null }) }) }) }),
    };
    if (table === 'alma_google_calendar_events') return {
      upsert: async (value: { sync_state: string }) => { estados.push(value.sync_state); return { error: null }; },
    };
    throw new Error(`Unexpected table ${table}`);
  },
};

vi.mock('@/lib/supabase/admin', () => ({ createAdminSupabase: () => fakeAdmin as unknown as SupabaseClient }));

describe('Google Calendar', () => {
  beforeEach(() => {
    process.env.GOOGLE_TOKEN_ENC_KEY = Buffer.alloc(32, 7).toString('base64');
    estados.length = 0;
    vi.restoreAllMocks();
  });

  it('mantiene el mismo ID y calcula el nuevo fin', () => {
    expect(googleEventId(id)).toBe('alma550e8400e29b41d4a716446655440000');
    expect(googleFechaFin('2026-11-03', '14:30', 90)).toBe('2026-11-03T16:00:00');
    expect(googleFechaFin('2026-11-03', '23:30', 90)).toBe('2026-11-04T01:00:00');
  });

  it('actualiza solo el fin del evento existente sin duplicarlo', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}', { status: 200 }));
    await expect(sincronizarGoogle('tenant1', id, 'UPDATE', true)).resolves.toBe('sincronizado');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toContain(`/events/${googleEventId(id)}`);
    expect(options?.method).toBe('PATCH');
    expect(JSON.parse(String(options?.body))).toEqual({ end: {
      dateTime: '2026-11-03T16:00:00', timeZone: 'America/Argentina/Buenos_Aires',
    } });
    expect(estados).toEqual(['pending', 'synced']);
  });

  it('registra error y no informa éxito cuando Google falla', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}', { status: 500 }));
    await expect(sincronizarGoogle('tenant1', id, 'UPDATE', true)).rejects.toThrow('Google Calendar HTTP 500');
    expect(estados).toEqual(['pending', 'error']);
  });

  it('crea con ID determinista cuando todavía no existe en Google', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response('{}', { status: 404 }))
      .mockResolvedValueOnce(new Response('{}', { status: 200 }));
    await expect(sincronizarGoogle('tenant1', id, 'UPDATE')).resolves.toBe('sincronizado');
    expect(fetchMock.mock.calls.map(([, options]) => options?.method)).toEqual(['PATCH', 'POST']);
    const inserted = JSON.parse(String(fetchMock.mock.calls[1][1]?.body));
    expect(inserted.id).toBe(googleEventId(id));
    expect(inserted.summary).toBe('Ana Pérez');
  });
});
