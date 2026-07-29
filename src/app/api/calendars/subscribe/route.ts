/**
 * POST /api/calendars/subscribe
 * Endpoint autenticado que genera una URL de suscripción iCal para el usuario
 *
 * Flujo:
 * 1. Cliente autenticado llama a este endpoint
 * 2. Se verifica el tenant del usuario
 * 3. Si ya existe suscripción, se devuelve la existente
 * 4. Si no existe, se genera nuevo token y se guarda en BD
 * 5. Se devuelve la URL para que el usuario la agregue a su Apple Calendar
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { getSessionContext } from '@/lib/tenant';
import { v4 as uuidv4 } from 'uuid';

export async function POST(req: NextRequest) {
  try {
    // 1. Verificar autenticación y obtener contexto del tenant
    const context = await getSessionContext();

    if (!context) {
      return new NextResponse(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { tenantId } = context;

    // 2. Crear cliente Supabase con sesión del usuario (para respetar RLS)
    const supabase = await createServerSupabase();

    // 3. Verificar si ya existe una suscripción para este tenant
    const { data: existing, error: checkError } = await supabase
      .from('alma_calendar_subscriptions')
      .select('id, subscription_token')
      .eq('tenant_id', tenantId)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      // Error distinto de "no rows found"
      throw checkError;
    }

    let subscriptionToken: string;

    if (existing) {
      // Devolver la suscripción existente
      subscriptionToken = existing.subscription_token;
    } else {
      // Generar nuevo token (UUID v4)
      subscriptionToken = uuidv4();

      // Insertar en BD
      const { error: insertError } = await supabase
        .from('alma_calendar_subscriptions')
        .insert({
          tenant_id: tenantId,
          subscription_token: subscriptionToken,
          calendar_type: 'ical',
        });

      if (insertError) {
        throw insertError;
      }
    }

    // 4. Construir URL del feed iCal
    const baseUrl = req.nextUrl.origin;
    const icalUrl = `${baseUrl}/api/calendars/ical/${subscriptionToken}`;

    // 5. Devolver respuesta
    return NextResponse.json({
      subscription_token: subscriptionToken,
      ical_url: icalUrl,
      calendar_type: 'ical',
      instructions: 'Copia la URL arriba. En Apple Calendar: Settings → Calendar → Add Account → Other CalDAV Account → pega la URL como servidor.',
    });
  } catch (error) {
    console.error('[Calendar Subscribe] Error:', error);
    return new NextResponse(
      JSON.stringify({ error: 'Internal Server Error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
