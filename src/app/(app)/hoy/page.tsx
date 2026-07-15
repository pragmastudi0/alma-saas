import { redirect } from 'next/navigation';
import { getSessionContext } from '@/lib/tenant';

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

export default async function HoyPage() {
  const ctx = await getSessionContext();
  if (!ctx) redirect('/login');

  const hoy = new Date();
  const fecha = `${DIAS[hoy.getDay()]} ${hoy.getDate()} de ${MESES[hoy.getMonth()]}`;

  return (
    <main>
      <header className="mb-5">
        <h1 className="voice text-[32px] leading-[1.12]">
          {ctx.nombre ? (
            <>
              Hola, <em className="text-[var(--alma-voice)]">{ctx.nombre}</em>
            </>
          ) : (
            'Hola'
          )}
        </h1>
        <p className="mt-1.5 text-xs font-medium uppercase tracking-[.08em] text-[var(--alma-text-muted)]">
          {fecha}
        </p>
      </header>

      <section className="rounded-xl bg-gradient-to-br from-verde-600 to-verde-700 p-6 text-white shadow-brand">
        <p className="text-xs font-semibold uppercase tracking-[.1em] opacity-75">Hoy tenés</p>
        <p className="voice mt-1 text-[52px] leading-[1.05] tnum">
          0 <span className="text-[21px] opacity-85">turnos</span>
        </p>
        <p className="mt-3 border-t border-white/20 pt-3 text-[13.5px] opacity-85">
          Tu agenda llega en la próxima fase. Por ahora, tu espacio ya está en orden.
        </p>
      </section>
    </main>
  );
}
