/** Tipos compartidos del turno (fuera de la server action, que solo exporta funciones). */

export type Estado = 'pendiente_sena' | 'confirmado' | 'completado' | 'cancelado' | 'ausente';

export type AgendaState = { error?: string; info?: string };
