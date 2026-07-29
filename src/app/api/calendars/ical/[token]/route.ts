/**
 * GET /api/calendars/ical/:token
 * Endpoint público que sirve un feed iCal (.ics)
 * El token es un UUID opaco que se obtiene vía POST /api/calendars/subscribe
 *
 * Características:
 * - Acceso público (sin autenticación)
 * - Validación de token
 * - Caché HTTP con ETag
 * - Timezone: America/Argentina/Buenos_Aires
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateICalendar, calculateICalHash } from '@/lib/ical-generator';
import { getTenantFromSubscriptionToken, getAppointmentsForCalendar } from '@/lib/calendar-sync';

export const revalidate = 300; // 5 minutos de caché a nivel de Next.js

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

    // 4. Calcular ETag para caché
    const etag = `"${calculateICalHash(icalContent)}"`;

    // 5. Verificar If-None-Match (caché del cliente)
    const ifNoneMatch = req.headers.get('if-none-match');
    if (ifNoneMatch === etag) {
      // Cliente ya tiene la versión actual
      return new NextResponse(null, { status: 304 });
    }

    // 6. Servir iCal con headers de caché
    const response = new NextResponse(icalContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': 'attachment; filename="alma-calendar.ics"',
        'Cache-Control': 'public, max-age=300, must-revalidate', // 5 minutos
        'ETag': etag,
      },
    });

    return response;
  } catch (error) {
    console.error('[iCal API] Error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
