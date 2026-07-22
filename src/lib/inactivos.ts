/**
 * Pacientes inactivos: hace X días o más que no tienen un turno.
 * El umbral se configura en Ajustes (settings.inactividad_dias del tenant).
 */

import { diasEntre } from '@/lib/fecha';

export const INACTIVIDAD_DIAS_DEFAULT = 60;

export type PacienteUltimoTurno = {
  id: string;
  nombre: string;
  telefono: string;
  /** Fecha ISO de alta del paciente. */
  creado: string;
  /** Fecha ISO del último turno no cancelado ni ausente; null si nunca tuvo uno. */
  ultimaFecha: string | null;
};

export type PacienteInactivo = PacienteUltimoTurno & {
  /** Días desde el último turno (o desde el alta, si nunca tuvo turnos). */
  dias: number;
  sinTurnos: boolean;
};

/**
 * Filtra los pacientes que llevan `umbralDias` o más sin venir, ordenados
 * por más tiempo sin venir. Quien tiene un turno de hoy en adelante no cuenta
 * como inactivo. Para quien nunca tuvo turnos, cuenta desde su alta.
 */
export function pacientesInactivos(
  pacientes: PacienteUltimoTurno[],
  umbralDias: number,
  hoy: string,
): PacienteInactivo[] {
  const res: PacienteInactivo[] = [];
  for (const p of pacientes) {
    // Con turno agendado a futuro no hay nada que reactivar.
    if (p.ultimaFecha !== null && p.ultimaFecha >= hoy) continue;
    const referencia = p.ultimaFecha ?? p.creado;
    const dias = diasEntre(referencia, hoy);
    if (dias >= umbralDias) {
      res.push({ ...p, dias, sinTurnos: p.ultimaFecha === null });
    }
  }
  return res.sort((a, b) => b.dias - a.dias);
}
