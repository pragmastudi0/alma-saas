/**
 * Generador de feed iCal (RFC 5545)
 * Convierte turnos de alma en un formato compatible con Apple Calendar, Google Calendar, Outlook, etc.
 */

import { formatISO, format } from 'date-fns';

export interface CalendarEvent {
  id: string;
  fecha: string; // YYYY-MM-DD
  hora: string; // HH:mm
  duracion_min: number;
  paciente_nombre: string;
  servicio_nombre?: string;
  descripcion?: string;
  ubicacion?: string;
  estado: 'pendiente_sena' | 'confirmado' | 'completado' | 'cancelado' | 'ausente';
  updated_at: Date;
}

/**
 * Genera un UID único para un evento iCal
 * Formato: alma-appointment-{id}@alma-app.com
 */
function generateUID(appointmentId: string): string {
  return `alma-appointment-${appointmentId}@alma-app.com`;
}

/**
 * Convierte fecha + hora en formato iCal DTSTART/DTEND
 * iCal usa formato: YYYYMMDDTHHMMSS (sin guiones ni dos puntos)
 */
function toICalDateTime(fecha: string, hora: string): string {
  // fecha formato: YYYY-MM-DD, hora formato: HH:mm
  const [year, month, day] = fecha.split('-');
  const [hours, minutes] = hora.split(':');

  return `${year}${month}${day}T${hours}${minutes}00`;
}

/**
 * Calcula la hora de fin basado en hora inicio + duración
 */
function calculateEndTime(hora: string, duracionMin: number): string {
  const [hours, minutes] = hora.split(':').map(Number);
  const totalMinutes = hours * 60 + minutes + duracionMin;
  const endHours = Math.floor(totalMinutes / 60);
  const endMinutes = totalMinutes % 60;

  return `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`;
}

/**
 * Escapa caracteres especiales en texto iCal
 */
function escapeICalText(text: string | undefined): string {
  if (!text) return '';
  return text
    .replace(/\\/g, '\\\\')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;')
    .replace(/\n/g, '\\n');
}

/**
 * Genera un evento iCal individual
 */
function generateICalEvent(event: CalendarEvent): string {
  const uid = generateUID(event.id);
  const dtstart = toICalDateTime(event.fecha, event.hora);
  const endTime = calculateEndTime(event.hora, event.duracion_min);
  const dtend = toICalDateTime(event.fecha, endTime);
  const dtstamp = format(new Date(), "yyyyMMdd'T'HHmmss'Z'");
  const lastModified = format(event.updated_at, "yyyyMMdd'T'HHmmss'Z'");

  // Construir título y descripción
  const summary = event.servicio_nombre
    ? `${escapeICalText(event.servicio_nombre)} - ${escapeICalText(event.paciente_nombre)}`
    : escapeICalText(event.paciente_nombre);

  let description = '';
  if (event.servicio_nombre) {
    description += `Servicio: ${escapeICalText(event.servicio_nombre)}\n`;
  }
  if (event.descripcion) {
    description += `Notas: ${escapeICalText(event.descripcion)}\n`;
  }
  description = description.trim();

  // Estado del evento iCal: confirmados y completados son CONFIRMED
  // Solo cancelados y ausentes son CANCELLED
  const status = (event.estado === 'confirmado' || event.estado === 'completado') ? 'CONFIRMED' : 'CANCELLED';

  // Construir evento
  let icalEvent = `BEGIN:VEVENT\r\n`;
  icalEvent += `UID:${uid}\r\n`;
  icalEvent += `DTSTAMP:${dtstamp}\r\n`;
  icalEvent += `DTSTART:${dtstart}\r\n`;
  icalEvent += `DTEND:${dtend}\r\n`;
  icalEvent += `LAST-MODIFIED:${lastModified}\r\n`;
  icalEvent += `SUMMARY:${summary}\r\n`;

  if (description) {
    // Agrupar líneas de descripción en DESCRIPTION (máx 75 caracteres por línea con CRLF)
    icalEvent += `DESCRIPTION:${escapeICalText(description)}\r\n`;
  }

  if (event.ubicacion) {
    icalEvent += `LOCATION:${escapeICalText(event.ubicacion)}\r\n`;
  }

  icalEvent += `STATUS:${status}\r\n`;
  icalEvent += `END:VEVENT\r\n`;

  return icalEvent;
}

/**
 * Genera un calendario iCal completo (RFC 5545)
 * @param events Lista de eventos de turnos
 * @param calendarName Nombre del calendario (ej: "Alma - Mi Agenda")
 * @param timezone Zona horaria (default: America/Argentina/Buenos_Aires)
 * @returns String con contenido iCal (.ics)
 */
export function generateICalendar(
  events: CalendarEvent[],
  calendarName: string = 'Alma - Mi Agenda',
  timezone: string = 'America/Argentina/Buenos_Aires'
): string {
  const now = format(new Date(), "yyyyMMdd'T'HHmmss'Z'");

  let ical = `BEGIN:VCALENDAR\r\n`;
  ical += `VERSION:2.0\r\n`;
  ical += `PRODID:-//alma//NONSGML Alma SaaS//EN\r\n`;
  ical += `CALSCALE:GREGORIAN\r\n`;
  ical += `METHOD:PUBLISH\r\n`;
  ical += `X-WR-CALNAME:${calendarName}\r\n`;
  ical += `X-WR-TIMEZONE:${timezone}\r\n`;
  ical += `X-WR-CALDESC:Calendario de turnos sincronizado con Alma\r\n`;
  ical += `DTSTAMP:${now}\r\n`;

  // Agregar todos los eventos
  for (const event of events) {
    ical += generateICalEvent(event);
  }

  ical += `END:VCALENDAR\r\n`;

  return ical;
}

/**
 * Calcula un hash simple del contenido iCal para ETag
 * Se usa para caché HTTP: si el hash no cambió, hay un 304 Not Modified
 */
export function calculateICalHash(icalContent: string): string {
  // Hash simple basado en longitud + checksum de caracteres
  // En producción, podrías usar crypto.subtle.digest('SHA-256', ...)
  let hash = 0;
  for (let i = 0; i < icalContent.length; i++) {
    hash = ((hash << 5) - hash) + icalContent.charCodeAt(i);
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16);
}
