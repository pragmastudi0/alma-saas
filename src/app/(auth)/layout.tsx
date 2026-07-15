import { Flor } from '@/components/flor';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center px-5 py-10">
      <div className="mb-8 flex items-center gap-2">
        <Flor className="h-[21px] w-[21px] text-verde-600" />
        <span className="voice text-2xl leading-none">alma</span>
      </div>
      {children}
    </main>
  );
}
