-- Profiles (extends auth.users)
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null,
  full_name   text not null,
  flat_number text not null,
  role        text not null default 'resident' check (role in ('resident', 'director')),
  status      text not null default 'pending'  check (status in ('pending', 'approved', 'rejected')),
  created_at  timestamptz default now()
);

-- Fixed channels (seeded below, no management UI)
create table public.channels (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text not null unique,
  description text,
  post_role   text not null default 'resident' check (post_role in ('resident', 'director'))
);

create table public.posts (
  id          uuid primary key default gen_random_uuid(),
  channel_id  uuid references public.channels(id) on delete cascade,
  author_id   uuid references public.profiles(id) on delete set null,
  title       text,
  body        text not null,
  is_pinned   boolean default false,
  created_at  timestamptz default now()
);

create table public.comments (
  id          uuid primary key default gen_random_uuid(),
  post_id     uuid references public.posts(id) on delete cascade,
  author_id   uuid references public.profiles(id) on delete set null,
  body        text not null,
  created_at  timestamptz default now()
);

create table public.documents (
  id           uuid primary key default gen_random_uuid(),
  filename     text not null,
  description  text,
  category     text not null,
  storage_path text not null,
  mime_type    text,
  uploaded_by  uuid references public.profiles(id) on delete set null,
  created_at   timestamptz default now()
);

-- Helper functions used by RLS policies (defined after tables)
create or replace function public.is_approved()
returns boolean language sql security definer as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and status = 'approved'
  );
$$;

create or replace function public.is_director()
returns boolean language sql security definer as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'director' and status = 'approved'
  );
$$;

-- Seed channels
insert into public.channels (name, slug, description, post_role) values
  ('Announcements', 'announcements', 'Official notices from the directors', 'director'),
  ('General',       'general',       'Day-to-day conversation',              'resident'),
  ('Maintenance',   'maintenance',   'Report issues and maintenance requests','resident');
