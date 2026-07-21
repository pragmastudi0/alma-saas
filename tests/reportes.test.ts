/** Reportes: las agregaciones puras del mes cierran con los turnos de entrada. */
import { describe, expect, it } from 'vitest';
import {
  conteoEstados,
  resumenPorClave,
  senasCobradas,
  tasaAusentismo,
  topPacientes,
  variacionPct,
  type TurnoReporte,
} from '../src/lib/reportes';

function turno(sobre: Partial<TurnoReporte>): TurnoReporte {
  return {
    estado: 'completado',
    precio: 15000,
    sena_monto: 5000,
    sena_pagada: false,
    service_id: null,
    employee_id: null,
    patient_id: 'p1',
    ...sobre,
  };
}

describe('conteoEstados y tasaAusentismo', () => {
  it('cuenta por estado y agrupa pendiente_sena + confirmado como "en pie"', () => {
    const c = conteoEstados([
      turno({ estado: 'completado' }),
      turno({ estado: 'completado' }),
      turno({ estado: 'confirmado' }),
      turno({ estado: 'pendiente_sena' }),
      turno({ estado: 'cancelado' }),
      turno({ estado: 'ausente' }),
    ]);
    expect(c).toEqual({ total: 6, completados: 2, enPie: 2, cancelados: 1, ausentes: 1 });
  });

  it('ausentismo = ausentes sobre turnos cerrados, en % entero', () => {
    const c = conteoEstados([
      turno({ estado: 'completado' }),
      turno({ estado: 'completado' }),
      turno({ estado: 'completado' }),
      turno({ estado: 'ausente' }),
    ]);
    expect(tasaAusentismo(c)).toBe(25);
  });

  it('sin turnos cerrados no hay tasa que medir', () => {
    expect(tasaAusentismo(conteoEstados([turno({ estado: 'confirmado' })]))).toBeNull();
    expect(tasaAusentismo(conteoEstados([]))).toBeNull();
  });
});

describe('senasCobradas', () => {
  it('suma solo las señas pagadas', () => {
    const total = senasCobradas([
      turno({ sena_monto: 5000, sena_pagada: true }),
      turno({ sena_monto: 3000, sena_pagada: true, estado: 'confirmado' }),
      turno({ sena_monto: 9000, sena_pagada: false }),
    ]);
    expect(total).toBe(8000);
  });
});

describe('resumenPorClave', () => {
  it('agrupa solo completados, ignora sin asignar y ordena por facturado', () => {
    const nombres = new Map([
      ['s1', 'Consulta'],
      ['s2', 'Tratamiento'],
    ]);
    const filas = resumenPorClave(
      [
        turno({ service_id: 's1', precio: 10000 }),
        turno({ service_id: 's1', precio: 10000 }),
        turno({ service_id: 's2', precio: 30000 }),
        turno({ service_id: 's1', precio: 10000, estado: 'cancelado' }),
        turno({ service_id: null, precio: 99000 }),
      ],
      'service_id',
      nombres,
    );
    expect(filas).toEqual([
      { id: 's2', nombre: 'Tratamiento', cantidad: 1, facturado: 30000 },
      { id: 's1', nombre: 'Consulta', cantidad: 2, facturado: 20000 },
    ]);
  });
});

describe('topPacientes', () => {
  it('ordena por visitas completadas y recorta al máximo pedido', () => {
    const nombres = new Map([
      ['p1', 'Valentina Ríos'],
      ['p2', 'Julián Soto'],
    ]);
    const top = topPacientes(
      [
        turno({ patient_id: 'p1' }),
        turno({ patient_id: 'p1' }),
        turno({ patient_id: 'p2' }),
        turno({ patient_id: 'p2', estado: 'ausente' }),
      ],
      nombres,
      1,
    );
    expect(top).toEqual([{ id: 'p1', nombre: 'Valentina Ríos', visitas: 2 }]);
  });
});

describe('variacionPct', () => {
  it('calcula la variación entera contra el mes anterior', () => {
    expect(variacionPct(150, 100)).toBe(50);
    expect(variacionPct(50, 100)).toBe(-50);
    expect(variacionPct(100, 100)).toBe(0);
  });

  it('sin base de comparación devuelve null', () => {
    expect(variacionPct(100, 0)).toBeNull();
  });
});
