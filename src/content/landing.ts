/**
 * Contenido de la landing de alma. Fuente única: editá acá a medida que el
 * sistema crece (sumás una feature, cambiás el precio, agregás una pregunta) y
 * la landing se actualiza sola. Tono: voseo rioplatense, frases cortas, humano.
 */
import type { ComponentType } from 'react';

// Configuración de contacto
export const CONTACTO = {
  whatsapp: '+5493512145673', // Formateado para wa.me
  mensaje: 'Hola! Me interesa suscribirme a alma.',
};

export function waUrl(numero: string = CONTACTO.whatsapp, mensaje: string = CONTACTO.mensaje): string {
  return `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`;
}
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
  ctaPrimario: { label: 'Probá alma', href: waUrl() },
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
  {
    Icono: IconoCalendario,
    titulo: 'Sincronización con calendarios',
    texto: 'Tus turnos aparecen automáticamente en Apple Calendar, Google Calendar, Outlook. Sincronizado en tiempo real.',
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
  cta: { label: 'Empezá ahora', href: waUrl() },
};

export type Novedad = {
  fecha: string;
  titulo: string;
  descripcion: string;
  icono?: string;
};

export const NOVEDADES: Novedad[] = [
  {
    fecha: '29 de julio',
    titulo: 'Sincronización con calendarios',
    descripcion:
      'Tus turnos ahora se sincronizan automáticamente con Apple Calendar, Google Calendar, Outlook y cualquier app que use iCal. Generá una URL única en Ajustes → Integraciones y agregala a tu calendario.',
    icono: '📅',
  },
  {
    fecha: '15 de julio',
    titulo: 'Servicios y empleados',
    descripcion:
      'Configurá múltiples servicios con precio y duración propios. Asignale turnos a diferentes empleados. Perfecto si trabajás con equipo.',
    icono: '👥',
  },
  {
    fecha: '1 de julio',
    titulo: 'Notificaciones de turnos nuevos',
    descripcion:
      'Ves una campanita en Hoy cuando tus pacientes reservan desde el portal. Sabés al instante quién se anotó.',
    icono: '🔔',
  },
  {
    fecha: '15 de junio',
    titulo: 'Reportes mensuales',
    descripcion:
      'Panel de reportes con ingresos del mes, pacientes inactivos y tendencias. Todo en un vistazo.',
    icono: '📊',
  },
  {
    fecha: '1 de junio',
    titulo: 'Alma lanzada',
    descripcion:
      'Agenda, seña por Mercado Pago, WhatsApp, caja y portal de reservas. Todo lo que necesitás para organizar tu consultorio.',
    icono: '🚀',
  },
];

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
