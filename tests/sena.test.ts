/**
 * Modo de cobro de seña: es lo que decide con qué estado nace un turno,
 * tanto en el alta desde la app como en la reserva pública del portal.
 * Funciones puras, sin base de datos.
 */
import { describe, expect, it } from 'vitest';
import {
  SENA_MODO_DEFAULT,
  estadoInicial,
  montoSenaEfectivo,
  permiteConfirmarSinSena,
  senaModoDe,
} from '../src/lib/sena';

describe('senaModoDe', () => {
  it('cae en obligatoria cuando el tenant no tiene el ajuste', () => {
    expect(senaModoDe({})).toBe('obligatoria');
    expect(senaModoDe(null)).toBe('obligatoria');
    expect(senaModoDe(undefined)).toBe('obligatoria');
  });

  it('ignora valores que no son un modo válido', () => {
    expect(senaModoDe({ sena_modo: 'siempre' })).toBe('obligatoria');
    expect(senaModoDe({ sena_modo: 42 })).toBe('obligatoria');
    expect(senaModoDe('no es un objeto')).toBe('obligatoria');
  });

  it('lee los tres modos', () => {
    expect(senaModoDe({ sena_modo: 'no' })).toBe('no');
    expect(senaModoDe({ sena_modo: 'opcional' })).toBe('opcional');
    expect(senaModoDe({ sena_modo: 'obligatoria' })).toBe('obligatoria');
  });

  it('el default reproduce el comportamiento previo al ajuste', () => {
    expect(SENA_MODO_DEFAULT).toBe('obligatoria');
  });
});

describe('montoSenaEfectivo', () => {
  it('sin cobro de seña, cualquier monto va a cero', () => {
    expect(montoSenaEfectivo(5000, 'no')).toBe(0);
    expect(montoSenaEfectivo(0, 'no')).toBe(0);
  });

  it('respeta el monto cuando el profesional cobra seña', () => {
    expect(montoSenaEfectivo(5000, 'obligatoria')).toBe(5000);
    expect(montoSenaEfectivo(5000, 'opcional')).toBe(5000);
  });

  it('normaliza montos negativos o inválidos a cero', () => {
    expect(montoSenaEfectivo(-100, 'obligatoria')).toBe(0);
    expect(montoSenaEfectivo(Number.NaN, 'opcional')).toBe(0);
  });
});

describe('estadoInicial', () => {
  it('sin cobro de seña, el turno nace confirmado aunque llegue un monto', () => {
    expect(estadoInicial(5000, 'no')).toBe('confirmado');
    expect(estadoInicial(0, 'no')).toBe('confirmado');
  });

  it('con seña obligatoria queda esperando la seña', () => {
    expect(estadoInicial(5000, 'obligatoria')).toBe('pendiente_sena');
  });

  it('con seña opcional también nace pendiente (se puede mandar el link)', () => {
    expect(estadoInicial(5000, 'opcional')).toBe('pendiente_sena');
  });

  it('sin monto nace confirmado en cualquier modo que cobre seña', () => {
    expect(estadoInicial(0, 'obligatoria')).toBe('confirmado');
    expect(estadoInicial(0, 'opcional')).toBe('confirmado');
  });
});

describe('permiteConfirmarSinSena', () => {
  it('solo la seña obligatoria bloquea confirmar sin cobrar', () => {
    expect(permiteConfirmarSinSena('obligatoria')).toBe(false);
    expect(permiteConfirmarSinSena('opcional')).toBe(true);
    expect(permiteConfirmarSinSena('no')).toBe(true);
  });
});
