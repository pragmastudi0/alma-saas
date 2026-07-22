'use client';

import { useActionState } from 'react';
import { inputCls, labelCls } from '@/components/ui/field';
import type { AjustesState } from '@/lib/ajustes';

type Defaults = {
  nombre: string;
  profesion: string;
  precio_default: number;
  sena_default: number;
  duracion_default: number;
  inactividad_dias: number;
  plantilla_cancelacion: string;
  alias_mp: string;
  slug: string;
};

export function AjustesForm({
  action,
  defaults,
}: {
  action: (prev: AjustesState, formData: FormData) => Promise<AjustesState>;
  defaults: Defaults;
}) {
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <label className="block">
        <span className={labelCls}>Tu nombre</span>
        <input name="nombre" required defaultValue={defaults.nombre} className={inputCls} />
      </label>

      <label className="block">
        <span className={labelCls}>Profesión</span>
        <input
          name="profesion"
          defaultValue={defaults.profesion}
          placeholder="Ej: nutricionista"
          className={inputCls}
        />
      </label>

      <div className="mt-2 border-t border-[var(--alma-border)] pt-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[.08em] text-[var(--alma-text-muted)]">
          Valores por defecto del turno
        </p>
        <div className="flex flex-col gap-4">
          <div className="flex gap-3">
            <label className="block flex-1">
              <span className={labelCls}>Precio</span>
              <input
                name="precio_default"
                type="number"
                min={0}
                step={500}
                defaultValue={defaults.precio_default}
                className={inputCls + ' tnum'}
              />
            </label>
            <label className="block flex-1">
              <span className={labelCls}>Seña</span>
              <input
                name="sena_default"
                type="number"
                min={0}
                step={500}
                defaultValue={defaults.sena_default}
                className={inputCls + ' tnum'}
              />
            </label>
          </div>
          <label className="block">
            <span className={labelCls}>Duración (minutos)</span>
            <input
              name="duracion_default"
              type="number"
              min={5}
              step={5}
              required
              defaultValue={defaults.duracion_default}
              className={inputCls + ' tnum'}
            />
          </label>
        </div>
      </div>

      <label className="block border-t border-[var(--alma-border)] pt-4">
        <span className={labelCls}>Pacientes inactivos (días)</span>
        <input
          name="inactividad_dias"
          type="number"
          min={1}
          max={365}
          step={1}
          required
          defaultValue={defaults.inactividad_dias}
          className={inputCls + ' tnum'}
        />
        <span className="mt-1.5 block text-xs text-[var(--alma-text-muted)]">
          En Reportes te mostramos qué pacientes llevan más de estos días sin venir.
        </span>
      </label>

      <label className="block border-t border-[var(--alma-border)] pt-4">
        <span className={labelCls}>Mensaje de cancelación</span>
        <textarea
          name="plantilla_cancelacion"
          rows={3}
          maxLength={300}
          defaultValue={defaults.plantilla_cancelacion}
          className={inputCls}
        />
        <span className="mt-1.5 block text-xs text-[var(--alma-text-muted)]">
          Es el mensaje que se abre en WhatsApp al cancelar un turno. Escribí{' '}
          {'{nombre}'}, {'{apellido}'}, {'{fecha}'} y {'{hora}'} donde quieras que se completen
          solos.
        </span>
      </label>

      <label className="block border-t border-[var(--alma-border)] pt-4">
        <span className={labelCls}>Alias para transferencias</span>
        <input
          name="alias_mp"
          defaultValue={defaults.alias_mp}
          placeholder="tu.alias.mp"
          className={inputCls}
        />
        <span className="mt-1.5 block text-xs text-[var(--alma-text-muted)]">
          Si no conectás Mercado Pago, la seña se pide por transferencia a este alias.
        </span>
      </label>

      <label className="block border-t border-[var(--alma-border)] pt-4">
        <span className={labelCls}>Tu link de reservas</span>
        <div className="flex items-center gap-1">
          <span className="shrink-0 text-sm text-[var(--alma-text-muted)]">/t/</span>
          <input
            name="slug"
            defaultValue={defaults.slug}
            placeholder="tu-nombre"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            className={inputCls}
          />
        </div>
        <span className="mt-1 block text-xs text-[var(--alma-text-muted)]">
          Minúsculas, números y guiones. Dejalo vacío para desactivar las reservas online.
        </span>
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
        {pending ? 'Un momento…' : 'Guardar cambios'}
      </button>
    </form>
  );
}
