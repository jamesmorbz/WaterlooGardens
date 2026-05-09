# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Waterloo Gardens Resident Portal — a lightweight web app for a single apartment block (N1 1TY, London). Full requirements are in `apartment-app-requirements-2.md`.

**Primary feature**: document library (fast, searchable, clean). The noticeboard/channels and forum are secondary.

## Stack

- **Frontend**: SvelteKit (file-based routing, `+page.server.ts` load functions for all DB queries)
- **Styling**: Plain CSS only — no frameworks. Custom properties in `:root {}`, `rem` units, `clamp()` for fluid type, media queries for responsive layout
- **Backend**: Supabase (PostgreSQL + Auth + Storage)
- **Hosting**: Vercel with SvelteKit adapter (eu-west-2 / London region for GDPR)
- **Email**: Supabase Auth emails for auth flows; Resend (`RESEND_API_KEY`) for approval notifications

## Development Commands

```bash
npm run dev          # start dev server
npm run build        # production build
npm run check        # TypeScript + Svelte type check (must pass with 0 errors, 0 warnings)
npx supabase db push # apply migrations (requires SUPABASE_ACCESS_TOKEN in .env)
```

## Supabase Access Token

Required to run CLI commands (`db push`, etc.). Get one from **supabase.com/dashboard/account/tokens** → Generate new token. Store as `SUPABASE_ACCESS_TOKEN` in `.env`. The CLI reads it automatically.

Database schema changes go in `/supabase/migrations/` as numbered SQL files — never ad-hoc in the dashboard.

## Architecture Rules

**Supabase client**: initialised once in `$lib/supabase.ts`, imported everywhere. Never instantiate multiple clients. The SSR client uses the anon key + user JWT — never the service role key.

**Data fetching**: use `+page.server.ts` `load()` functions for all Supabase queries. Client-side fetching only for real-time updates.

**Storage**: the `documents` bucket is private. Always generate signed URLs server-side (TTL 60s) immediately before serving. Never expose raw or permanent storage URLs.

**Security**: RLS policies are the security layer — not middleware, not client-side guards. Every permission must be enforced by a Postgres policy. UI still hides buttons for UX, but the DB enforces regardless.

**Pending users**: protected routes (`/documents`, `/director`, `/profile`) are guarded in `+layout.server.ts`. A pending user who navigates to one sees an "awaiting approval" screen.

**Public routes**: Home (`/`), About (`/about`), FAQ (`/faq`), and all channels/posts are publicly readable. No login required to browse.

## Svelte 5 Patterns

This project uses **Svelte 5** syntax exclusively:
- Props: `let { data, form } = $props();`
- State: `let x = $state(value);`
- Derived: `let y = $derived(expr);` or `let y = $derived.by(() => { ... });`
- Effects: `$effect(() => { ... });`
- Capture initial prop value without reactivity warning: `let x = $state(untrack(() => data.x));` (import `untrack` from `'svelte'`)
- Never use legacy `export let`, `$:`, or stores for local component state

## Database Schema

```sql
-- profiles extends auth.users
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text not null,
  flat_number text not null,
  role        text not null default 'resident' check (role in ('resident', 'director')),
  status      text not null default 'pending'  check (status in ('pending', 'approved', 'rejected')),
  user_type   text not null default 'leaseholder' check (user_type in ('leaseholder', 'tenant')),
  created_at  timestamptz default now()
);

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
  tags         text[] not null default '{}',
  storage_path text not null,
  mime_type    text,
  uploaded_by  uuid references public.profiles(id) on delete set null,
  created_at   timestamptz default now()
);
```

**RLS helpers** (use these in all policies):
```sql
create or replace function public.is_approved() returns boolean language sql security definer as $$
  select exists (select 1 from public.profiles where id = auth.uid() and status = 'approved');
$$;

create or replace function public.is_director() returns boolean language sql security definer as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'director' and status = 'approved');
$$;
```

**`profiles` has no `email` column** — email lives in `auth.users` only. Never try to select or insert `email` into `profiles`.

## Key Constraints

- **Document uploads**: PDF only (validated both client and server). Max 20 MB. Directors upload via the in-app Director Panel (`/director?tab=upload`), not the Supabase dashboard.
- **No role promotion UI** — directors are set manually in the Supabase dashboard (`role = 'director'`). No in-app way to promote a user.
- **Roles**: `resident` (default) and `director` (building directors / RTM board members). No separate admin concept.
- **User types**: `leaseholder` (owns the lease) or `tenant` (rents from leaseholder). Set at registration; displayed as a badge on profile and director panels.
- **Channels**: three fixed channels seeded in DB (`announcements`, `general`, `maintenance`). `post_role = 'director'` channels show as noticeboard (newest-first, card style). `post_role = 'resident'` channels show as instant-messenger (chronological, grouped messages). No channel management UI.
- **Forum (channels)**: publicly readable without login. Posting requires `status = 'approved'`.
- **Components**: keep under ~80 lines. Split if larger. E.g. `DocumentCard.svelte`, `PostItem.svelte`, `ChatMessage.svelte`.
- **Supabase calls**: always destructure `{ data, error }` and surface errors with an inline message — never silent failures.
- **PDF preview**: `<iframe>` with signed URL in `DocumentCard`. Signed URLs have 60s TTL — generate immediately before serving.
- **Flat number**: displayed on posts ("Sarah Ahmed – Flat 12"). Read-only for residents; changeable by directors via Supabase dashboard only.
- **Email privacy**: email addresses never exposed to other residents. Directors see them only via the Supabase dashboard.

## Site Structure

| Route | Public | Notes |
|-------|--------|-------|
| `/` | ✓ | Home — hero photo, latest announcements, quick links |
| `/about` | ✓ | Explains leaseholders, freeholders, RTM board, directors |
| `/faq` | ✓ | FAQ + contact info, credits AI |
| `/login` | ✓ | Auth |
| `/register` | ✓ | Auth — collects full_name, flat_number, user_type, email, password |
| `/pending` | ✓ | Shown to logged-in users awaiting approval |
| `/channels/[slug]` | ✓ | Forum / noticeboard (read-only without login) |
| `/documents` | auth | Document library — search, category tabs, tag filters, custom sort dropdown |
| `/profile` | auth | Update name; shows user_type and role badges |
| `/director` | director | Tabs: Pending approvals, Post Announcement, Upload Document, Residents list |

## Director Panel (`/director`)

Four tabs managed with client-side state + `history.replaceState`:
- **Pending**: table of `status='pending'` profiles; approve or reject with optional note
- **Post Announcement**: posts to the `announcements` channel with optional title and pin
- **Upload Document**: PDF upload (validated), with display name, description, category (datalist), tags
- **Residents**: full list of all profiles with type, role, and status badges

Announcements are posted via the Director Panel only — the `/channels/announcements` view is read-only (no compose form).

## Documents Page (`/documents`)

- Smart multi-word search: splits query on whitespace, every word must match somewhere in `filename + description + category + tags`
- Category tabs: derived from distinct categories in DB
- Tag filter pills: all unique tags across all documents; multiple tags can be active simultaneously (AND logic)
- Custom sort dropdown (not native `<select>`): "Most recent" or "Name A–Z"; click-outside closes via `$effect` + `removeEventListener`
- `DocumentCard.svelte`: shows category badge, date, filename, description, tag pills, preview/download buttons

## Static Assets

Building photos live in `static/images/`:
- `outside.jpg` — street facade, used as home page hero background
- `Courtyard.jpeg` — internal courtyard, used on the About page
- `Balcony.jpeg` — balcony view, available for future use
