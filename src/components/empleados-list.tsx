'use client';

import { useActionState, useState } from 'react';
import { inputCls, labelCls } from '@/components/ui/field';
import type { AjustesState } from '@/lib/ajustes';

type Empleado = {
  id: string;
  nombre: string;
  color: string;
  activo: boolean;
};

export function EmpleadosList({
  empleados,
  onGuardar,
  onToggle,
}: {
  empleados: Empleado[];
  onGuardar: (prev: AjustesState, formData: FormData) => Promise<AjustesState>;
  onToggle: (formData: FormData) => Promise<void>;
}) {
  const [editId, setEditId] = useState<string | null>(null);
  const [creando, setCreando] = useState(false);

  if (editId || creando) {
    const e = editId ? empleados.find((x) => x.id === editId) ?? undefined : undefined;
    return (
      <EmpleadoForm
        key={editId ?? 'nuevo'}
        empleado={e}
        onGuardar={onGuardar}
        onCancel={() => {
          setEditId(null);
          setCreando(false);
        }}
      />
    );
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-[.08em] text-[var(--alma-text-muted)]">
          Empleados
        </p>
        <button
          type="button"
          onClick={() => setCreando(true)}
          className="text-xs font-semibold text-[var(--alma-action)] transition-opacity duration-micro ease-alma hover:opacity-80"
        >
          + Nuevo empleado
        </button>
      </div>

      {empleados.length === 0 ? (
        <p className="text-sm text-[var(--alma-text-muted)]">
          Todavía no cargaste empleados. Los turnos se crean sin asignar.
        </p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {empleados.map((e) => (
            <li
              key={e.id}
              className="flex items-center gap-3 rounded-lg border border-[var(--alma-border)] bg-[var(--alma-surface)] px-3.5 py-3"
            >
              <span
                className="h-3 w-3 shrink-0 rounded-full"
                style={{ backgroundColor: e.color }}
                aria-hidden="true"
              />
              <span className={`min-w-0 flex-1 text-sm font-medium ${!e.activo ? 'text-[var(--alma-text-muted)] line-through' : ''}`}>
                {e.nombre}
              </span>
              <button
                type="button"
                onClick={() => {
                  const form = new FormData();
                  form.set('id', e.id);
                  form.set('activo', String(!e.activo));
                  onToggle(form);
                }}
                className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors duration-micro ease-alma ${
                  e.activo
                    ? 'bg-[var(--success-soft)] text-[var(--success-600)]'
                    : 'bg-[var(--error-soft)] text-[var(--error-600)]'
                }`}
              >
                {e.activo ? 'Activo' : 'Inactivo'}
              </button>
              <button
                type="button"
                onClick={() => setEditId(e.id)}
                className="text-xs font-semibold text-[var(--alma-text-muted)] transition-opacity duration-micro ease-alma hover:opacity-80"
              >
                Editar
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function EmpleadoForm({
  empleado,
  onGuardar,
  onCancel,
}: {
  empleado?: Empleado;
  onGuardar: (prev: AjustesState, formData: FormData) => Promise<AjustesState>;
  onCancel: () => void;
}) {
  const [state, formAction, pending] = useActionState(onGuardar, {});

  return (
    <form action={formAction} className="flex flex-col gap-3 rounded-lg border border-[var(--alma-border)] bg-[var(--alma-surface)] p-4">
      {empleado && <input type="hidden" name="id" value={empleado.id} />}

      <label className="block">
        <span className={labelCls}>Nombre</span>
        <input name="nombre" required defaultValue={empleado?.nombre ?? ''} className={inputCls} />
      </label>

      <label className="block">
        <span className={labelCls}>Color</span>
        <input name="color" type="color" defaultValue={empleado?.color ?? '#6366f1'} className="h-10 w-full rounded-md border border-[var(--alma-border)] bg-[var(--alma-bg)]" />
      </label>

      {state.error && (
        <p role="alert" className="text-sm text-[var(--error-600)]">
          {state.error}
        </p>
      )}
      {state.info && <p className="text-sm text-[var(--alma-action)]">{state.info}</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-[var(--alma-action)] px-4 py-2.5 text-sm font-semibold text-[var(--alma-on-action)] shadow-brand transition-opacity duration-micro ease-alma disabled:opacity-40"
        >
          {pending ? 'Un momento…' : empleado ? 'Guardar cambios' : 'Crear empleado'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-[var(--alma-border)] px-4 py-2.5 text-sm font-semibold text-[var(--alma-text-muted)] transition-opacity duration-micro ease-alma hover:opacity-80"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
