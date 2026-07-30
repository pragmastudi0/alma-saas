/**
 * Modo de cobro de seña del profesional. Es la única fuente de verdad del
 * estado con el que nace un turno: lo usan tanto el alta desde la app como la
 * reserva pública del portal.
 *
 * - 'no'          → no cobra seña: el turno nace confirmado y el monto va a cero.
 * - 'opcional'    → puede pedir la seña, pero el turno se puede confirmar sin cobrarla.
 * - 'obligatoria' → sin seña no hay turno confirmado (el comportamiento histórico).
 */

import type { Estado } from '@/lib/turno';

export type SenaModo = 'no' | 'opcional' | 'obligatoria';

/** Los dos únicos estados con los que puede nacer un turno. */
export type EstadoInicial = Extract<Estado, 'pendiente_sena' | 'confirmado'>;

/** El default reproduce el comportamiento previo al ajuste: la seña manda. */
export const SENA_MODO_DEFAULT: SenaModo = 'obligatoria';

export const SENA_MODOS: SenaModo[] = ['no', 'opcional', 'obligatoria'];

function esModo(v: unknown): v is SenaModo {
  return v === 'no' || v === 'opcional' || v === 'obligatoria';
}

/** Lee el modo del jsonb de settings del tenant, con fallback al default. */
export function senaModoDe(settings: unknown): SenaModo {
  if (!settings || typeof settings !== 'object') return SENA_MODO_DEFAULT;
  const v = (settings as Record<string, unknown>).sena_modo;
  return esModo(v) ? v : SENA_MODO_DEFAULT;
}

/**
 * Monto de seña que corresponde guardar en el turno. Si el profesional no
 * cobra seña, el monto se normaliza a cero: así ningún turno queda con una
 * seña colgada que después nadie va a cobrar.
 */
export function montoSenaEfectivo(monto: number, modo: SenaModo): number {
  if (modo === 'no') return 0;
  if (!Number.isFinite(monto) || monto <= 0) return 0;
  return monto;
}

/**
 * Estado con el que nace un turno. En 'opcional' el turno igual nace
 * pendiente_sena cuando hay monto (para poder mandar el link de pago); la
 * diferencia con 'obligatoria' es que existe la salida `confirmarSinSena`.
 */
export function estadoInicial(senaMonto: number, modo: SenaModo): EstadoInicial {
  return montoSenaEfectivo(senaMonto, modo) > 0 ? 'pendiente_sena' : 'confirmado';
}

/** Si el profesional puede confirmar un turno sin haber cobrado la seña. */
export function permiteConfirmarSinSena(modo: SenaModo): boolean {
  return modo !== 'obligatoria';
}
