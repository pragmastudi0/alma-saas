import { createServerSupabase } from '@/lib/supabase/server';
import { AjustesForm } from '@/components/ajustes-form';
import { DisponibilidadForm } from '@/components/disponibilidad-form';
import { LinkPublico } from '@/components/link-publico';
import type { DisponibilidadDia } from '@/lib/disponibilidad';
import { slugificar } from '@/lib/slug';
import { guardarAjustes, guardarDisponibilidad } from './actions';

function siteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
  );
}

type Settings = {
  precio_default?: number;
  sena_default?: number;
  duracion_default?: number;
  alias_mp?: string | null;
};

export default async function AjustesPage() {
  const supabase = await createServerSupabase();
  const [{ data: tenant }, { data: dispo }] = await Promise.all([
    supabase.from('alma_tenants').select('nombre, profesion, settings, slug').maybeSingle(),
    supabase
      .from('alma_availability')
      .select('dia_semana, hora_desde, hora_hasta')
      .order('dia_semana'),
  ]);

  const s = (tenant?.settings ?? {}) as Settings;

  // Postgres devuelve time como 'HH:MM:SS'; los inputs time esperan 'HH:MM'.
  const disponibilidad: DisponibilidadDia[] = (dispo ?? []).map((d) => ({
    dia_semana: d.dia_semana,
    hora_desde: String(d.hora_desde).slice(0, 5),
    hora_hasta: String(d.hora_hasta).slice(0, 5),
  }));

  return (
    <main className="pb-10">
      <header className="mb-5">
        <h1 className="text-[22px] font-semibold">Ajustes</h1>
      </header>

      <AjustesForm
        action={guardarAjustes}
        defaults={{
          nombre: tenant?.nombre ?? '',
          profesion: tenant?.profesion ?? '',
          precio_default: s.precio_default ?? 0,
          sena_default: s.sena_default ?? 0,
          duracion_default: s.duracion_default ?? 45,
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
