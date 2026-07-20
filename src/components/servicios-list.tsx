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

type Empleado = { id: string; nombre: string };

export function ServiciosList({
  servicios,
  empleados,
  empleadosPorServicio,
  onGuardar,
  onToggle,
  onToggleEmpleado,
}: {
  servicios: Servicio[];
  empleados: Empleado[];
  empleadosPorServicio: Record<string, string[]>;
  onGuardar: (prev: AjustesState, formData: FormData) => Promise<AjustesState>;
  onToggle: (formData: FormData) => Promise<void>;
  onToggleEmpleado: (formData: FormData) => Promise<void>;
}) {
  const [editId, setEditId] = useState<string | null>(null);
  const [creando, setCreando] = useState(false);

  if (editId || creando) {
    const s = editId ? servicios.find((x) => x.id === editId) ?? undefined : undefined;
    return (
      <ServicioForm
        key={editId ?? 'nuevo'}
        servicio={s}
        empleados={empleados}
        empleadosAsignados={s ? empleadosPorServicio[s.id] ?? [] : []}
        onGuardar={onGuardar}
        onToggleEmpleado={onToggleEmpleado}
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
          {servicios.map((s) => {
            const empIds = empleadosPorServicio[s.id] ?? [];
            const empNombres = empleados.filter((e) => empIds.includes(e.id)).map((e) => e.nombre);
            return (
              <li
                key={s.id}
                className="rounded-lg border border-[var(--alma-border)] bg-[var(--alma-surface)] px-3.5 py-3"
              >
                <div className="flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm font-medium ${!s.activo ? 'text-[var(--alma-text-muted)] line-through' : ''}`}>
                      {s.nombre}
                    </p>
                    <p className="tnum text-xs text-[var(--alma-text-muted)]">
                      {pesos(Number(s.precio))} · {s.duracion_min} min
                      {Number(s.sena_monto) > 0 && ` · seña ${pesos(Number(s.sena_monto))}`}
                    </p>
                    {empNombres.length > 0 && (
                      <p className="mt-0.5 text-xs text-[var(--alma-text-muted)]">
                        {empNombres.join(', ')}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditId(s.id)}
                    className="text-xs font-semibold text-[var(--alma-action)] transition-opacity duration-micro ease-alma hover:opacity-80"
                  >
                    Editar
                  </button>
                </div>
                {s.activo && empleados.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5 border-t border-[var(--alma-border)] pt-2">
                    {empleados.map((e) => {
                      const asignado = empIds.includes(e.id);
                      return (
                        <button
                          key={e.id}
                          type="button"
                          onClick={() => {
                            const form = new FormData();
                            form.set('service_id', s.id);
                            form.set('employee_id', e.id);
                            form.set('asignar', String(!asignado));
                            onToggleEmpleado(form);
                          }}
                          className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors duration-micro ease-alma ${
                            asignado
                              ? 'bg-[var(--alma-action)] text-[var(--alma-on-action)]'
                              : 'border border-[var(--alma-border)] text-[var(--alma-text-muted)] hover:border-[var(--alma-text-muted)]'
                          }`}
                        >
                          {e.nombre}
                        </button>
                      );
                    })}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function ServicioForm({
  servicio,
  empleados,
  empleadosAsignados,
  onGuardar,
  onToggleEmpleado,
  onCancel,
}: {
  servicio?: Servicio;
  empleados: Empleado[];
  empleadosAsignados: string[];
  onGuardar: (prev: AjustesState, formData: FormData) => Promise<AjustesState>;
  onToggleEmpleado: (formData: FormData) => Promise<void>;
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

      {servicio && empleados.length > 0 && (
        <div className="border-t border-[var(--alma-border)] pt-3">
          <p className="mb-2 text-xs font-semibold text-[var(--alma-text-muted)]">
            Empleados que pueden hacer este servicio
          </p>
          <div className="flex flex-wrap gap-1.5">
            {empleados.map((e) => {
              const asignado = empleadosAsignados.includes(e.id);
              return (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => {
                    const form = new FormData();
                    form.set('service_id', servicio.id);
                    form.set('employee_id', e.id);
                    form.set('asignar', String(!asignado));
                    onToggleEmpleado(form);
                  }}
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors duration-micro ease-alma ${
                    asignado
                      ? 'bg-[var(--alma-action)] text-[var(--alma-on-action)]'
                      : 'border border-[var(--alma-border)] text-[var(--alma-text-muted)] hover:border-[var(--alma-text-muted)]'
                  }`}
                >
                  {e.nombre}
                </button>
              );
            })}
          </div>
        </div>
      )}

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
