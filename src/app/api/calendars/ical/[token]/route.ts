/**
 * GET /api/calendars/ical/:token
 * Endpoint público que sirve un feed iCal (.ics)
 * El token es un UUID opaco que se obtiene vía POST /api/calendars/subscribe
 *
 * Características:
 * - Acceso público (sin autenticación)
 * - Validación de token
 * - Caché HTTP con ETag basado en timestamp de actualizaciones
 * - Timezone: America/Argentina/Buenos_Aires
 *
 * Nota: No usamos ISR (revalidate) porque interfiere con la invalidación
 * de caché cuando se crean nuevos eventos. En su lugar, confiamos en:
 * 1. ETag que cambia cuando appointments se actualizan
 * 2. Calendar apps que respetan If-None-Match
 * 3. HTTP Cache-Control con max-age corto (1 minuto)
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateICalendar, calculateICalHash } from '@/lib/ical-generator';
import { getTenantFromSubscriptionToken, getAppointmentsForCalendar } from '@/lib/calendar-sync';

// Deshabilitamos ISR para este endpoint — queremos que sea dinámico
// para que el ETag cambie cuando hay nuevos eventos
export const revalidate = false;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  try {
    // 1. Validar token y obtener tenant ID
    const tenantId = await getTenantFromSubscriptionToken(token);

    if (!tenantId) {
      // No exponemos información sobre la validez del token
      return new NextResponse(null, { status: 404 });
    }

    // 2. Obtener turnos del tenant
    // Incluir un rango de fechas: últimos 30 días + próximos 365 días
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - 30);
    const endDate = new Date(today);
    endDate.setFullYear(endDate.getFullYear() + 1);

    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    const appointments = await getAppointmentsForCalendar(tenantId, startDateStr, endDateStr);

    // 3. Generar iCal
    const icalContent = generateICalendar(appointments);

    // 4. Calcular ETag basado en contenido + timestamp más reciente
    // Esto asegura que el ETag cambie cuando hay nuevos eventos
    const latestUpdate = appointments.length > 0
      ? Math.max(...appointments.map((a) => new Date(a.updated_at).getTime()))
      : Date.now();
    const etagInput = `${calculateICalHash(icalContent)}-${latestUpdate}`;
    const etag = `"${etagInput}"`;

    // 5. Verificar If-None-Match (caché del cliente)
    const ifNoneMatch = req.headers.get('if-none-match');
    if (ifNoneMatch === etag) {
      // Cliente ya tiene la versión actual
      return new NextResponse(null, { status: 304 });
    }

    // 6. Servir iCal con headers de caché inteligentes
    // max-age=60 (1 minuto) — las apps de calendario normalmente polling cada 15-30 min
    // pero no queremos que pierdan eventos por más de 1 minuto
    const response = new NextResponse(icalContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': 'attachment; filename="alma-calendar.ics"',
        'Cache-Control': 'public, max-age=60, must-revalidate', // 1 minuto en lugar de 5
        'ETag': etag,
        'X-Content-Type-Options': 'nosniff',
      },
    });

    return response;
  } catch (error) {
    console.error('[iCal API] Error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
