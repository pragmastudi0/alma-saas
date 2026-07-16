import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Flor } from '@/components/flor';
import { getSessionContext } from '@/lib/tenant';
import { logout } from '@/app/(auth)/actions';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getSessionContext();
  if (!ctx) redirect('/login');

  return (
    <div className="mx-auto max-w-[960px] px-[18px] pb-8 pt-4">
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Flor className="h-[21px] w-[21px] text-verde-600" />
          <span className="voice text-2xl leading-none">alma</span>
        </div>
        <form action={logout}>
          <button
            type="submit"
            className="rounded-md border border-[var(--alma-border)] px-3.5 py-2 text-sm font-semibold text-[var(--alma-text-muted)] transition-colors duration-micro ease-alma hover:text-[var(--alma-text)]"
          >
            Salir
          </button>
        </form>
      </div>
      <nav className="mb-5 flex gap-5 text-sm font-semibold">
        <Link
          href="/hoy"
          className="text-[var(--alma-text-muted)] transition-colors duration-micro ease-alma hover:text-[var(--alma-text)]"
        >
          Hoy
        </Link>
        <Link
          href="/agenda"
          className="text-[var(--alma-text-muted)] transition-colors duration-micro ease-alma hover:text-[var(--alma-text)]"
        >
          Agenda
        </Link>
        <Link
          href="/pacientes"
          className="text-[var(--alma-text-muted)] transition-colors duration-micro ease-alma hover:text-[var(--alma-text)]"
        >
          Pacientes
        </Link>
      </nav>
      {children}
    </div>
  );
}
