import { notFound } from 'next/navigation';
import { Flor } from '@/components/flor';
import { getTenantPorSlug } from '@/lib/portal';

/**
 * Layout público del portal de reservas: sin sesión, sin nav de la app.
 * Muestra a quién le estás reservando; alma queda como firma discreta.
 */
export default async function PortalLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const tenant = await getTenantPorSlug(slug);
  if (!tenant) notFound();

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col px-5 py-8 md:max-w-2xl md:py-12">
      <header className="mb-6">
        <p className="text-[22px] font-semibold leading-tight">{tenant.nombre}</p>
        {tenant.profesion && (
          <p className="mt-0.5 text-sm capitalize text-[var(--alma-text-muted)]">
            {tenant.profesion}
          </p>
        )}
      </header>

      <div className="flex-1">{children}</div>

      <footer className="mt-10 flex items-center justify-center gap-1.5 text-sm text-[var(--alma-text-muted)]">
        <span>con</span>
        <Flor className="h-4 w-4 text-verde-600" />
        <span className="voice text-lg leading-none">alma</span>
      </footer>
    </main>
  );
}
