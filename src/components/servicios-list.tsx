'use client';

import { useActionState, useState } from 'react';
import { inputCls, labelCls } from '@/components/ui/field';
import { pesos } from '@/lib/format';
import type { AjustesState } from '@/lib/ajustes';

type Servicio = {
  id: string;
  nombre: string;
  descripcion: string;
  precio: number | string;
  duracion_min: number;
  sena_monto: number | string;
  activo: boolean;
};

export function ServiciosList({
  servicios,
  onGuardar,
  onToggle,
}: {
  servicios: Servicio[];
  onGuardar: (prev: AjustesState, formData: FormData) => Promise<AjustesState>;
  onToggle: (formData: FormData) => Promise<void>;
}) {
  const [editId, setEditId] = useState<string | null>(null);
  const [creando, setCreando] = useState(false);

  if (editId || creando) {
    const s = editId ? servicios.find((x) => x.id === editId) ?? undefined : undefined;
    return (
      <ServicioForm
        key={editId ?? 'nuevo'}
        servicio={s}
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
          Servicios
        </p>
        <button
          type="button"
          onClick={() => setCreando(true)}
          className="text-xs font-semibold text-[var(--alma-action)] transition-opacity duration-micro ease-alma hover:opacity-80"
        >
          + Nuevo servicio
        </button>
      </div>

      {servicios.length === 0 ? (
        <p className="text-sm text-[var(--alma-text-muted)]">
          Todavía no creaste servicios. Los turnos se crean con los valores por defecto.
        </p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {servicios.map((s) => (
            <li
              key={s.id}
              className="flex items-center gap-3 rounded-lg border border-[var(--alma-border)] bg-[var(--alma-surface)] px-3.5 py-3"
            >
              <div className="min-w-0 flex-1">
                <p className={`text-sm font-medium ${!s.activo ? 'text-[var(--alma-text-muted)] line-through' : ''}`}>
                  {s.nombre}
                </p>
                <p className="tnum text-xs text-[var(--alma-text-muted)]">
                  {pesos(Number(s.precio))} · {s.duracion_min} min
                  {Number(s.sena_monto) > 0 && ` · seña ${pesos(Number(s.sena_monto))}`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  const form = new FormData();
                  form.set('id', s.id);
                  form.set('activo', String(!s.activo));
                  onToggle(form);
                }}
                className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors duration-micro ease-alma ${
                  s.activo
                    ? 'bg-[var(--success-soft)] text-[var(--success-600)]'
                    : 'bg-[var(--error-soft)] text-[var(--error-600)]'
                }`}
              >
                {s.activo ? 'Activo' : 'Inactivo'}
              </button>
              <button
                type="button"
                onClick={() => setEditId(s.id)}
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

function ServicioForm({
  servicio,
  onGuardar,
  onCancel,
}: {
  servicio?: Servicio;
  onGuardar: (prev: AjustesState, formData: FormData) => Promise<AjustesState>;
  onCancel: () => void;
}) {
  const [state, formAction, pending] = useActionState(onGuardar, {});

  return (
    <form action={formAction} className="flex flex-col gap-3 rounded-lg border border-[var(--alma-border)] bg-[var(--alma-surface)] p-4">
      {servicio && <input type="hidden" name="id" value={servicio.id} />}

      <label className="block">
        <span className={labelCls}>Nombre</span>
        <input name="nombre" required defaultValue={servicio?.nombre ?? ''} className={inputCls} />
      </label>

      <label className="block">
        <span className={labelCls}>Descripción (opcional)</span>
        <input name="descripcion" defaultValue={servicio?.descripcion ?? ''} className={inputCls} />
      </label>

      <div className="grid grid-cols-3 gap-3">
        <label className="block">
          <span className={labelCls}>Precio</span>
          <input
            name="precio"
            type="number"
            min={0}
            step={500}
            required
            defaultValue={servicio?.precio ?? 0}
            className={inputCls + ' tnum'}
          />
        </label>
        <label className="block">
          <span className={labelCls}>Seña</span>
          <input
            name="sena_monto"
            type="number"
            min={0}
            step={500}
            defaultValue={servicio?.sena_monto ?? 0}
            className={inputCls + ' tnum'}
          />
        </label>
        <label className="block">
          <span className={labelCls}>Duración (min)</span>
          <input
            name="duracion_min"
            type="number"
            min={5}
            step={5}
            required
            defaultValue={servicio?.duracion_min ?? 45}
            className={inputCls + ' tnum'}
          />
        </label>
      </div>

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
          {pending ? 'Un momento…' : servicio ? 'Guardar cambios' : 'Crear servicio'}
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
