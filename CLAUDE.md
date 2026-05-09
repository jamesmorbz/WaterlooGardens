# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Waterloo Gardens Resident Portal — a lightweight web app for a single apartment block (N1 1TY, London). Full requirements are in `REQUIREMENTS.md`.

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

**Pending users**: protected routes (`/documents`, `/director`, `/profile`) are guarded in `+layout.server.ts`. A pending user who navigates to one is redirected to `/pending`. Pending users can still browse all public content (channels, posts, announcements) but cannot post. A warning banner is shown sitewide for pending users (suppressed on `/pending`, `/about`, `/faq`).

**Public routes**: Home (`/`), About (`/about`), FAQ (`/faq`), and all channels/posts are publicly readable. No login required to browse.

**SSR safety**: never use browser-only APIs (`location`, `window`, `document`) in code that runs during SSR. Use `page.url.searchParams` from `$app/state` instead of `new URLSearchParams(location.search)`.

## Svelte 5 Patterns

This project uses **Svelte 5** syntax exclusively:
- Props: `let { data, form } = $props();`
- State: `let x = $state(value);`
- Derived: `let y = $derived(expr);` or `let y = $derived.by(() => { ... });`
- Effects: `$effect(() => { ... });`
- Capture initial prop value without reactivity warning: `let x = $state(untrack(() => data.x));` (import `untrack` from `'svelte'`)
- Page URL (SSR-safe): `import { page } from '$app/state';` then `page.url.searchParams.get('key')`
- Never use legacy `export let`, `$:`, or stores for local component state

## Database Schema

```sql
-- profiles extends auth.users (NO email column — email lives in auth.users only)
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

**Critical**: `profiles` has **no `email` column** — email lives in `auth.users` only. Never select or insert `email` into `profiles`. The registration action deliberately omits email from the profile insert; adding it back will cause NOT NULL violations and silently prevent profile rows from being created.

## RLS Policy Summary

Supabase uses OR logic across policies for the same role. The `anon` and `authenticated` roles have separate policy sets.

| Table | anon | authenticated (any status) | authenticated (approved) | director |
|-------|------|---------------------------|--------------------------|----------|
| profiles | read all | read all, insert own, update own | — | update any |
| channels | read all | read all | — | — |
| posts | read all | read all | insert (resident channels) | insert any, update (pin), delete any |
| comments | read all | read all | insert, delete own | delete any |
| documents | — | — | read | insert, delete |
| storage.objects (documents bucket) | — | — | read | insert (upload) |

**Key insight**: anon and authenticated have identical read access to channels/posts/comments/profiles. This is intentional so pending users aren't 404'd on public content. Write access is gated by `is_approved()` or `is_director()`.

## Key Constraints

- **Document uploads**: PDF only (validated both client and server). Max 20 MB. Directors upload via the in-app Director Panel (`/director?tab=upload`), not the Supabase dashboard.
- **No role promotion UI** — directors are set manually in the Supabase dashboard (`role = 'director'`). No in-app way to promote a user.
- **Roles**: `resident` (default) and `director` (building directors / RTM board members). No separate admin concept.
- **User types**: `leaseholder` (owns the lease) or `tenant` (rents from landlord). Set at registration; displayed as a badge on profile and director panels.
- **Channels**: three fixed channels seeded in DB (`announcements`, `general`, `maintenance`). `post_role = 'director'` channels (announcements) show as noticeboard — newest-first, card style, read-only for all users. `post_role = 'resident'` channels show as instant-messenger — chronological, grouped messages. No channel management UI.
- **Announcements**: posted via Director Panel only — the `/channels/announcements` view has no compose form.
- **Components**: keep under ~80 lines. Split if larger. E.g. `DocumentCard.svelte`, `PostItem.svelte`, `ChatMessage.svelte`.
- **Supabase calls**: always destructure `{ data, error }` and surface errors with an inline message — never silent failures.
- **PDF preview**: `<iframe>` with signed URL in `DocumentCard`. Signed URLs have 60s TTL — generate immediately before serving.
- **Flat number format**: validated server-side with `/^[A-Za-z]?\d+$/` and client-side with `pattern="[A-Za-z]?\d+"`. Accepts: `1`, `12`, `123`, `B1`, `B11`. Read-only for residents; changeable by directors via Supabase dashboard only.
- **Email privacy**: email addresses never exposed to other residents. Directors see them only via the Supabase dashboard.
- **Static image filenames are case-sensitive on Vercel (Linux)** — always match the exact case of the file in `static/images/`. CSS `background-image` URLs must match exactly.

## Registration Flow

1. User submits `/register` with `full_name`, `flat_number` (validated regex), `user_type`, `email`, `password`
2. `auth.signUp()` creates row in `auth.users`
3. Profile row inserted into `public.profiles` (no email field)
4. Redirect to `/pending`
5. If already logged in, `/register` load function redirects: pending → `/pending`, approved → `/`
6. Directors approve/reject via Director Panel → Resend email sent to user

## Auth / Session Flow

- Layout `load()` in `+layout.server.ts` runs on every request, fetches profile, returns `{ session, profile }`
- Protected paths (`/documents`, `/director`, `/profile`): redirect to `/login` if no session, redirect to `/pending` if pending
- Rejected users are signed out automatically and redirected to `/login?rejected=1`
- Logout: POST to `/logout` signs out via Supabase; GET `/logout` redirects to `/` (handles stale links)
- Register/login buttons hidden in nav and home hero when `data.session` is truthy

## Pending User Banner

A sitewide amber banner (`<div class="pending-banner">`) is shown for pending users in `+layout.svelte`. It is suppressed on `/pending`, `/about`, and `/faq`. The condition:

```svelte
{#if data.profile?.status === 'pending' && !['/pending', '/about', '/faq'].includes(page.url.pathname)}
```

## Site Structure

| Route | Public | Notes |
|-------|--------|-------|
| `/` | ✓ | Home — hero photo (`outside.jpg`), latest announcements, quick links. Register button hidden when logged in. |
| `/about` | ✓ | Explains leaseholders, freeholders, RTM board, directors. Uses `Courtyard.jpeg`. |
| `/faq` | ✓ | FAQ + contact info (director emails), credits AI. |
| `/login` | ✓ | Auth |
| `/register` | ✓ | Auth — collects `full_name`, `flat_number`, `user_type`, `email`, `password`. Redirects if already logged in. |
| `/pending` | ✓ | Shown to logged-in users awaiting approval. Sign-out button (not a "back to sign in" link). |
| `/logout` | ✓ | POST: signs out. GET: redirects to `/`. |
| `/channels/[slug]` | ✓ | Forum / noticeboard (read-only without login; post requires approved status). |
| `/documents` | auth | Document library — search, category tabs, tag filters, custom sort dropdown. |
| `/profile` | auth | Update name; shows flat number, user_type badge, director badge. Flat number is disabled (read-only). |
| `/director` | director | Five tabs: Pending, Post Announcement, Upload Document, Documents, Residents. |

## Director Panel (`/director`)

Five tabs managed with client-side `$state` + `history.replaceState`. Tab persisted in URL param `?tab=`:

| Tab key | Label | Purpose |
|---------|-------|---------|
| `pending` | Pending | Table of `status='pending'` profiles; approve or reject |
| `announce` | Post Announcement | Posts to announcements channel; optional title + pin toggle |
| `upload` | Upload Document | PDF upload with display name, description, category (datalist), tags (comma-separated) |
| `docs` | Documents | Searchable table of all documents with delete buttons |
| `residents` | Residents | Full resident list, searchable by name/flat/type; shows type, role, status badges |

Success banners after upload/post are read from `page.url.searchParams.get('uploaded')` / `page.url.searchParams.get('posted')` — NOT `location.search` (SSR-unsafe).

The `deleteDocument` action removes the file from Storage then deletes the DB row. If storage removal fails, the DB row is still deleted (orphan is preferable to broken reference).

## Documents Page (`/documents`)

- Smart multi-word search: splits query on whitespace, every word must match somewhere in `filename + description + category + tags` (joined as a single string)
- Category tabs: derived from distinct categories in the loaded documents
- Tag filter pills: all unique tags across all documents; multiple tags active simultaneously (AND logic); `activeTags = $state(new Set<string>())`; always create a new Set in `toggleTag()` to trigger reactivity
- Custom sort dropdown (not native `<select>`): "Most recent" or "Name A–Z"; click-outside closes via `$effect` + `removeEventListener` with `bind:this` ref
- `DocumentCard.svelte`: category badge, date, filename, description, tag pills, preview (`<iframe>` with signed URL) and download buttons

## Static Assets

Building photos live in `static/images/` — **filenames are case-sensitive on Vercel**:
- `outside.jpg` — street facade, used as home page hero CSS `background-image`
- `Courtyard.jpeg` — internal courtyard, used on the About page as `<img>`
- `Balcony.jpeg` — balcony view, available for future use
