import { redirect } from 'next/navigation';
import { Flor } from '@/components/flor';
import { SideNav } from '@/components/side-nav';
import { BottomNav } from '@/components/bottom-nav';
import { CampanaNotif } from '@/components/campana-notif';
import { getSessionContext } from '@/lib/tenant';
import { logout } from '@/app/(auth)/actions';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getSessionContext();
  if (!ctx) redirect('/login');

  return (
    // En mobile el armazón ocupa la pantalla justa y no scrollea: lo que se
    // mueve es el área de contenido, y la barra de abajo queda quieta de verdad
    // (con `position: fixed` se despegaba al esconderse la barra del navegador).
    // En desktop no cambia nada: scrollea la página y el sidebar es sticky.
    <div className="flex w-full bg-[var(--alma-bg)] max-md:h-[100dvh] max-md:flex-col max-md:overflow-hidden md:min-h-screen">
      <SideNav />

      <div className="flex-1 overflow-auto max-md:min-h-0 max-md:overscroll-contain">
        <div className="mx-auto w-full max-w-[1200px] px-[18px] pb-8 pt-4 md:px-8 md:pt-6 max-md:pb-24">
          {/* Barra superior: logo + campana + salir, solo en mobile (en desktop viven en el sidebar). */}
          <div className="mb-5 flex items-center justify-between md:hidden">
            <div className="flex items-center gap-2">
              <Flor className="h-[21px] w-[21px] text-verde-600" />
              <span className="voice text-2xl leading-none">alma</span>
            </div>
            <div className="flex items-center gap-1">
              <CampanaNotif />
              <form action={logout}>
                <button
                  type="submit"
                  className="rounded-md border border-[var(--alma-border)] px-3.5 py-2 text-sm font-semibold text-[var(--alma-text-muted)] transition-colors duration-micro ease-alma hover:text-[var(--alma-text)]"
                >
                  Salir
                </button>
              </form>
            </div>
          </div>

          {children}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
