/** C · Grilla mensual: semanasDelMes arma la matriz lunes-first correcta. */
import { describe, expect, it } from 'vitest';
import { diaSemanaDe, semanasDelMes } from '../src/lib/fecha';

describe('semanasDelMes', () => {
  it('todas las filas tienen 7 celdas', () => {
    for (const ym of ['2026-01', '2026-02', '2026-06', '2026-07', '2024-02']) {
      for (const semana of semanasDelMes(ym)) {
        expect(semana).toHaveLength(7);
      }
    }
  });

  it('mes que empieza lunes: sin padding inicial (junio 2026)', () => {
    const semanas = semanasDelMes('2026-06');
    expect(semanas[0][0]).toBe('2026-06-01');
    expect(semanas[0][6]).toBe('2026-06-07');
  });

  it('mes que empieza domingo: 6 celdas de padding (marzo 2026)', () => {
    const semanas = semanasDelMes('2026-03');
    expect(semanas[0].slice(0, 6)).toEqual([null, null, null, null, null, null]);
    expect(semanas[0][6]).toBe('2026-03-01');
  });

  it('febrero bisiesto llega al 29 (2024)', () => {
    const dias = semanasDelMes('2024-02').flat().filter(Boolean);
    expect(dias[dias.length - 1]).toBe('2024-02-29');
    expect(dias).toHaveLength(29);
  });

  it('febrero no bisiesto llega al 28 (2026)', () => {
    const dias = semanasDelMes('2026-02').flat().filter(Boolean);
    expect(dias[dias.length - 1]).toBe('2026-02-28');
  });

  it('contiene todos los días del mes en orden', () => {
    const dias = semanasDelMes('2026-07').flat().filter(Boolean);
    expect(dias).toHaveLength(31);
    expect(dias[0]).toBe('2026-07-01');
    expect(dias[30]).toBe('2026-07-31');
  });
});

describe('diaSemanaDe', () => {
  it('devuelve 0=domingo … 6=sábado', () => {
    expect(diaSemanaDe('2026-07-16')).toBe(4); // jueves
    expect(diaSemanaDe('2026-07-19')).toBe(0); // domingo
    expect(diaSemanaDe('2026-07-20')).toBe(1); // lunes
  });
});
