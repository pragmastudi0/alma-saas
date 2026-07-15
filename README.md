# alma — tu consultorio, en orden

SaaS mobile-first para profesionales independientes que trabajan con turnos.
Automatiza agenda, señas por Mercado Pago, recordatorios por WhatsApp y caja simple.

**Stack:** Next.js (App Router, TypeScript estricto) · Supabase (Postgres + Auth + RLS) · Tailwind con tokens de alma · Vercel.

## Correr en local

```bash
cp .env.example .env.local   # completar las claves (ver .env.example)
npm install
npm run dev
```

## Tests

El test de F0 verifica el aislamiento multi-tenant (RLS) contra el proyecto Supabase real.
Necesita `SUPABASE_SERVICE_ROLE_KEY` en `.env.local` para crear (y borrar) los usuarios de prueba.

```bash
npm run test
```

## Seed de desarrollo

Carga una cuenta demo (`demo@alma-dev.local`) con pacientes y turnos de ejemplo:

```bash
npm run seed
```

## Estructura

- `supabase/migrations/` — esquema versionado. Todas las tablas llevan prefijo `alma_` (proyecto Supabase compartido) y RLS por `tenant_id`.
- `src/styles/alma-tokens.css` + `alma.preset.js` — sistema de identidad. Ningún valor mágico: todo color, radio, sombra y duración sale de tokens.
- `docs/google-oauth.md` — cómo activar el login con Google.
