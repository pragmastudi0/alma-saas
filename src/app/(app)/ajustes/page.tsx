import { createServerSupabase } from '@/lib/supabase/server';
import { AjustesForm } from '@/components/ajustes-form';
import { guardarAjustes } from './actions';

type Settings = {
  precio_default?: number;
  sena_default?: number;
  duracion_default?: number;
  alias_mp?: string | null;
};

export default async function AjustesPage() {
  const supabase = await createServerSupabase();
  const { data: tenant } = await supabase
    .from('alma_tenants')
    .select('nombre, profesion, settings')
    .maybeSingle();

  const s = (tenant?.settings ?? {}) as Settings;

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
        }}
      />
    </main>
  );
}
