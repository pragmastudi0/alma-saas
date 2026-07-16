/** Tipos y constantes de la disponibilidad semanal (tabla alma_availability). */

export type DisponibilidadDia = {
  dia_semana: number; // 0=domingo … 6=sábado (convención de la tabla y de Date.getUTCDay)
  hora_desde: string; // 'HH:MM'
  hora_hasta: string;
};

export type DisponibilidadState = { error?: string; info?: string };

/** Orden de la UI: lunes primero. */
export const ORDEN_DIAS = [1, 2, 3, 4, 5, 6, 0] as const;

export const NOMBRES_DIAS = [
  'domingo',
  'lunes',
  'martes',
  'miércoles',
  'jueves',
  'viernes',
  'sábado',
];
