/** D · Motor de slots del portal público: cálculo puro, sin DB. */
import { describe, expect, it } from 'vitest';
import { aMin, calcularSlots, deMin } from '../src/lib/slots';

const DISPO_MANANA = [{ desde: '09:00', hasta: '13:00' }];

describe('calcularSlots', () => {
  it('genera pasos de la duración dentro del rango', () => {
    const slots = calcularSlots({
      disponibilidad: DISPO_MANANA,
      ocupados: [],
      bloqueos: [],
      duracionMin: 60,
    });
    expect(slots).toEqual(['09:00', '10:00', '11:00', '12:00']);
  });

  it('descarta el último slot si no entra completo', () => {
    const slots = calcularSlots({
      disponibilidad: [{ desde: '09:00', hasta: '10:30' }],
      ocupados: [],
      bloqueos: [],
      duracionMin: 60,
    });
    expect(slots).toEqual(['09:00']); // 10:00–11:00 se pasa de 10:30
  });

  it('un turno ocupado elimina solo los slots que intersecta (adyacentes quedan)', () => {
    const slots = calcularSlots({
      disponibilidad: DISPO_MANANA,
      ocupados: [{ hora: '10:00:00', duracion_min: 60 }],
      bloqueos: [],
      duracionMin: 60,
    });
    expect(slots).toEqual(['09:00', '11:00', '12:00']);
  });

  it('un ocupado desalineado voltea los dos slots que pisa', () => {
    const slots = calcularSlots({
      disponibilidad: DISPO_MANANA,
      ocupados: [{ hora: '10:30:00', duracion_min: 60 }],
      bloqueos: [],
      duracionMin: 60,
    });
    expect(slots).toEqual(['09:00', '12:00']);
  });

  it('respeta bloqueos parciales', () => {
    const slots = calcularSlots({
      disponibilidad: DISPO_MANANA,
      ocupados: [],
      bloqueos: [{ desde: '11:00', hasta: '12:00' }],
      duracionMin: 60,
    });
    expect(slots).toEqual(['09:00', '10:00', '12:00']);
  });

  it('bloqueo de día completo deja todo vacío', () => {
    const slots = calcularSlots({
      disponibilidad: DISPO_MANANA,
      ocupados: [],
      bloqueos: [{ desde: '00:00', hasta: '24:00' }],
      duracionMin: 60,
    });
    expect(slots).toEqual([]);
  });

  it('ahoraMin filtra los horarios que ya pasaron', () => {
    const slots = calcularSlots({
      disponibilidad: DISPO_MANANA,
      ocupados: [],
      bloqueos: [],
      duracionMin: 60,
      ahoraMin: aMin('10:15'),
    });
    expect(slots).toEqual(['11:00', '12:00']);
  });

  it('sin disponibilidad devuelve vacío', () => {
    expect(
      calcularSlots({ disponibilidad: [], ocupados: [], bloqueos: [], duracionMin: 60 }),
    ).toEqual([]);
  });

  it('varios rangos en el día se combinan ordenados', () => {
    const slots = calcularSlots({
      disponibilidad: [
        { desde: '14:00', hasta: '16:00' },
        { desde: '09:00', hasta: '10:00' },
      ],
      ocupados: [],
      bloqueos: [],
      duracionMin: 60,
    });
    expect(slots).toEqual(['09:00', '14:00', '15:00']);
  });
});

describe('aMin / deMin', () => {
  it('convierte ida y vuelta', () => {
    expect(aMin('09:30')).toBe(570);
    expect(aMin('09:30:00')).toBe(570);
    expect(deMin(570)).toBe('09:30');
    expect(deMin(0)).toBe('00:00');
  });
});
