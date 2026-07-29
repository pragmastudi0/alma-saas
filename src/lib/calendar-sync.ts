/**
 * Lógica de sincronización de calendarios
 * Cuando se crea/actualiza/elimina un turno, se invoca este módulo
 * para invalidar cachés de feed iCal
 */

import { createClient } from '@supabase/supabase-js';

/**
 * Invalida el caché del feed iCal para un tenant
 * En Vercel, se puede usar KV para almacenar ETag/caché
 * Por ahora, simplemente registramos que hubo un cambio
 * (el endpoint `/api/calendars/ical/[token]` verificará updated_at)
 */
export async function invalidateCalendarCache(tenantId: string): Promise<void> {
  // Estrategia 1: usar Vercel KV (si está disponible)
  // Estrategia 2: confiar en HTTP cache headers + ETag
  // Estrategia 3: guardar timestamp en BD para comparar

  // Por ahora, simplemente no cacheamos en BD
  // El endpoint de iCal verificará últimas modificaciones de turnos

  console.log(`[CalendarSync] Invalidando caché para tenant: ${tenantId}`);
}

/**
 * Sincroniza cambios de turnos a calendario
 * Se llama desde server actions de crear/editar/cancelar turno
 */
export async function syncToCalendar(
  action: 'CREATE' | 'UPDATE' | 'DELETE',
  appointmentId: string,
  tenantId: string
): Promise<void> {
  try {
    // 1. Obtener datos del turno (para auditoría opcional)
    // 2. Invalidar caché
    await invalidateCalendarCache(tenantId);

    // 3. Log opcional (útil para debugging)
    console.log(`[CalendarSync] ${action} appointment ${appointmentId} for tenant ${tenantId}`);
  } catch (error) {
    console.error(`[CalendarSync] Error syncing calendar:`, error);
    // No lanzamos error: sincronización de calendario es no-crítica
    // Si falla, el usuario verá cambios normalmente en alma
  }
}

/**
 * Obtiene el tenant ID desde un subscription token
 * Se usa en el endpoint público de iCal para resolver qué turnos servir
 */
export async function getTenantFromSubscriptionToken(
  subscriptionToken: string
): Promise<string | null> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data, error } = await supabase
    .from('alma_calendar_subscriptions')
    .select('tenant_id')
    .eq('subscription_token', subscriptionToken)
    .single();

  if (error) {
    console.error('[CalendarSync] Error resolving subscription token:', error);
    return null;
  }

  return data?.tenant_id ?? null;
}

/**
 * Obtiene todos los turnos para un tenant en formato de calendario
 */
export async function getAppointmentsForCalendar(
  tenantId: string,
  startDate?: string,
  endDate?: string
) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Consulta básica: todos los turnos confirmados del tenant
  let query = supabase
    .from('alma_appointments')
    .select(
      `
      id,
      fecha,
      hora,
      duracion_min,
      estado,
      updated_at,
      alma_patients (nombre),
      alma_services (nombre)
    `
    )
    .eq('tenant_id', tenantId)
    .not('patient_id', 'is', null);

  // Filtrar por rango de fechas si se especifica (opcional)
  if (startDate) {
    query = query.gte('fecha', startDate);
  }
  if (endDate) {
    query = query.lte('fecha', endDate);
  }

  // Ordenar por fecha descendente
  query = query.order('fecha', { ascending: false });

  const { data, error } = await query;

  if (error) {
    console.error('[CalendarSync] Error fetching appointments:', error);
    throw error;
  }

  return (data ?? []).map((apt: any) => ({
    id: apt.id,
    fecha: apt.fecha,
    hora: apt.hora,
    duracion_min: apt.duracion_min,
    paciente_nombre: apt.alma_patients?.nombre || 'Sin nombre',
    servicio_nombre: apt.alma_services?.nombre,
    estado: apt.estado,
    updated_at: new Date(apt.updated_at),
  }));
}
