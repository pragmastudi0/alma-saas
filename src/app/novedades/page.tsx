import Link from 'next/link';
import { Flor } from '@/components/flor';
import { NOVEDADES } from '@/content/landing';

export const metadata = {
  title: 'Novedades - alma',
  description: 'Descubrí las últimas funciones y mejoras de alma.',
};

export default function NovedadesPage() {
  return (
    <div className="min-h-dvh bg-[var(--alma-bg)] text-[var(--alma-text)]">
      {/* Barra superior */}
      <header className="sticky top-0 z-[var(--alma-z-nav)] border-b border-[var(--alma-border)] bg-[color-mix(in_srgb,var(--alma-bg)_92%,transparent)] backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
          <Link href="/" className="flex items-center gap-2 transition-opacity hover:opacity-75">
            <Flor className="h-[22px] w-[22px] text-verde-600" />
            <span className="voice text-2xl leading-none">alma</span>
          </Link>
          <nav className="flex items-center gap-3">
            <Link
              href="/"
              className="hidden text-sm font-semibold text-[var(--alma-text-muted)] transition-colors duration-micro ease-alma hover:text-[var(--alma-text)] sm:inline"
            >
              Inicio
            </Link>
            <Link
              href="/login"
              className="inline-flex h-10 items-center rounded-full bg-[var(--alma-action)] px-4 text-sm font-semibold text-[var(--alma-on-action)] shadow-brand transition-transform duration-micro ease-alma hover:scale-[1.03] active:scale-95"
            >
              Ingresar
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-5 py-16">
        {/* Encabezado */}
        <div className="mb-16 text-center">
          <p className="text-xs font-semibold uppercase tracking-[.1em] text-[var(--alma-text-muted)]">
            Mejoras constantes
          </p>
          <h1 className="voice mt-3 text-[40px] leading-[1.05] text-[var(--alma-voice)] md:text-[48px]">
            Novedades de alma
          </h1>
          <p className="mt-5 text-[15px] leading-relaxed text-[var(--alma-text-muted)]">
            Cada semana sumamos funciones nuevas. Acá ves todo lo que cambió.
          </p>
        </div>

        {/* Timeline de novedades */}
        <div className="space-y-8">
          {NOVEDADES.map((novedad, idx) => (
            <div key={idx} className="flex gap-6">
              {/* Línea del timeline */}
              <div className="flex flex-col items-center">
                {/* Punto */}
                <div className="h-6 w-6 rounded-full border-2 border-[var(--alma-action)] bg-[var(--alma-bg)]" />
                {/* Línea conectora (excepto en el último) */}
                {idx < NOVEDADES.length - 1 && (
                  <div className="mt-2 h-24 w-0.5 bg-gradient-to-b from-[var(--alma-border)] to-transparent" />
                )}
              </div>

              {/* Contenido de la novedad */}
              <div className="pb-8 pt-1">
                <p className="text-xs font-semibold uppercase tracking-[.08em] text-[var(--alma-text-muted)]">
                  {novedad.fecha}
                </p>
                <h3 className="mt-2 text-lg font-semibold text-[var(--alma-text)]">
                  {novedad.icono} {novedad.titulo}
                </h3>
                <p className="mt-2 leading-relaxed text-[var(--alma-text-muted)]">
                  {novedad.descripcion}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* CTA final */}
        <div className="mt-16 rounded-xl border border-[var(--alma-border)] bg-[var(--alma-surface)] p-8 text-center">
          <p className="text-[17px] font-medium text-[var(--alma-text)]">
            ¿Listo para probar alma?
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/registro"
              className="inline-flex h-12 items-center justify-center rounded-full bg-[var(--alma-action)] px-6 text-sm font-semibold text-[var(--alma-on-action)] shadow-brand transition-transform duration-micro ease-alma hover:scale-[1.03] active:scale-95"
            >
              Crear cuenta
            </Link>
            <Link
              href="/login"
              className="inline-flex h-12 items-center justify-center rounded-full border border-[var(--alma-border)] px-6 text-sm font-semibold text-[var(--alma-text)] transition-colors duration-micro ease-alma hover:border-[var(--alma-text-muted)]"
            >
              Ya tengo cuenta
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--alma-border)] py-8 text-center">
        <p className="text-xs text-[var(--alma-text-muted)]">
          © 2026 alma. La secretaría virtual de tu profesión.
        </p>
      </footer>
    </div>
  );
}
