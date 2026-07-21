/** Pacientes inactivos: el umbral de días decide quién aparece y en qué orden. */
import { describe, expect, it } from 'vitest';
import { diasEntre } from '../src/lib/fecha';
import { pacientesInactivos, type PacienteUltimoTurno } from '../src/lib/inactivos';

const HOY = '2026-07-21';

function paciente(sobre: Partial<PacienteUltimoTurno>): PacienteUltimoTurno {
  return {
    id: 'p1',
    nombre: 'Valentina Ríos',
    telefono: '11 5555 0001',
    creado: '2025-01-10',
    ultimaFecha: null,
    ...sobre,
  };
}

describe('diasEntre', () => {
  it('cuenta días completos entre fechas ISO', () => {
    expect(diasEntre('2026-07-01', '2026-07-21')).toBe(20);
    expect(diasEntre('2026-07-21', '2026-07-21')).toBe(0);
    expect(diasEntre('2026-05-22', '2026-07-21')).toBe(60);
  });

  it('cruza meses y años bisiestos sin drift', () => {
    expect(diasEntre('2024-02-28', '2024-03-01')).toBe(2);
    expect(diasEntre('2025-12-31', '2026-01-01')).toBe(1);
  });
});

describe('pacientesInactivos', () => {
  it('incluye a quien pasó el umbral y excluye a quien vino hace poco', () => {
    const res = pacientesInactivos(
      [
        paciente({ id: 'a', ultimaFecha: '2026-05-01' }),
        paciente({ id: 'b', ultimaFecha: '2026-07-10' }),
      ],
      60,
      HOY,
    );
    expect(res.map((p) => p.id)).toEqual(['a']);
    expect(res[0].dias).toBe(diasEntre('2026-05-01', HOY));
    expect(res[0].sinTurnos).toBe(false);
  });

  it('el umbral es inclusivo: justo en el límite ya cuenta', () => {
    const res = pacientesInactivos([paciente({ ultimaFecha: '2026-05-22' })], 60, HOY);
    expect(res).toHaveLength(1);
    expect(res[0].dias).toBe(60);
  });

  it('con turno de hoy en adelante no es inactivo, aunque haga meses que no viene', () => {
    const res = pacientesInactivos([paciente({ ultimaFecha: '2026-09-01' })], 60, HOY);
    expect(res).toEqual([]);
  });

  it('sin turnos, cuenta desde el alta del paciente', () => {
    const res = pacientesInactivos(
      [
        paciente({ id: 'viejo', creado: '2026-01-01', ultimaFecha: null }),
        paciente({ id: 'nuevo', creado: '2026-07-15', ultimaFecha: null }),
      ],
      60,
      HOY,
    );
    expect(res.map((p) => p.id)).toEqual(['viejo']);
    expect(res[0].sinTurnos).toBe(true);
  });

  it('ordena por más tiempo sin venir primero', () => {
    const res = pacientesInactivos(
      [
        paciente({ id: 'a', ultimaFecha: '2026-04-01' }),
        paciente({ id: 'b', ultimaFecha: '2026-02-01' }),
        paciente({ id: 'c', creado: '2025-06-01', ultimaFecha: null }),
      ],
      30,
      HOY,
    );
    expect(res.map((p) => p.id)).toEqual(['c', 'b', 'a']);
  });
});
