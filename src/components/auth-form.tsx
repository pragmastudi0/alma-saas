'use client';

import { useActionState } from 'react';
import type { AuthState } from '@/app/(auth)/actions';

const inputCls =
  'w-full rounded-md border border-[var(--alma-border)] bg-[var(--alma-bg)] px-3.5 py-3 ' +
  'outline-none transition-colors duration-micro ease-alma focus:border-[var(--alma-action)]';

export function AuthForm({
  action,
  title,
  submitLabel,
  withNombre = false,
  footer,
}: {
  action: (prev: AuthState, formData: FormData) => Promise<AuthState>;
  title: string;
  submitLabel: string;
  withNombre?: boolean;
  footer: React.ReactNode;
}) {
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <div>
      <h1 className="voice mb-6 text-[32px] leading-tight">{title}</h1>
      <form action={formAction} className="flex flex-col gap-4">
        {withNombre && (
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-[var(--alma-text-muted)]">
              Tu nombre
            </span>
            <input name="nombre" autoComplete="name" placeholder="Ej: Sofi" className={inputCls} />
          </label>
        )}
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-[var(--alma-text-muted)]">
            Correo
          </span>
          <input name="email" type="email" autoComplete="email" required className={inputCls} />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-[var(--alma-text-muted)]">
            Contraseña
          </span>
          <input
            name="password"
            type="password"
            autoComplete={withNombre ? 'new-password' : 'current-password'}
            required
            className={inputCls}
          />
        </label>

        {state.error && (
          <p role="alert" className="text-sm text-[var(--error-600)]">
            {state.error}
          </p>
        )}
        {state.info && <p className="text-sm text-[var(--alma-action)]">{state.info}</p>}

        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-[var(--alma-action)] px-4 py-3 font-semibold text-[var(--alma-on-action)] shadow-brand transition-opacity duration-micro ease-alma disabled:opacity-40"
        >
          {pending ? 'Un momento…' : submitLabel}
        </button>

        <button
          type="button"
          disabled
          title="Muy pronto vas a poder entrar con Google."
          className="rounded-md border border-[var(--alma-border)] px-4 py-3 font-semibold opacity-40"
        >
          Continuar con Google
        </button>
      </form>
      <p className="mt-6 text-sm text-[var(--alma-text-muted)]">{footer}</p>
    </div>
  );
}
