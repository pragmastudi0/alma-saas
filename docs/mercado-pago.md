# Mercado Pago multi-cuenta: cada profesional cobra en su propia cuenta

Las señas NO pasan por ninguna cuenta central: cada profesional conecta su
cuenta de Mercado Pago desde **Ajustes → Cobros** (OAuth) y los links de pago
se crean con sus credenciales. alma solo guarda los tokens, cifrados.

## Cómo funciona

1. El profesional toca "Conectar Mercado Pago" en Ajustes → `/api/mp/conectar`
   lo manda a autorizar en MP (authorization code + PKCE, con `state` en cookie).
2. `/api/mp/callback` intercambia el código por tokens y los guarda cifrados
   (AES-256-GCM) en `alma_mp_accounts`, junto al `collector_id` del vendedor.
3. Al generar un link de seña se usa el `access_token` de ese tenant: el dinero
   entra a su cuenta. El link queda persistido en el turno para reenviarlo.
4. El webhook (`/api/mp/webhook`) recibe la notificación con el `user_id` del
   vendedor, resuelve la cuenta por `collector_id`, consulta el pago con el
   token de ese vendedor y confirma el turno (idempotente). La seña acreditada
   se asienta sola en caja (ingreso, categoría "Seña").
5. Tokens: duran 180 días; se renuevan solos (refresh) cuando quedan a menos de
   30 días de vencer. Si la renovación falla y el token venció, la cuenta queda
   desconectada y la app pide reconectar.

Quien no conecte MP puede cargar su **alias** en Ajustes: el pedido de seña sale
por WhatsApp con el alias y la confirmación es manual ("Marcar seña cobrada").

## Configurar la aplicación (una sola vez, para toda la plataforma)

1. En el [DevPortal de Mercado Pago](https://www.mercadopago.com.ar/developers/panel/app)
   creá una aplicación tipo **pagos online** con **modelo marketplace/plataforma**.
2. En la config de la app:
   - **Redirect URL**: `https://<tu-dominio>/api/mp/callback` (exacta, con https).
   - **Scopes**: `read`, `write`, `offline_access` (sin offline_access no hay refresh).
3. En **Webhooks** configurá la URL `https://<tu-dominio>/api/mp/webhook`
   (evento: pagos) y copiá el **secret** de firma.
4. Completá las env (local en `.env.local`, producción en Vercel):
   - `MP_CLIENT_ID` y `MP_CLIENT_SECRET` (credenciales de la aplicación)
   - `MP_WEBHOOK_SECRET` (secret de firma del webhook)
   - `MP_TOKEN_ENC_KEY` (clave de cifrado: `openssl rand -base64 32`)
   - `NEXT_PUBLIC_SITE_URL` (dominio público, usado en redirect y webhook)

## Probar en sandbox

1. Creá [cuentas de prueba](https://www.mercadopago.com.ar/developers/es/docs/checkout-pro/additional-content/your-integrations/test/accounts)
   (una vendedora y una compradora) desde tu aplicación.
2. Entrá a alma con un tenant de prueba y conectá la cuenta **vendedora** desde Ajustes.
3. Creá un turno con seña, generá el link y pagalo con la cuenta **compradora**.
4. Verificá: turno pasa de "Falta seña" a "Confirmado" solo, fila en
   `alma_payments`, ingreso "Seña" en caja, y el dinero en la cuenta vendedora.

## Decisiones

- **Sin comisión de plataforma**: no se manda `marketplace_fee`; el 100% de la
  seña va al profesional. Si algún día alma cobra comisión, se agrega ese campo
  en `crearPreferenciaSena` sin re-autorizar cuentas.
- Los tokens jamás son legibles desde el cliente: RLS + grants de columna solo
  exponen `collector_id`/fechas; la lectura/escritura real es del service role.
