/** Formateo de dinero y hora para la UI (siempre con clase .tnum tabular). */

/** Pesos argentinos: los enteros no muestran centavos y los decimales no se redondean a enteros. */
export function pesos(n: number): string {
  return '$' + new Intl.NumberFormat('es-AR', { maximumFractionDigits: 2 }).format(n);
}

/** El tipo `time` de Postgres vuelve como "09:00:00"; lo dejamos en "09:00". */
export function horaCorta(hora: string): string {
  return hora.slice(0, 5);
}
