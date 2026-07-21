/** Cancelación por WhatsApp: la plantilla rinde bien sus placeholders. */
import { describe, expect, it } from 'vitest';
import { PLANTILLA_CANCELACION_DEFAULT, mensajeCancelacion } from '../src/lib/whatsapp';

const DATOS = { nombre: 'Valentina', fecha: 'jueves 16 de julio', hora: '10:00' };

describe('mensajeCancelacion', () => {
  it('reemplaza {nombre}, {fecha} y {hora}', () => {
    const msg = mensajeCancelacion('Hola {nombre}, cancelo el {fecha} a las {hora}.', DATOS);
    expect(msg).toBe('Hola Valentina, cancelo el jueves 16 de julio a las 10:00.');
  });

  it('con plantilla vacía o en blanco usa la de fábrica', () => {
    const esperado = mensajeCancelacion(PLANTILLA_CANCELACION_DEFAULT, DATOS);
    expect(mensajeCancelacion('', DATOS)).toBe(esperado);
    expect(mensajeCancelacion('   ', DATOS)).toBe(esperado);
    expect(esperado).toContain('Valentina');
    expect(esperado).not.toContain('{');
  });

  it('reemplaza todas las apariciones de un mismo placeholder', () => {
    const msg = mensajeCancelacion('{nombre} {nombre}', DATOS);
    expect(msg).toBe('Valentina Valentina');
  });

  it('una plantilla sin placeholders queda tal cual', () => {
    const msg = mensajeCancelacion('Tengo que cancelar tu turno, te escribo.', DATOS);
    expect(msg).toBe('Tengo que cancelar tu turno, te escribo.');
  });
});
