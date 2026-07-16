import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-[420px] flex-col items-center justify-center px-6 text-center">
      <p className="voice text-[40px] leading-tight text-[var(--alma-voice)]">Nada por acá</p>
      <p className="mt-2 text-sm text-[var(--alma-text-muted)]">
        La página que buscás no existe o se movió de lugar.
      </p>
      <Link
        href="/hoy"
        className="mt-6 rounded-md bg-[var(--alma-action)] px-4 py-3 font-semibold text-[var(--alma-on-action)] shadow-brand transition-opacity duration-micro ease-alma hover:opacity-90"
      >
        Ir a Hoy
      </Link>
    </main>
  );
}
