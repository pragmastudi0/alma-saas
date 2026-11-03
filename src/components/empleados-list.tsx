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

type GuardarAction = (prev: AjustesState, formData: FormData) => Promise<AjustesState>;

export function EmpleadosList({
  empleados,
  onGuardar,
  onToggle,
  onEliminar,
}: {
  empleados: Empleado[];
  onGuardar: GuardarAction;
  onToggle: (formData: FormData) => Promise<void>;
  onEliminar: GuardarAction;
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
            <EmpleadoFila
              key={e.id}
              empleado={e}
              onEditar={() => setEditId(e.id)}
              onToggle={onToggle}
              onEliminar={onEliminar}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * Fila de un empleado. El borrado vive acá (y no en la lista) para que cada
 * fila tenga su propio estado de acción y muestre su error donde corresponde.
 */
function EmpleadoFila({
  empleado,
  onEditar,
  onToggle,
  onEliminar,
}: {
  empleado: Empleado;
  onEditar: () => void;
  onToggle: (formData: FormData) => Promise<void>;
  onEliminar: GuardarAction;
}) {
  const [state, formAction, pending] = useActionState(onEliminar, {});

  return (
    <li className="rounded-lg border border-[var(--alma-border)] bg-[var(--alma-surface)] px-3.5 py-3">
      <div className="flex items-center gap-3">
        <span
          className="h-3 w-3 shrink-0 rounded-full"
          style={{ backgroundColor: empleado.color }}
          aria-hidden="true"
        />
        <span
          className={`min-w-0 flex-1 truncate text-sm font-medium ${!empleado.activo ? 'text-[var(--alma-text-muted)] line-through' : ''}`}
        >
          {empleado.nombre}
        </span>
        <button
          type="button"
          onClick={() => {
            const form = new FormData();
            form.set('id', empleado.id);
            form.set('activo', String(!empleado.activo));
            onToggle(form);
          }}
          className={`shrink-0 rounded-md px-2.5 py-1 text-xs font-semibold transition-colors duration-micro ease-alma ${
            empleado.activo
              ? 'bg-[var(--success-soft)] text-[var(--success-600)]'
              : 'bg-[var(--error-soft)] text-[var(--error-600)]'
          }`}
        >
          {empleado.activo ? 'Activo' : 'Inactivo'}
        </button>
        <button
          type="button"
          onClick={onEditar}
          className="shrink-0 text-xs font-semibold text-[var(--alma-text-muted)] transition-opacity duration-micro ease-alma hover:opacity-80"
        >
          Editar
        </button>
        <form
          action={formAction}
          onSubmit={(ev) => {
            if (
              !confirm(
                `¿Eliminar a ${empleado.nombre}? Los turnos que atendió quedan sin empleado asignado. No se puede deshacer.`,
              )
            ) {
              ev.preventDefault();
            }
          }}
        >
          <input type="hidden" name="id" value={empleado.id} />
          <button
            type="submit"
            disabled={pending}
            className="shrink-0 text-xs font-semibold text-[var(--alma-text-muted)] transition-colors duration-micro ease-alma hover:text-[var(--error-600)] disabled:opacity-40"
          >
            {pending ? '…' : 'Eliminar'}
          </button>
        </form>
      </div>
      {state.error && (
        <p role="alert" className="mt-1.5 text-sm text-[var(--error-600)]">
          {state.error}
        </p>
      )}
    </li>
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
