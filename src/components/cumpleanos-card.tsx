import Link from 'next/link';
import type { Cumpleanos } from '@/lib/cumpleanos';
import { etiquetaDia } from '@/lib/fecha';
import { mensajeCumpleanos, waLink } from '@/lib/whatsapp';
import { WhatsAppLink } from '@/components/whatsapp-link';

export function CumpleanosCard({ cumple, plantilla }: { cumple: Cumpleanos; plantilla: string }) {
  const href = waLink(cumple.telefono, mensajeCumpleanos(plantilla, cumple));
  return (
    <li className="rounded-lg border border-[var(--alma-border)] bg-[var(--alma-surface)] p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <Link href={`/pacientes/${cumple.id}`} className="font-semibold text-[var(--alma-text)]">
            {[cumple.nombre, cumple.apellido].filter(Boolean).join(' ')}
          </Link>
          <p className="tnum mt-1 text-sm text-[var(--alma-text-muted)]">
            <span className="capitalize">{etiquetaDia(cumple.fecha)}</span> · cumple {cumple.edad}
          </p>
        </div>
        {cumple.dias === 0 && <span className="text-xs font-semibold text-[var(--alma-action)]">Hoy</span>}
      </div>
      <WhatsAppLink href={href}>Saludar por WhatsApp</WhatsAppLink>
      {!href && <p className="text-xs text-[var(--alma-text-muted)]">Cargá un teléfono para saludar por WhatsApp.</p>}
    </li>
  );
}
