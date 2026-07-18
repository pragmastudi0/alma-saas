/** Tipos compartidos del turno (fuera de la server action, que solo exporta funciones). */

export type Estado = 'pendiente_sena' | 'confirmado' | 'completado' | 'cancelado' | 'ausente';

export type AgendaState = { error?: string; info?: string };

export type MpLinkState = { error?: string; link?: string };

/** Un turno ya agendado en un día (para ver qué está ocupado al agendar). */
export type TurnoOcupado = {
  hora: string; // 'HH:MM'
  duracion_min: number;
  paciente: string;
  estado: Estado;
};

/** Disponibilidad de un día: horarios libres + lo ya agendado. */
export type HorariosDia = {
  slots: string[];
  ocupados: TurnoOcupado[];
  atiende: boolean;
};
