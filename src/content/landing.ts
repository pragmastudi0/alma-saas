/**
 * Contenido de la landing de alma. Fuente única: editá acá a medida que el
 * sistema crece (sumás una feature, cambiás el precio, agregás una pregunta) y
 * la landing se actualiza sola. Tono: voseo rioplatense, frases cortas, humano.
 */
import type { ComponentType } from 'react';
import {
  IconoCalendario,
  IconoTarjeta,
  IconoChat,
  IconoCaja,
  IconoLink,
  IconoPacientes,
  IconoAjustes,
} from '@/components/icons';

type IconoComponent = ComponentType<{ className?: string }>;

export const HERO = {
  eyebrow: 'Para profesionales independientes',
  titulo: 'Tu consultorio, en orden.',
  subtitulo:
    'alma es la secretaria virtual que se encarga de los turnos, las señas y los recordatorios. Vos atendé; del resto nos ocupamos.',
  ctaPrimario: { label: 'Probá alma', href: '/registro' },
  ctaSecundario: { label: 'Ya tengo cuenta', href: '/login' },
};

export type Feature = {
  Icono: IconoComponent;
  titulo: string;
  texto: string;
};

export const FEATURES: Feature[] = [
  {
    Icono: IconoCalendario,
    titulo: 'Agenda clara',
    texto: 'Tu día y tu mes de un vistazo. Cada turno con su estado, sin planillas.',
  },
  {
    Icono: IconoTarjeta,
    titulo: 'Señas por Mercado Pago',
    texto: 'El paciente reserva y deja la seña. El dinero entra directo a tu cuenta.',
  },
  {
    Icono: IconoChat,
    titulo: 'Recordatorios por WhatsApp',
    texto: 'Mensajes listos para enviar. Menos ausencias, sin escribir de cero.',
  },
  {
    Icono: IconoLink,
    titulo: 'Reservas online',
    texto: 'Compartí un link y tus pacientes eligen horario solos, a cualquier hora.',
  },
  {
    Icono: IconoCaja,
    titulo: 'Caja simple',
    texto: 'Cada cobro queda anotado solo. Sabés cuánto entró sin hacer cuentas.',
  },
  {
    Icono: IconoPacientes,
    titulo: 'Ficha de pacientes',
    texto: 'Nombre, contacto y notas de cada persona, siempre a mano.',
  },
  {
    Icono: IconoAjustes,
    titulo: 'Servicios y empleados',
    texto: 'Configurá los servicios que ofrecés con su precio y duración, y asignále los turnos a cada empleado.',
  },
];

export const PRECIO = {
  montoUSD: 30,
  periodo: 'mes',
  nota: 'Sin permanencia. Cancelás cuando quieras.',
  incluye: [
    'Turnos y agenda sin límite',
    'Servicios con precio y duración configurables',
    'Empleados: turnos para todo tu equipo',
    'Señas por Mercado Pago con tu propia cuenta',
    'Recordatorios por WhatsApp',
    'Portal de reservas online',
    'Caja y ficha de pacientes',
    'Funciones nuevas todo el tiempo, sin costo extra',
  ],
  cta: { label: 'Empezá ahora', href: '/registro' },
};

export const FAQ: { pregunta: string; respuesta: string }[] = [
  {
    pregunta: '¿Cómo cobro las señas?',
    respuesta:
      'Conectás tu propia cuenta de Mercado Pago. La seña entra directo a vos: alma nunca toca tu plata.',
  },
  {
    pregunta: '¿Necesito instalar algo?',
    respuesta: 'No. alma funciona en el teléfono y en la compu, desde el navegador.',
  },
  {
    pregunta: '¿Puedo empezar hoy?',
    respuesta: 'Sí. Creás tu cuenta y cargás tu primer turno en minutos.',
  },
  {
    pregunta: '¿El precio cambia?',
    respuesta:
      'Son 30 USD por mes, sin permanencia. Sumamos funciones nuevas seguido y ya vienen incluidas.',
  },
];
