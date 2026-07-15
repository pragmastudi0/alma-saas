# Activar "Continuar con Google"

El botón ya está en las pantallas de login y registro (deshabilitado). Para activarlo:

1. En [Google Cloud Console](https://console.cloud.google.com/) creá un proyecto (o usá uno existente) y en **APIs & Services → Credentials** creá un **OAuth client ID** de tipo *Web application*.
   - Authorized redirect URI: `https://wioidjmgxlldmmampqnz.supabase.co/auth/v1/callback`
2. En el [dashboard de Supabase](https://supabase.com/dashboard/project/wioidjmgxlldmmampqnz/auth/providers) → **Authentication → Providers → Google**: activá el provider y pegá el Client ID y el Client Secret.
3. En **Authentication → URL Configuration** agregá la URL de la app deployada a la lista de *Redirect URLs* (ej: `https://<tu-dominio>.vercel.app/**`).
4. Avisale a Claude para habilitar el botón: falta solo quitar el `disabled` y llamar a `supabase.auth.signInWithOAuth({ provider: 'google' })`.

> Ojo: el proyecto Supabase es compartido con otras apps — revisá que la config de URLs no pise la de las demás.
