'use client';

import { useActionState, useEffect, useRef, useState, useTransition } from 'react';
import { inputCls, labelCls } from '@/components/ui/field';
import { horariosDelDia } from '@/app/(app)/agenda/actions';
import type { AgendaState, HorariosDia, TurnoOcupado } from '@/lib/turno';

type Paciente = { id: string; nombre: string };

type Servicio = { id: string; nombre: string; precio: number | string; duracion_min: number; sena_monto: number | string };
type Empleado = { id: string; nombre: string };

type Defaults = {
  fecha: string;
  hora: string;
  duracion_min: number;
  precio: number;
  sena_monto: number;
  patient_id?: string;
  service_id?: string;
  employee_id?: string;
};

const slotCls = (activo: boolean) =>
  `tnum min-h-[40px] rounded-md border text-sm font-semibold transition-colors duration-micro ease-alma ${
    activo
      ? 'border-[var(--alma-action)] bg-[var(--alma-action)] text-[var(--alma-on-action)]'
      : 'border-[var(--alma-border)] bg-[var(--alma-surface)] hover:border-[var(--alma-text-muted)]'
  }`;

/** Horarios libres + lo ya agendado del día, para no pisar turnos al agendar. */
function Disponibilidad({
  data,
  cargando,
  hora,
  onElegir,
}: {
  data: HorariosDia;
  cargando: boolean;
  hora: string;
  onElegir: (h: string) => void;
}) {
  return (
    <div className="rounded-lg border border-[var(--alma-border)] bg-[var(--alma-surface)] p-4">
      <p className={labelCls}>Horarios libres</p>

      {cargando ? (
        <p className="text-sm text-[var(--alma-text-muted)]">Buscando horarios…</p>
      ) : !data.atiende ? (
        <p className="text-sm text-[var(--alma-text-muted)]">
          No configuraste horarios para este día. Poné la hora a mano abajo, o cargá tus horarios en
          Ajustes.
        </p>
      ) : data.slots.length === 0 ? (
        <p className="text-sm text-[var(--alma-text-muted)]">Ese día está completo.</p>
      ) : (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {data.slots.map((s) => (
            <button key={s} type="button" onClick={() => onElegir(s)} aria-pressed={hora === s} className={slotCls(hora === s)}>
              {s}
            </button>
          ))}
        </div>
      )}

      {data.ocupados.length > 0 && (
        <div className="mt-4 border-t border-[var(--alma-border)] pt-3">
          <p className={labelCls}>Ya agendado ese día</p>
          <ul className="flex flex-col gap-1">
            {data.ocupados.map((o: TurnoOcupado, i) => (
              <li key={`${o.hora}-${i}`} className="flex items-center gap-2 text-sm">
                <span className="tnum font-semibold">{o.hora}</span>
                <span className="min-w-0 flex-1 truncate text-[var(--alma-text-muted)]">
                  {o.paciente}
                </span>
                <span className="tnum text-xs text-[var(--alma-text-muted)]">{o.duracion_min}m</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export function TurnoForm({
  action,
  submitLabel,
  defaults,
  pacientes,
  turnoId,
  horariosIniciales,
  servicios,
  empleados,
}: {
  action: (prev: AgendaState, formData: FormData) => Promise<AgendaState>;
  submitLabel: string;
  defaults: Defaults;
  pacientes?: Paciente[];
  turnoId?: string;
  horariosIniciales?: HorariosDia;
  servicios?: Servicio[];
  empleados?: Empleado[];
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const [nuevo, setNuevo] = useState(pacientes?.length === 0);

  // Alta de turno: la disponibilidad se recalcula al cambiar fecha o duración.
  const esAlta = !turnoId;
  const [fecha, setFecha] = useState(defaults.fecha);
  const [hora, setHora] = useState(defaults.hora);
  const [duracion, setDuracion] = useState(String(defaults.duracion_min));
  const [precio, setPrecio] = useState(String(defaults.precio));
  const [senaMonto, setSenaMonto] = useState(String(defaults.sena_monto));
  const [horarios, setHorarios] = useState<HorariosDia>(
    horariosIniciales ?? { slots: [], ocupados: [], atiende: false },
  );
  const [cargando, startCarga] = useTransition();
  const primerRender = useRef(true);

  const handleServiceChange = (serviceId: string) => {
    const s = servicios?.find((sv) => sv.id === serviceId);
    if (s) {
      setPrecio(String(Number(s.precio)));
      setSenaMonto(String(Number(s.sena_monto)));
      setDuracion(String(s.duracion_min));
    }
  };

  useEffect(() => {
    if (!esAlta) return;
    if (primerRender.current) {
      primerRender.current = false;
      return; // ya vino calculado del servidor (horariosIniciales)
    }
    const dur = Number(duracion);
    if (!dur) return;
    startCarga(async () => {
      setHorarios(await horariosDelDia(fecha, dur));
    });
  }, [fecha, duracion, esAlta]);

  return (
    <form action={formAction} className="flex flex-col gap-4 md:max-w-xl">
      {turnoId && <input type="hidden" name="id" value={turnoId} />}

      {servicios && servicios.length > 0 && (
        <label className="block">
          <span className={labelCls}>Servicio</span>
          <select
            name="service_id"
            defaultValue={defaults.service_id ?? ''}
            onChange={(e) => handleServiceChange(e.target.value)}
            className={inputCls}
          >
            <option value="">Sin servicio (valores manuales)</option>
            {servicios.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nombre} — ${Number(s.precio).toLocaleString('es-AR')} / {s.duracion_min} min
              </option>
            ))}
          </select>
        </label>
      )}

      {empleados && empleados.length > 0 && (
        <label className="block">
          <span className={labelCls}>Empleado</span>
          <select name="employee_id" defaultValue={defaults.employee_id ?? ''} className={inputCls}>
            <option value="">Sin asignar</option>
            {empleados.map((e) => (
              <option key={e.id} value={e.id}>
                {e.nombre}
              </option>
            ))}
          </select>
        </label>
      )}

      {pacientes && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--alma-text-muted)]">Paciente</span>
            <button
              type="button"
              onClick={() => setNuevo((v) => !v)}
              className="text-xs font-semibold text-[var(--alma-action)] transition-opacity duration-micro ease-alma hover:opacity-80"
            >
              {nuevo ? 'Elegir de la lista' : 'Paciente nuevo'}
            </button>
          </div>

          {nuevo ? (
            <div className="flex flex-col gap-3">
              <input
                name="nuevo_nombre"
                placeholder="Nombre y apellido"
                autoComplete="off"
                className={inputCls}
              />
              <input
                name="nuevo_telefono"
                placeholder="Teléfono (opcional)"
                inputMode="tel"
                autoComplete="off"
                className={inputCls}
              />
            </div>
          ) : (
            <select name="patient_id" defaultValue={defaults.patient_id ?? ''} className={inputCls}>
              <option value="" disabled>
                Elegí un paciente
              </option>
              {pacientes.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="block">
          <span className={labelCls}>Fecha</span>
          <input
            name="fecha"
            type="date"
            required
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            className={inputCls}
          />
        </label>
        <label className="block">
          <span className={labelCls}>Duración (minutos)</span>
          <input
            name="duracion_min"
            type="number"
            min={5}
            step={5}
            required
            value={duracion}
            onChange={(e) => setDuracion(e.target.value)}
            className={inputCls + ' tnum'}
          />
        </label>
      </div>

      {esAlta && (
        <Disponibilidad data={horarios} cargando={cargando} hora={hora} onElegir={setHora} />
      )}

      <label className="block">
        <span className={labelCls}>Hora{esAlta ? ' (elegí un horario o ponela a mano)' : ''}</span>
        <input
          name="hora"
          type="time"
          required
          value={hora}
          onChange={(e) => setHora(e.target.value)}
          className={inputCls + ' tnum'}
        />
      </label>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="block">
          <span className={labelCls}>Precio</span>
          <input
            name="precio"
            type="number"
            min={0}
            step={500}
            value={precio}
            onChange={(e) => setPrecio(e.target.value)}
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
            value={senaMonto}
            onChange={(e) => setSenaMonto(e.target.value)}
            className={inputCls + ' tnum'}
          />
        </label>
      </div>

      <p className="text-xs text-[var(--alma-text-muted)]">
        Con seña, el turno queda a la espera de la seña. Sin seña, nace confirmado.
      </p>

      {state.error && (
        <p role="alert" className="text-sm text-[var(--error-600)]">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-[var(--alma-action)] px-4 py-3 font-semibold text-[var(--alma-on-action)] shadow-brand transition-opacity duration-micro ease-alma disabled:opacity-40"
      >
        {pending ? 'Un momento…' : submitLabel}
      </button>
    </form>
  );
}
