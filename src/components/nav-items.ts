import {
  IconoAjustes,
  IconoCaja,
  IconoCalendario,
  IconoPacientes,
  IconoSol,
} from '@/components/icons';

/** Secciones de la app. Fuente única para la nav lateral (desktop) y la inferior (mobile). */
export const NAV_ITEMS = [
  { href: '/hoy', label: 'Hoy', Icono: IconoSol },
  { href: '/agenda', label: 'Agenda', Icono: IconoCalendario },
  { href: '/pacientes', label: 'Pacientes', Icono: IconoPacientes },
  { href: '/caja', label: 'Caja', Icono: IconoCaja },
  { href: '/ajustes', label: 'Ajustes', Icono: IconoAjustes },
] as const;
