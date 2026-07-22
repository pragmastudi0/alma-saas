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

/** Días completos entre dos fechas ISO (positivo si `hasta` es posterior). */
export function diasEntre(desde: string, hasta: string): number {
  const [y1, m1, d1] = desde.split('-').map(Number);
  const [y2, m2, d2] = hasta.split('-').map(Number);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86400000);
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

/** Día de la semana (0=domingo … 6=sábado) de una fecha ISO. */
export function diaSemanaDe(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/**
 * Matriz de semanas del mes (lunes primero). Cada celda es la fecha ISO
 * o null si cae fuera del mes. Todas las filas tienen 7 celdas.
 */
export function semanasDelMes(ym: string): (string | null)[][] {
  const [y, m] = ym.split('-').map(Number);
  const diasEnMes = new Date(Date.UTC(y, m, 0)).getUTCDate();

  const celdas: (string | null)[] = [];
  // Índice lunes-first del día 1: lunes=0 … domingo=6.
  const padInicial = (new Date(Date.UTC(y, m - 1, 1)).getUTCDay() + 6) % 7;
  for (let i = 0; i < padInicial; i++) celdas.push(null);
  for (let d = 1; d <= diasEnMes; d++) {
    celdas.push(`${ym}-${String(d).padStart(2, '0')}`);
  }
  while (celdas.length % 7 !== 0) celdas.push(null);

  const semanas: (string | null)[][] = [];
  for (let i = 0; i < celdas.length; i += 7) {
    semanas.push(celdas.slice(i, i + 7));
  }
  return semanas;
}

/** Etiqueta relativa cálida cuando aplica: "hoy", "mañana", "ayer". */
export function etiquetaRelativa(iso: string, tz: string = TZ_DEFAULT): string | null {
  const hoy = hoyISO(tz);
  if (iso === hoy) return 'hoy';
  if (iso === addDias(hoy, 1)) return 'mañana';
  if (iso === addDias(hoy, -1)) return 'ayer';
  return null;
}
