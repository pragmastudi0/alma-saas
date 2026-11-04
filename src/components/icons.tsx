/**
 * Íconos de línea de alma: 1.8px, monocromos (currentColor), sin rellenos.
 * La Flor (isotipo) vive aparte en flor.tsx y no se usa como ícono.
 */

function Icono({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {children}
    </svg>
  );
}

export function IconoSol({ className }: { className?: string }) {
  return (
    <Icono className={className}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6L7 7M17 17l1.4 1.4M18.4 5.6L17 7M7 17l-1.4 1.4" />
    </Icono>
  );
}

export function IconoCalendario({ className }: { className?: string }) {
  return (
    <Icono className={className}>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
      <path d="M8 3v4M16 3v4M3.5 10h17" />
    </Icono>
  );
}

export function IconoPacientes({ className }: { className?: string }) {
  return (
    <Icono className={className}>
      <circle cx="9" cy="8.5" r="3.2" />
      <path d="M3.5 19.5c0-3 2.5-4.8 5.5-4.8s5.5 1.8 5.5 4.8M15.8 5.7a3.2 3.2 0 0 1 0 5.6M17.5 15.2c1.9.8 3 2.3 3 4.3" />
    </Icono>
  );
}

export function IconoCaja({ className }: { className?: string }) {
  return (
    <Icono className={className}>
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M3 9.5V7a2 2 0 0 1 2-2h11M16 13.5h1.5" />
    </Icono>
  );
}

export function IconoAjustes({ className }: { className?: string }) {
  return (
    <Icono className={className}>
      <path d="M4 7.5h8M18 7.5h2M4 16.5h4M14 16.5h6" />
      <circle cx="15" cy="7.5" r="2.2" />
      <circle cx="11" cy="16.5" r="2.2" />
    </Icono>
  );
}

export function IconoReportes({ className }: { className?: string }) {
  return (
    <Icono className={className}>
      <path d="M4 4v16h16" />
      <path d="M8.5 16.5v-4.5M13 16.5V8.5M17.5 16.5v-6.5" />
    </Icono>
  );
}

export function IconoMas({ className }: { className?: string }) {
  return (
    <Icono className={className}>
      <path d="M12 5v14M5 12h14" />
    </Icono>
  );
}

export function IconoChevron({ dir, className }: { dir: 'left' | 'right'; className?: string }) {
  return (
    <Icono className={className}>
      <path d={dir === 'left' ? 'M15 18l-6-6 6-6' : 'M9 18l6-6-6-6'} />
    </Icono>
  );
}

export function IconoChat({ className }: { className?: string }) {
  return (
    <Icono className={className}>
      <path d="M4 5.5h16a1.5 1.5 0 0 1 1.5 1.5v8a1.5 1.5 0 0 1-1.5 1.5H9l-4 3.5V17H4a1.5 1.5 0 0 1-1.5-1.5V7A1.5 1.5 0 0 1 4 5.5Z" />
      <path d="M8 10.5h8M8 13.5h5" />
    </Icono>
  );
}

export function IconoLink({ className }: { className?: string }) {
  return (
    <Icono className={className}>
      <path d="M9 15l6-6" />
      <path d="M10.5 6.5l1.2-1.2a3.5 3.5 0 0 1 5 5L15.5 11.5M8.5 12.5l-1.2 1.2a3.5 3.5 0 0 0 5 5L13.5 17.5" />
    </Icono>
  );
}

export function IconoTarjeta({ className }: { className?: string }) {
  return (
    <Icono className={className}>
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <path d="M3 10h18M6.5 14.5h4" />
    </Icono>
  );
}

export function IconoCampana({ className }: { className?: string }) {
  return (
    <Icono className={className}>
      <path d="M18 8.5a6 6 0 0 0-12 0c0 6-2.5 7.5-2.5 7.5h17S18 14.5 18 8.5" />
      <path d="M10 20a2.4 2.4 0 0 0 4 0" />
    </Icono>
  );
}
