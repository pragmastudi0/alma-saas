-- alma · F3b — Mercado Pago multi-cuenta (OAuth por profesional)
-- Cada tenant conecta SU cuenta de MP; los tokens viven acá cifrados
-- (AES-256-GCM en el server, clave MP_TOKEN_ENC_KEY) y jamás los lee el cliente.

-- ============================================================
-- Credenciales OAuth de Mercado Pago, 1:1 con el tenant
-- ============================================================

create table public.alma_mp_accounts (
  tenant_id uuid primary key references public.alma_tenants (id) on delete cascade,
  -- user_id del vendedor en MP: con esto el webhook resuelve la cuenta.
  collector_id bigint not null unique,
  access_token_enc text not null,
  refresh_token_enc text,
  public_key text,
  scope text,
  live_mode boolean not null default true,
  expires_at timestamptz not null,
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger alma_mp_accounts_updated_at
  before update on public.alma_mp_accounts
  for each row execute function public.alma_set_updated_at();

-- ============================================================
-- RLS: el cliente solo puede ver que SU cuenta existe (sin tokens).
-- Toda escritura y la lectura de tokens quedan para el service role.
-- ============================================================

alter table public.alma_mp_accounts enable row level security;

revoke all on public.alma_mp_accounts from anon;
revoke all on public.alma_mp_accounts from authenticated;

create policy alma_mp_accounts_select on public.alma_mp_accounts
  for select to authenticated using (tenant_id = public.alma_current_tenant_id());

-- Columnas visibles para el cliente: estado de conexión, nunca los tokens.
grant select (tenant_id, collector_id, live_mode, connected_at, expires_at)
  on public.alma_mp_accounts to authenticated;

-- ============================================================
-- Persistir el link de pago generado para poder re-mostrarlo/reenviarlo
-- ============================================================

alter table public.alma_appointments
  add column mp_preference_id text,
  add column mp_init_point text;
