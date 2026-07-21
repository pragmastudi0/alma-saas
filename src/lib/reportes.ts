/** Lógica pura del módulo de reportes: agregaciones sobre los turnos y la caja del mes. */

export type EstadoTurno = 'pendiente_sena' | 'confirmado' | 'completado' | 'cancelado' | 'ausente';

export type TurnoReporte = {
  estado: EstadoTurno;
  precio: number;
  sena_monto: number;
  sena_pagada: boolean;
  service_id: string | null;
  employee_id: string | null;
  patient_id: string;
};

export type ConteoEstados = {
  total: number;
  completados: number;
  /** Turnos todavía por atender: pendiente_sena + confirmado. */
  enPie: number;
  cancelados: number;
  ausentes: number;
};

export function conteoEstados(turnos: TurnoReporte[]): ConteoEstados {
  const c: ConteoEstados = { total: 0, completados: 0, enPie: 0, cancelados: 0, ausentes: 0 };
  for (const t of turnos) {
    c.total++;
    if (t.estado === 'completado') c.completados++;
    else if (t.estado === 'cancelado') c.cancelados++;
    else if (t.estado === 'ausente') c.ausentes++;
    else c.enPie++;
  }
  return c;
}

/**
 * Ausentismo = ausentes / (completados + ausentes), en % entero.
 * null si el mes no tiene turnos cerrados (nada para medir).
 */
export function tasaAusentismo(c: ConteoEstados): number | null {
  const cerrados = c.completados + c.ausentes;
  if (cerrados === 0) return null;
  return Math.round((c.ausentes / cerrados) * 100);
}

/** Señas que ya entraron, sobre los turnos del mes. */
export function senasCobradas(turnos: TurnoReporte[]): number {
  return turnos.reduce((s, t) => s + (t.sena_pagada ? t.sena_monto : 0), 0);
}

export type FilaResumen = { id: string; nombre: string; cantidad: number; facturado: number };

/**
 * Agrupa los turnos completados por servicio o por empleado.
 * Ignora los turnos sin asignación. Ordena por facturado descendente.
 */
export function resumenPorClave(
  turnos: TurnoReporte[],
  clave: 'service_id' | 'employee_id',
  nombres: Map<string, string>,
): FilaResumen[] {
  const filas = new Map<string, FilaResumen>();
  for (const t of turnos) {
    if (t.estado !== 'completado') continue;
    const id = t[clave];
    if (!id) continue;
    const fila = filas.get(id) ?? {
      id,
      nombre: nombres.get(id) ?? 'Sin nombre',
      cantidad: 0,
      facturado: 0,
    };
    fila.cantidad++;
    fila.facturado += t.precio;
    filas.set(id, fila);
  }
  return [...filas.values()].sort((a, b) => b.facturado - a.facturado);
}

export type TopPaciente = { id: string; nombre: string; visitas: number };

/** Pacientes con más turnos completados en el mes, de mayor a menor. */
export function topPacientes(
  turnos: TurnoReporte[],
  nombres: Map<string, string>,
  max = 5,
): TopPaciente[] {
  const visitas = new Map<string, number>();
  for (const t of turnos) {
    if (t.estado !== 'completado') continue;
    visitas.set(t.patient_id, (visitas.get(t.patient_id) ?? 0) + 1);
  }
  return [...visitas.entries()]
    .map(([id, n]) => ({ id, nombre: nombres.get(id) ?? 'Sin nombre', visitas: n }))
    .sort((a, b) => b.visitas - a.visitas)
    .slice(0, max);
}

/**
 * Variación porcentual entera de un monto contra el del mes anterior.
 * null si no hay base de comparación (mes anterior en cero).
 */
export function variacionPct(actual: number, anterior: number): number | null {
  if (anterior === 0) return null;
  return Math.round(((actual - anterior) / anterior) * 100);
}
