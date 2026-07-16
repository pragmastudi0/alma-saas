/**
 * Helpers de fecha para la agenda. Todo en formato ISO 'YYYY-MM-DD'
 * y aritmética por componentes (nada de toISOString crudo sobre "ahora"),
 * para no derivar de día al cruzar medianoche.
 */

export const TZ_DEFAULT = 'America/Argentina/Buenos_Aires';

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

/** Fecha de hoy (ISO) en el timezone del profesional. */
export function hoyISO(tz: string = TZ_DEFAULT): string {
  // en-CA formatea como YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

/** Suma (o resta) días a una fecha ISO, sin drift por DST. */
export function addDias(iso: string, n: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

/** Etiqueta humana: "jueves 16 de julio". */
export function etiquetaDia(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return `${DIAS[dow]} ${d} de ${MESES[m - 1]}`;
}

/** Etiqueta relativa cálida cuando aplica: "hoy", "mañana", "ayer". */
export function etiquetaRelativa(iso: string, tz: string = TZ_DEFAULT): string | null {
  const hoy = hoyISO(tz);
  if (iso === hoy) return 'hoy';
  if (iso === addDias(hoy, 1)) return 'mañana';
  if (iso === addDias(hoy, -1)) return 'ayer';
  return null;
}
