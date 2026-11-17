-- Tabla de tickets del Escáner de Tickets.
-- Cópialo completo en Supabase → SQL Editor → New query → Run.

create table if not exists public.tickets (
  id         text primary key,
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  tienda     text not null,
  fecha      date not null,
  total      numeric(12, 2) not null default 0,
  productos  jsonb not null default '[]'::jsonb,
  imagen_url text,            -- foto del ticket en Cloudinary (puede ir vacía)
  creado_en  timestamptz not null default now()
);

-- Por si la tabla ya existía de antes sin la columna de la foto:
alter table public.tickets add column if not exists imagen_url text;

create index if not exists tickets_usuario_fecha on public.tickets (user_id, fecha desc);

-- Permiso para que la app (usuarios con sesión iniciada) pueda usar la tabla.
-- Los visitantes sin sesión (anon) NO tienen acceso.
grant select, insert, update, delete on public.tickets to authenticated;
revoke all on public.tickets from anon;

-- Seguridad: cada usuario solo puede ver, crear, cambiar y borrar SUS propios tickets.
alter table public.tickets enable row level security;

drop policy if exists "ver mis tickets" on public.tickets;
create policy "ver mis tickets" on public.tickets
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "crear mis tickets" on public.tickets;
create policy "crear mis tickets" on public.tickets
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "editar mis tickets" on public.tickets;
create policy "editar mis tickets" on public.tickets
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "borrar mis tickets" on public.tickets;
create policy "borrar mis tickets" on public.tickets
  for delete to authenticated using (user_id = auth.uid());
