import { describe, it, expect } from 'vitest';
import { generateICalendar, calculateICalHash, type CalendarEvent } from '@/lib/ical-generator';

describe('iCal Generator', () => {
  it('should generate valid iCal with single event', () => {
    const events: CalendarEvent[] = [
      {
        id: '550e8400-e29b-41d4-a716-446655440000',
        fecha: '2026-07-29',
        hora: '14:30',
        duracion_min: 60,
        paciente_nombre: 'Juan Pérez',
        servicio_nombre: 'Consulta',
        descripcion: 'Primera consulta',
        ubicacion: 'Consultorio A',
        estado: 'confirmado',
        updated_at: new Date('2026-07-29T14:30:00Z'),
      },
    ];

    const ical = generateICalendar(events);

    expect(ical).toContain('BEGIN:VCALENDAR');
    expect(ical).toContain('END:VCALENDAR');
    expect(ical).toContain('VERSION:2.0');
    expect(ical).toContain('PRODID:-//alma//NONSGML Alma SaaS//EN');
    expect(ical).toContain('BEGIN:VEVENT');
    expect(ical).toContain('END:VEVENT');
    expect(ical).toContain('UID:alma-appointment-550e8400-e29b-41d4-a716-446655440000@alma-app.com');
    expect(ical).toContain('SUMMARY:Consulta - Juan Pérez');
    expect(ical).toContain('DTSTART:20260729T143000');
    expect(ical).toContain('DTEND:20260729T153000'); // 60 minutes later
    expect(ical).toContain('LOCATION:Consultorio A');
    expect(ical).toContain('STATUS:CONFIRMED');
  });

  it('should handle multiple events', () => {
    const events: CalendarEvent[] = [
      {
        id: '550e8400-e29b-41d4-a716-446655440001',
        fecha: '2026-07-29',
        hora: '10:00',
        duracion_min: 45,
        paciente_nombre: 'Ana García',
        servicio_nombre: 'Masaje',
        estado: 'confirmado',
        updated_at: new Date(),
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440002',
        fecha: '2026-07-29',
        hora: '11:00',
        duracion_min: 30,
        paciente_nombre: 'Carlos López',
        estado: 'confirmado',
        updated_at: new Date(),
      },
    ];

    const ical = generateICalendar(events);

    expect(ical).toContain('Ana García');
    expect(ical).toContain('Carlos López');
    expect((ical.match(/BEGIN:VEVENT/g) || []).length).toBe(2);
    expect((ical.match(/END:VEVENT/g) || []).length).toBe(2);
  });

  it('should mark cancelled events properly', () => {
    const events: CalendarEvent[] = [
      {
        id: '550e8400-e29b-41d4-a716-446655440000',
        fecha: '2026-07-29',
        hora: '14:30',
        duracion_min: 60,
        paciente_nombre: 'Juan Pérez',
        estado: 'cancelado',
        updated_at: new Date(),
      },
    ];

    const ical = generateICalendar(events);

    expect(ical).toContain('STATUS:CANCELLED');
  });

  it('should escape special characters in text fields', () => {
    const events: CalendarEvent[] = [
      {
        id: '550e8400-e29b-41d4-a716-446655440000',
        fecha: '2026-07-29',
        hora: '14:30',
        duracion_min: 60,
        paciente_nombre: 'Juan; Pérez, García',
        servicio_nombre: 'Consulta\\Especial',
        descripcion: 'Paciente nuevo\nConfirmar por WhatsApp',
        estado: 'confirmado',
        updated_at: new Date(),
      },
    ];

    const ical = generateICalendar(events);

    // Caracteres especiales deben estar escapados
    expect(ical).toContain('\\;');
    expect(ical).toContain('\\,');
    expect(ical).toContain('\\\\');
    expect(ical).toContain('\\n');
  });

  it('should calculate consistent hash', () => {
    const events: CalendarEvent[] = [
      {
        id: '550e8400-e29b-41d4-a716-446655440000',
        fecha: '2026-07-29',
        hora: '14:30',
        duracion_min: 60,
        paciente_nombre: 'Juan Pérez',
        estado: 'confirmado',
        updated_at: new Date(),
      },
    ];

    const ical1 = generateICalendar(events);
    const ical2 = generateICalendar(events);
    const hash1 = calculateICalHash(ical1);
    const hash2 = calculateICalHash(ical2);

    // Mismo contenido debe generar mismo hash
    expect(hash1).toBe(hash2);
  });

  it('should generate different hash for different content', () => {
    const events1: CalendarEvent[] = [
      {
        id: '550e8400-e29b-41d4-a716-446655440000',
        fecha: '2026-07-29',
        hora: '14:30',
        duracion_min: 60,
        paciente_nombre: 'Juan Pérez',
        estado: 'confirmado',
        updated_at: new Date(),
      },
    ];

    const events2: CalendarEvent[] = [
      {
        id: '550e8400-e29b-41d4-a716-446655440000',
        fecha: '2026-07-29',
        hora: '15:30', // Hora diferente
        duracion_min: 60,
        paciente_nombre: 'Juan Pérez',
        estado: 'confirmado',
        updated_at: new Date(),
      },
    ];

    const hash1 = calculateICalHash(generateICalendar(events1));
    const hash2 = calculateICalHash(generateICalendar(events2));

    // Contenido diferente debe generar hash diferente
    expect(hash1).not.toBe(hash2);
  });

  it('should handle empty events array', () => {
    const events: CalendarEvent[] = [];
    const ical = generateICalendar(events);

    expect(ical).toContain('BEGIN:VCALENDAR');
    expect(ical).toContain('END:VCALENDAR');
    expect(ical).not.toContain('BEGIN:VEVENT');
  });

  it('should calculate end time correctly for various durations', () => {
    const testCases = [
      { hora: '14:30', duracion_min: 60, expected_end: '15:30' },
      { hora: '14:30', duracion_min: 30, expected_end: '15:00' },
      { hora: '14:30', duracion_min: 90, expected_end: '16:00' },
      { hora: '23:30', duracion_min: 60, expected_end: '00:30' }, // Next day
    ];

    for (const testCase of testCases) {
      const events: CalendarEvent[] = [
        {
          id: '550e8400-e29b-41d4-a716-446655440000',
          fecha: '2026-07-29',
          hora: testCase.hora,
          duracion_min: testCase.duracion_min,
          paciente_nombre: 'Test',
          estado: 'confirmado',
          updated_at: new Date(),
        },
      ];

      const ical = generateICalendar(events);
      const expectedHourMin = testCase.expected_end.replace(':', '');
      expect(ical).toContain(`T${expectedHourMin}00`);
    }
  });
});
