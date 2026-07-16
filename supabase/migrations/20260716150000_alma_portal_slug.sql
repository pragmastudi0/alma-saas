-- alma · Portal público del paciente: slug único por tenant para /t/[slug].
-- Solo objetos con prefijo alma_. Sin triggers sobre auth.users.

alter table public.alma_tenants
  add column slug text
  constraint alma_tenants_slug_formato
    check (slug is null or slug ~ '^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$');

comment on column public.alma_tenants.slug is
  'Identificador público del link de reservas (/t/[slug]). Kebab-case, 3-40 chars. Null = portal desactivado.';

-- Unicidad global (los null no chocan entre sí).
create unique index alma_tenants_slug_key on public.alma_tenants (slug);

-- El grant de update de F0 es por columnas: la columna nueva necesita el suyo.
grant update (slug) on public.alma_tenants to authenticated;
