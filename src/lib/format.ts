/** Formateo de dinero y hora para la UI (siempre con clase .tnum tabular). */

/** Pesos argentinos sin decimales: 15000 → "$15.000". */
export function pesos(n: number): string {
  return '$' + new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(n);
}

/** El tipo `time` de Postgres vuelve como "09:00:00"; lo dejamos en "09:00". */
export function horaCorta(hora: string): string {
  return hora.slice(0, 5);
}
