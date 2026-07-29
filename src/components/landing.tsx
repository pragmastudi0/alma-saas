import Link from 'next/link';
import { Flor } from '@/components/flor';
import { HERO, FEATURES, PRECIO, FAQ, NOVEDADES } from '@/content/landing';

const ctaPrimarioCls =
  'inline-flex h-12 items-center justify-center rounded-full bg-[var(--alma-action)] px-6 text-sm font-semibold text-[var(--alma-on-action)] shadow-brand transition-transform duration-micro ease-alma hover:scale-[1.03] active:scale-95';
const ctaSecundarioCls =
  'inline-flex h-12 items-center justify-center rounded-full border border-[var(--alma-border)] px-6 text-sm font-semibold text-[var(--alma-text)] transition-colors duration-micro ease-alma hover:border-[var(--alma-text-muted)]';

/** Landing pública de alma. Contenido en @/content/landing (editable). */
export function Landing() {
  return (
    <div className="min-h-dvh bg-[var(--alma-bg)] text-[var(--alma-text)]">
      {/* Barra superior */}
      <header className="sticky top-0 z-[var(--alma-z-nav)] border-b border-[var(--alma-border)] bg-[color-mix(in_srgb,var(--alma-bg)_92%,transparent)] backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
          <div className="flex items-center gap-2">
            <Flor className="h-[22px] w-[22px] text-verde-600" />
            <span className="voice text-2xl leading-none">alma</span>
          </div>
          <nav className="flex items-center gap-3">
            <Link
              href="/login"
              className="hidden text-sm font-semibold text-[var(--alma-text-muted)] transition-colors duration-micro ease-alma hover:text-[var(--alma-text)] sm:inline"
            >
              Iniciá sesión
            </Link>
            <Link
              href="/registro"
              className="inline-flex h-10 items-center rounded-full bg-[var(--alma-action)] px-4 text-sm font-semibold text-[var(--alma-on-action)] shadow-brand transition-transform duration-micro ease-alma hover:scale-[1.03] active:scale-95"
            >
              Crear cuenta
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5">
        {/* Hero */}
        <section className="grid items-center gap-10 py-14 md:grid-cols-2 md:py-20">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[.1em] text-[var(--alma-text-muted)]">
              {HERO.eyebrow}
            </p>
            <h1 className="voice mt-3 text-[40px] leading-[1.05] text-[var(--alma-voice)] md:text-[56px]">
              {HERO.titulo}
            </h1>
            <p className="mt-5 max-w-md text-[17px] leading-relaxed text-[var(--alma-text-muted)]">
              {HERO.subtitulo}
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href={HERO.ctaPrimario.href} className={ctaPrimarioCls}>
                {HERO.ctaPrimario.label}
              </Link>
              <Link href={HERO.ctaSecundario.href} className={ctaSecundarioCls}>
                {HERO.ctaSecundario.label}
              </Link>
            </div>
          </div>

          {/* Vista de producto (mock del hero de "Hoy") */}
          <div className="relative">
            <div className="rounded-xl bg-gradient-to-br from-verde-600 to-verde-700 p-7 text-white shadow-brand">
              <p className="text-xs font-semibold uppercase tracking-[.1em] opacity-75">Hoy tenés</p>
              <p className="voice mt-1 text-[52px] leading-[1.05] tnum">
                4 <span className="text-[21px] opacity-85">turnos</span>
              </p>
              <div className="mt-4 space-y-2 border-t border-white/20 pt-4">
                {[
                  { hora: '09:00', quien: 'Valentina Ríos' },
                  { hora: '11:30', quien: 'Martín Sosa' },
                  { hora: '16:00', quien: 'Lucía Prat' },
                ].map((t) => (
                  <div key={t.hora} className="flex items-center justify-between text-sm">
                    <span className="tnum font-semibold opacity-90">{t.hora}</span>
                    <span className="opacity-80">{t.quien}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="py-8 md:py-12">
          <h2 className="voice text-[28px] leading-tight text-[var(--alma-text)] md:text-[36px]">
            Todo lo que tu consultorio necesita
          </h2>
          <p className="mt-2 max-w-lg text-[15px] text-[var(--alma-text-muted)]">
            Pocas cosas, muy bien hechas. Cada una te ahorra tiempo de verdad.
          </p>

          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ Icono, titulo, texto }) => (
              <div
                key={titulo}
                className="rounded-lg border border-[var(--alma-border)] bg-[var(--alma-surface)] p-5 transition-colors duration-micro ease-alma hover:border-[var(--alma-text-muted)]"
              >
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[var(--alma-action-soft)] text-[var(--alma-action)]">
                  <Icono className="h-6 w-6" />
                </span>
                <h3 className="mt-4 text-[17px] font-semibold">{titulo}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-[var(--alma-text-muted)]">
                  {texto}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Siempre creciendo */}
        <section className="py-8 md:py-12">
          <div className="rounded-xl border border-[var(--alma-border)] bg-[var(--alma-surface)] p-6 md:p-8">
            <p className="text-xs font-semibold uppercase tracking-[.1em] text-[var(--alma-action)]">
              Siempre creciendo
            </p>
            <p className="voice mt-2 max-w-2xl text-[22px] leading-snug md:text-[26px]">
              alma mejora seguido. Cada función nueva ya viene incluida en tu plan, sin que tengas
              que hacer nada.
            </p>
          </div>
        </section>

        {/* Novedades destacadas */}
        <section className="py-8 md:py-12">
          <h2 className="voice text-[28px] leading-tight text-[var(--alma-text)] md:text-[36px]">
            Lo nuevo en alma
          </h2>
          <p className="mt-2 max-w-lg text-[15px] text-[var(--alma-text-muted)]">
            Mirá las últimas funciones que sumamos.
          </p>

          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {NOVEDADES.slice(0, 4).map(({ fecha, titulo, descripcion, icono }) => (
              <div
                key={titulo}
                className="rounded-lg border border-[var(--alma-border)] bg-[var(--alma-surface)] p-5 transition-colors duration-micro ease-alma hover:border-[var(--alma-text-muted)]"
              >
                <p className="text-xs font-semibold uppercase tracking-[.06em] text-[var(--alma-text-muted)]">
                  {fecha}
                </p>
                <h3 className="mt-3 text-[16px] font-semibold">
                  {icono} {titulo}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--alma-text-muted)]">
                  {descripcion}
                </p>
              </div>
            ))}
          </div>

          <Link
            href="/novedades"
            className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-[var(--alma-action)] transition-colors hover:text-[var(--alma-action-hover)]"
          >
            Ver todas las novedades →
          </Link>
        </section>

        {/* Precio */}
        <section id="precio" className="py-8 md:py-12">
          <div className="mx-auto max-w-md rounded-xl border border-[var(--alma-border)] bg-[var(--alma-surface)] p-7 shadow-1">
            <p className="text-xs font-semibold uppercase tracking-[.1em] text-[var(--alma-text-muted)]">
              Un precio, todo incluido
            </p>
            <p className="mt-3 flex items-end gap-1.5">
              <span className="voice text-[52px] leading-none tnum text-[var(--alma-text)]">
                US${PRECIO.montoUSD}
              </span>
              <span className="mb-1.5 text-sm font-medium text-[var(--alma-text-muted)]">
                / {PRECIO.periodo}
              </span>
            </p>
            <p className="mt-1 text-sm text-[var(--alma-text-muted)]">{PRECIO.nota}</p>

            <ul className="mt-6 space-y-2.5">
              {PRECIO.incluye.map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm">
                  <svg
                    className="mt-0.5 h-4 w-4 shrink-0 text-[var(--alma-action)]"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            <Link href={PRECIO.cta.href} className={`${ctaPrimarioCls} mt-7 w-full`}>
              {PRECIO.cta.label}
            </Link>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-8 md:py-12">
          <h2 className="voice text-[28px] leading-tight md:text-[36px]">Preguntas</h2>
          <dl className="mt-6 grid grid-cols-1 gap-x-10 gap-y-6 md:grid-cols-2">
            {FAQ.map(({ pregunta, respuesta }) => (
              <div key={pregunta}>
                <dt className="text-[16px] font-semibold">{pregunta}</dt>
                <dd className="mt-1.5 text-sm leading-relaxed text-[var(--alma-text-muted)]">
                  {respuesta}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        {/* Cierre */}
        <section className="py-12 md:py-16">
          <div className="rounded-xl bg-gradient-to-br from-verde-600 to-verde-700 p-8 text-center text-white shadow-brand md:p-12">
            <h2 className="voice text-[30px] leading-tight md:text-[40px]">
              Empezá a ordenar tu consultorio hoy
            </h2>
            <p className="mx-auto mt-3 max-w-md text-[15px] opacity-85">
              Creá tu cuenta y cargá tu primer turno en minutos.
            </p>
            <Link
              href={HERO.ctaPrimario.href}
              className="mt-7 inline-flex h-12 items-center justify-center rounded-full bg-white px-7 text-sm font-semibold text-[var(--verde-700)] transition-transform duration-micro ease-alma hover:scale-[1.03] active:scale-95"
            >
              {HERO.ctaPrimario.label}
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-[var(--alma-border)]">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 py-8 sm:flex-row">
          <div className="flex items-center gap-1.5 text-sm text-[var(--alma-text-muted)]">
            <span>con</span>
            <Flor className="h-4 w-4 text-verde-600" />
            <span className="voice text-lg leading-none text-[var(--alma-text)]">alma</span>
          </div>
          <div className="flex items-center gap-5 text-sm font-semibold text-[var(--alma-text-muted)]">
            <Link
              href="/login"
              className="transition-colors duration-micro ease-alma hover:text-[var(--alma-text)]"
            >
              Iniciá sesión
            </Link>
            <Link
              href="/registro"
              className="transition-colors duration-micro ease-alma hover:text-[var(--alma-text)]"
            >
              Crear cuenta
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
