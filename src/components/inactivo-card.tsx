import Link from 'next/link';
import { WhatsAppLink } from '@/components/whatsapp-link';
import { mensajeReencuentro, waLink } from '@/lib/whatsapp';
import type { PacienteInactivo } from '@/lib/inactivos';

/** Paciente que hace tiempo no viene, con acceso directo a escribirle. */
export function InactivoCard({ p }: { p: PacienteInactivo }) {
  const primerNombre = p.nombre.split(' ')[0] || p.nombre;
  return (
    <div className="rounded-lg border border-[var(--alma-border)] bg-[var(--alma-surface)] p-3.5">
      <div className="flex items-center justify-between gap-3">
        <Link
          href={`/pacientes/${p.id}`}
          className="min-w-0 flex-1 truncate font-medium transition-colors duration-micro ease-alma hover:text-[var(--alma-action)]"
        >
          {p.nombre}
        </Link>
        <span className="tnum shrink-0 text-sm text-[var(--alma-text-muted)]">
          {p.sinTurnos ? 'sin turnos todavía' : `hace ${p.dias} días`}
        </span>
      </div>
      <div className="mt-2.5">
        <WhatsAppLink href={waLink(p.telefono, mensajeReencuentro(primerNombre))}>
          Escribirle por WhatsApp
        </WhatsAppLink>
      </div>
    </div>
  );
}
