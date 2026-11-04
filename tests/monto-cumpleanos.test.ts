import { describe, expect, it, vi } from 'vitest';
import { montoConsultaSchema } from '@/lib/monto';
import { pesos } from '@/lib/format';
import { proximosCumpleanos, type PacienteCumpleanos } from '@/lib/cumpleanos';
import { mensajeCumpleanos, waLink } from '@/lib/whatsapp';
import { hoyISO } from '@/lib/fecha';

const paciente = (fecha_nacimiento: string): PacienteCumpleanos => ({
  id: 'p1', nombre: 'Ana', apellido: 'Pérez', telefono: '3511234567', fecha_nacimiento,
});

describe('monto de consulta', () => {
  it('conserva $60.539 exactamente', () => {
    const precio = montoConsultaSchema.parse('60539');
    expect(precio).toBe(60539);
    expect(pesos(precio)).toBe('$60.539');
  });
  it('acepta cero y rechaza fracciones y negativos', () => {
    expect(montoConsultaSchema.parse('0')).toBe(0);
    expect(montoConsultaSchema.safeParse('60539.5').success).toBe(false);
    expect(montoConsultaSchema.safeParse('-1').success).toBe(false);
  });
});

describe('cumpleaños', () => {
  it('usa la fecha local del profesional cerca de medianoche UTC', () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date('2026-11-04T01:00:00Z'));
      expect(hoyISO('America/Argentina/Cordoba')).toBe('2026-11-03');
      expect(proximosCumpleanos([paciente('1990-11-03')], hoyISO('America/Argentina/Cordoba'))[0].dias).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });
  it('calcula hoy y los próximos 30 días con la edad que cumplen', () => {
    const result = proximosCumpleanos([paciente('1990-11-03'), paciente('2000-12-03')], '2026-11-03');
    expect(result.map((c) => [c.fecha, c.edad, c.dias])).toEqual([
      ['2026-11-03', 36, 0], ['2026-12-03', 26, 30],
    ]);
  });
  it('pasa al año siguiente y excluye cumpleaños fuera de 30 días', () => {
    expect(proximosCumpleanos([paciente('1990-01-01')], '2026-12-20')[0].fecha).toBe('2027-01-01');
    expect(proximosCumpleanos([paciente('1990-04-01')], '2026-12-20')).toEqual([]);
  });
  it('muestra el 29 de febrero el 28 en años no bisiestos', () => {
    expect(proximosCumpleanos([paciente('2000-02-29')], '2027-02-28')[0]).toMatchObject({ fecha: '2027-02-28', edad: 27, dias: 0 });
    expect(proximosCumpleanos([paciente('2000-02-29')], '2028-02-28')[0].fecha).toBe('2028-02-29');
  });
  it('personaliza el saludo y codifica el enlace manual', () => {
    const mensaje = mensajeCumpleanos('Feliz cumple, {nombre} {apellido}!', paciente('1990-11-03'));
    expect(mensaje).toBe('Feliz cumple, Ana Pérez!');
    expect(waLink('3511234567', mensaje)).toContain('text=Feliz%20cumple%2C%20Ana%20P%C3%A9rez!');
  });
});
