import { createServerSupabase } from '@/lib/supabase/server';
import { AjustesForm } from '@/components/ajustes-form';
import { DisponibilidadForm } from '@/components/disponibilidad-form';
import { ServiciosList } from '@/components/servicios-list';
import { EmpleadosList } from '@/components/empleados-list';
import { LinkPublico } from '@/components/link-publico';
import { MpConexion } from '@/components/mp-conexion';
import type { DisponibilidadDia } from '@/lib/disponibilidad';
import { INACTIVIDAD_DIAS_DEFAULT } from '@/lib/inactivos';
import { siteUrl } from '@/lib/mp';
import { slugificar } from '@/lib/slug';
import {
  guardarAjustes,
  guardarDisponibilidad,
  guardarServicio,
  guardarEmpleado,
  toggleServicio,
  toggleEmpleado,
  toggleEmpleadoServicio,
} from './actions';

type Settings = {
  precio_default?: number;
  sena_default?: number;
  duracion_default?: number;
  inactividad_dias?: number;
  alias_mp?: string | null;
};

const MENSAJES_MP: Record<string, { texto: string; error?: boolean }> = {
  conectado: { texto: 'Listo. Tu Mercado Pago quedó conectado.' },
  desconectado: { texto: 'Tu Mercado Pago quedó desconectado.' },
  en_uso: { texto: 'Esa cuenta de Mercado Pago ya está conectada a otro espacio.', error: true },
  error: { texto: 'No pudimos conectar tu Mercado Pago. Probá de nuevo.', error: true },
  sin_config: { texto: 'Falta configurar la aplicación de Mercado Pago en el server.', error: true },
};

export default async function AjustesPage({
  searchParams,
}: {
  searchParams: Promise<{ mp?: string }>;
}) {
  const { mp } = await searchParams;
  const supabase = await createServerSupabase();
  const [{ data: tenant }, { data: dispo }, { data: cuentaMp }, { data: servicios }, { data: empleados }, { data: svcEmps }] =
    await Promise.all([
      supabase.from('alma_tenants').select('nombre, profesion, settings, slug').maybeSingle(),
      supabase
        .from('alma_availability')
        .select('dia_semana, hora_desde, hora_hasta')
        .order('dia_semana'),
      supabase.from('alma_mp_accounts').select('collector_id, connected_at').maybeSingle(),
      supabase
        .from('alma_services')
        .select('id, nombre, descripcion, precio, duracion_min, sena_monto, activo')
        .order('nombre'),
      supabase
        .from('alma_employees')
        .select('id, nombre, color, activo')
        .order('nombre'),
      supabase
        .from('alma_service_employees')
        .select('service_id, employee_id'),
    ]);

  const empPorServicio: Record<string, string[]> = {};
  for (const r of svcEmps ?? []) {
    if (!empPorServicio[r.service_id]) empPorServicio[r.service_id] = [];
    empPorServicio[r.service_id].push(r.employee_id);
  }

  const s = (tenant?.settings ?? {}) as Settings;
  const aviso = mp ? MENSAJES_MP[mp] : undefined;

  // Postgres devuelve time como 'HH:MM:SS'; los inputs time esperan 'HH:MM'.
  const disponibilidad: DisponibilidadDia[] = (dispo ?? []).map((d) => ({
    dia_semana: d.dia_semana,
    hora_desde: String(d.hora_desde).slice(0, 5),
    hora_hasta: String(d.hora_hasta).slice(0, 5),
  }));

  return (
    <main className="pb-10 md:max-w-2xl">
      <header className="mb-5">
        <h1 className="text-[22px] font-semibold">Ajustes</h1>
      </header>

      {aviso && (
        <p
          role={aviso.error ? 'alert' : 'status'}
          className={`mb-4 rounded-md px-3.5 py-2.5 text-sm font-medium ${
            aviso.error
              ? 'bg-[var(--error-soft)] text-[var(--error-600)]'
              : 'bg-[var(--success-soft)] text-[var(--success-600)]'
          }`}
        >
          {aviso.texto}
        </p>
      )}

      <section className="mb-6 rounded-lg border border-[var(--alma-border)] bg-[var(--alma-surface)] p-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[.08em] text-[var(--alma-text-muted)]">
          Cobros · Mercado Pago
        </p>
        <MpConexion cuenta={cuentaMp ?? null} />
      </section>

      <AjustesForm
        action={guardarAjustes}
        defaults={{
          nombre: tenant?.nombre ?? '',
          profesion: tenant?.profesion ?? '',
          precio_default: s.precio_default ?? 0,
          sena_default: s.sena_default ?? 0,
          duracion_default: s.duracion_default ?? 45,
          inactividad_dias: s.inactividad_dias ?? INACTIVIDAD_DIAS_DEFAULT,
          alias_mp: s.alias_mp ?? '',
          slug: tenant?.slug ?? slugificar(tenant?.nombre ?? ''),
        }}
      />

      {tenant?.slug && (
        <section className="mt-8 border-t border-[var(--alma-border)] pt-6">
          <h2 className="mb-1 text-[17px] font-semibold">Reservas online</h2>
          <p className="mb-4 text-sm text-[var(--alma-text-muted)]">
            Compartí este link: tus pacientes eligen horario y, si tenés seña configurada, la pagan
            ahí mismo.
          </p>
          <LinkPublico url={`${siteUrl()}/t/${tenant.slug}`} />
        </section>
      )}

      <section className="mt-8 border-t border-[var(--alma-border)] pt-6">
        <h2 className="mb-1 text-[17px] font-semibold">Servicios</h2>
        <p className="mb-4 text-sm text-[var(--alma-text-muted)]">
          Si ofrecés distintos tipos de consulta o tratamiento, cargalos acá. Al crear un turno,
          elegís el servicio y se completa solo el precio, la seña y la duración.
        </p>
        <ServiciosList
          servicios={servicios ?? []}
          empleados={empleados ?? []}
          empleadosPorServicio={empPorServicio}
          onGuardar={guardarServicio}
          onToggle={toggleServicio}
          onToggleEmpleado={toggleEmpleadoServicio}
        />
      </section>

      <section className="mt-8 border-t border-[var(--alma-border)] pt-6">
        <h2 className="mb-1 text-[17px] font-semibold">Empleados</h2>
        <p className="mb-4 text-sm text-[var(--alma-text-muted)]">
          Si trabajás con más personas, cargalas acá para asignarles turnos.
        </p>
        <EmpleadosList
          empleados={empleados ?? []}
          onGuardar={guardarEmpleado}
          onToggle={toggleEmpleado}
        />
      </section>

      <section className="mt-8 border-t border-[var(--alma-border)] pt-6">
        <h2 className="mb-1 text-[17px] font-semibold">Tus horarios</h2>
        <p className="mb-4 text-sm text-[var(--alma-text-muted)]">
          Los días y horarios en que atendés. Tus pacientes solo van a poder reservar dentro de
          estos horarios.
        </p>
        <DisponibilidadForm action={guardarDisponibilidad} inicial={disponibilidad} />
      </section>
    </main>
  );
}
