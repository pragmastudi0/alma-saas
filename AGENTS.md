<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# alma — contexto del proyecto

SaaS mobile-first: la secretaria virtual del profesional independiente (turnos, señas por Mercado Pago, WhatsApp semi-automático vía wa.me, caja simple). Mercado inicial: Argentina. Filosofía: cada funcionalidad debe ahorrarle tiempo al profesional; pocas funciones, excelentes.

## Reglas duras

- **Multi-tenant**: el proyecto Supabase (`wioidjmgxlldmmampqnz`) es COMPARTIDO con otras apps. Todas las tablas/funciones llevan prefijo `alma_`. Prohibido tocar objetos sin ese prefijo o crear triggers sobre `auth.users`. Toda tabla de negocio: `tenant_id uuid not null` + políticas RLS (`tenant_id = alma_current_tenant_id()`).
- **Migraciones**: versionadas en `supabase/migrations/`, aplicadas también al proyecto remoto. Nunca cambiar el esquema sin migración.
- **Máquina de estados del turno**: `pendiente_sena → confirmado → completado | cancelado | ausente`. Con seña nace `pendiente_sena`; sin seña, `confirmado`.
- **UI**: tokens de `src/styles/alma-tokens.css` + `alma.preset.js` — ningún valor mágico. Regla 90/8/2 (neutros/texto/verde). `Instrument Serif` itálica solo para la voz de alma (clase `.voice`); `Inter` para UI; números tabulares (`.tnum`). Íconos línea 1.8px monocromos, nada de emojis. La pantalla principal se llama "Hoy", nunca "dashboard".
- **Copys**: voseo rioplatense, frases cortas, humano. Prohibidas: "solución integral", "gestione", "usuario", "dashboard".
- **Seguridad**: Zod en toda server action / route handler; secrets solo en env; jamás loguear `notas` de pacientes; TypeScript estricto.
- **Tests obligatorios** para invariantes de negocio: RLS (`tests/rls.test.ts`), superposición de turnos (F1), idempotencia del webhook MP (F3).

## Comandos

- `npm run test` — tests (RLS necesita `SUPABASE_SERVICE_ROLE_KEY` en `.env.local`)
- `npm run seed` — datos demo (Valentina Ríos, jueves, $15.000)

## Estado de fases

- F0–F6 (Fundaciones, Agenda, Pacientes, Seña MP, WhatsApp, Caja+Hoy, Pulido): hechas y mergeadas en `main`.
- F3b MP multi-cuenta: cada profesional conecta SU cuenta de Mercado Pago por OAuth (`docs/mercado-pago.md`); tokens cifrados en `alma_mp_accounts` (solo service role); fallback por alias con confirmación manual.
- Pendientes conocidos: expiración de la seña con liberación del turno; ingreso automático en caja al completar el turno (precio − seña).
