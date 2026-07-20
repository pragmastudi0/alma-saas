# alma — tu consultorio, en orden

SaaS mobile-first para profesionales independientes que trabajan con turnos.
Automatiza agenda, señas por Mercado Pago, recordatorios por WhatsApp, caja simple
y configuración de servicios y empleados.

**Stack:** Next.js (App Router, TypeScript estricto) · Supabase (Postgres + Auth + RLS) · Tailwind con tokens de alma · Vercel.

## Correr en local

```bash
cp .env.example .env.local   # completar las claves (ver .env.example)
npm install
npm run dev
```

## Tests

Los tests contra la DB verifican el aislamiento multi-tenant (RLS), superposición de
turnos e idempotencia del webhook de MP contra el proyecto Supabase real.
Necesitan `SUPABASE_SERVICE_ROLE_KEY` en `.env.local`.

```bash
npm run test
```

## Seed de desarrollo

Carga una cuenta demo (`demo@alma-dev.local`) con pacientes, servicios, empleados y turnos de ejemplo:

```bash
npm run seed
```

## Estructura

- `supabase/migrations/` — esquema versionado. Todas las tablas llevan prefijo `alma_` (proyecto Supabase compartido) y RLS por `tenant_id`.
- `src/styles/alma-tokens.css` + `alma.preset.js` — sistema de identidad. Ningún valor mágico: todo color, radio, sombra y duración sale de tokens.
- `docs/google-oauth.md` — cómo activar el login con Google.

## Funcionalidades principales

- **Agenda** — vista de día y mes, con solapamiento controlado por trigger en DB.
- **Servicios** — catálogo de servicios con precio, seña y duración configurables desde Ajustes.
- **Empleados** — múltiples profesionales por espacio, asignables a cada turno.
- **Señas por Mercado Pago** — conexión OAuth multi-cuenta; el dinero entra directo al profesional.
- **Portal público** — los pacientes reservan online y pagan la seña; con selector de servicio si hay varios.
- **WhatsApp** — mensajes semi-automáticos vía `wa.me` para confirmar, recordar o avisar.
- **Caja** — registro de ingresos y gastos, con asiento automático al cobrar seña o completar turno.
- **Pacientes** — ficha con datos de contacto, historial y archivado.
