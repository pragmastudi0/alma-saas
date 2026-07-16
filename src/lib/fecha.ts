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

/** Mes (YYYY-MM) de una fecha ISO. */
export function mesDe(iso: string): string {
  return iso.slice(0, 7);
}

/** Mes actual (YYYY-MM) en el timezone del profesional. */
export function mesActual(tz: string = TZ_DEFAULT): string {
  return hoyISO(tz).slice(0, 7);
}

/** Suma (o resta) meses a un YYYY-MM. */
export function addMeses(ym: string, n: number): string {
  const [y, m] = ym.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1 + n, 1)).toISOString().slice(0, 7);
}

/** Etiqueta humana del mes: "julio 2026". */
export function etiquetaMes(ym: string): string {
  const [y, m] = ym.split('-').map(Number);
  return `${MESES[m - 1]} ${y}`;
}

/** Rango [desde, hasta) para filtrar un mes por columna date. */
export function rangoMes(ym: string): { desde: string; hasta: string } {
  return { desde: `${ym}-01`, hasta: `${addMeses(ym, 1)}-01` };
}

/** Etiqueta relativa cálida cuando aplica: "hoy", "mañana", "ayer". */
export function etiquetaRelativa(iso: string, tz: string = TZ_DEFAULT): string | null {
  const hoy = hoyISO(tz);
  if (iso === hoy) return 'hoy';
  if (iso === addDias(hoy, 1)) return 'mañana';
  if (iso === addDias(hoy, -1)) return 'ayer';
  return null;
}
