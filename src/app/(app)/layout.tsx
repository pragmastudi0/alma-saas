import { redirect } from 'next/navigation';
import { Flor } from '@/components/flor';
import { SideNav } from '@/components/side-nav';
import { BottomNav } from '@/components/bottom-nav';
import { getSessionContext } from '@/lib/tenant';
import { logout } from '@/app/(auth)/actions';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getSessionContext();
  if (!ctx) redirect('/login');

  return (
    <div className="mx-auto flex w-full max-w-[1200px]">
      <SideNav />

      <div className="min-w-0 flex-1 px-[18px] pb-8 pt-4 md:px-8 md:pt-6 max-md:pb-[calc(5.5rem+env(safe-area-inset-bottom))]">
        {/* Barra superior: logo + salir, solo en mobile (en desktop viven en el sidebar). */}
        <div className="mb-5 flex items-center justify-between md:hidden">
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

        {children}
      </div>

      <BottomNav />
    </div>
  );
}
