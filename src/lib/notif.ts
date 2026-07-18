/** Tipos de la campanita de notificaciones (fuera de la server action). */

import type { Estado } from '@/lib/turno';

export type NotifTurno = {
  id: string;
  fecha: string; // ISO
  hora: string; // 'HH:MM'
  paciente: string;
  estado: Estado;
  nuevo: boolean; // reserva posterior a la última vez que el profesional miró
};

export type NotifData = { count: number; items: NotifTurno[] };
