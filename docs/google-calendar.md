# Google Calendar directo

ALMA ya ofrece un feed iCal en Ajustes. La conexión directa es opcional y escribe
eventos en el calendario principal del profesional. Los cambios hechos en Google
no vuelven a ALMA: ALMA es la fuente de verdad.

## Preparación

1. Aplicá la migración `20261103120000_alma_google_calendar.sql` al proyecto
   Supabase compartido. Solo crea objetos con prefijo `alma_`.
2. En Google Cloud Console, habilitá Google Calendar API y creá credenciales
   OAuth tipo aplicación web. Registrá exactamente
   `https://<dominio>/api/google-calendar/callback` como redirect URI.
3. Configurá `GOOGLE_CALENDAR_CLIENT_ID`, `GOOGLE_CALENDAR_CLIENT_SECRET`,
   `GOOGLE_TOKEN_ENC_KEY` (generada con `openssl rand -base64 32`) y
   `NEXT_PUBLIC_SITE_URL` en el servidor. La conexión solicita solo el scope
   `calendar.events` y acceso sin conexión para renovar el token.
4. Desde Ajustes, conectá la cuenta. ALMA sincroniza los turnos confirmados
   futuros en lotes. Si se interrumpe, usá «Sincronizar turnos futuros».

Si ya agregaste el feed iCal de ALMA a Google desde una URL, quitá esa
suscripción para no ver dos copias de cada turno. El feed sigue disponible para
otros calendarios.

Cuando Google falla, el turno queda guardado en ALMA y el detalle ofrece un
reintento. Los tokens están cifrados y solo el servidor los puede leer.
