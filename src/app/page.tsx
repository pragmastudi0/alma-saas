import { redirect } from 'next/navigation';
import { createServerSupabase } from '@/lib/supabase/server';
import { Landing } from '@/components/landing';

export default async function Home() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Con sesión: directo a la app. Sin sesión: la landing de marketing.
  if (user) redirect('/hoy');

  return <Landing />;
}
