# Waterloo Gardens Resident Portal — Product Requirements Document

**Building**: Waterloo Gardens, N1 1TY, London  
**Version**: 1.1  
**Audience**: AI assistants and developers building this application

---

## 1. Project Overview

A lightweight web-based resident portal for Waterloo Gardens (N1 1TY). It serves **residents** (tenants and owners) and **directors** (the managing leaseholders who run the building). The primary feature is a **document library** — browse, search, preview, and download building documents. A simple noticeboard with three fixed channels provides community communication.

The application should be **as simple as possible to build, run, and maintain**. Prefer deleting code over adding it. Every dependency must earn its place.

The app must be fully responsive on mobile and desktop.

---

## 2. User Roles & Permissions

### 2.1 Roles

| Role | Description |
|---|---|
| **Resident** | Verified tenant or owner. Can read all channels, post in General and Maintenance, and browse/download/preview documents. |
| **Director** | Building director. All resident permissions plus: post in Announcements, upload documents (via Supabase dashboard — no UI needed), approve/reject new registrations, and delete posts. |

> Directors manage the building. There is no separate "admin" concept — directors are the admins.

### 2.2 Registration

- Users self-register with: **full name**, **email**, **password**, and **flat number**.
- New accounts are **pending** until a Director approves them. This is the sole anti-spam mechanism — no CAPTCHAs needed.
- Flat number is public-facing and displayed on every post (e.g. "Sarah Ahmed – Flat 12").
- After registration, show a clear "Your account is awaiting approval by a director" screen.
- Email the resident on approval (or rejection with a brief reason).

### 2.3 Authentication

- Supabase Auth — email + password only. "Forgot password" reset via Supabase's built-in flow.
- No OAuth in v1; architecture must not prevent adding it later.
- Minimum password: 8 characters.

---

## 3. Features

### 3.1 Channels (Noticeboard)

Three fixed channels. No channel management UI required — they are seeded in the database at setup.

| Channel | Purpose | Who can post |
|---|---|---|
| **Announcements** | Official notices from the directors | Directors only |
| **General** | Day-to-day conversation | All residents |
| **Maintenance** | Report issues; primarily for the caretaker | All residents |

- Each post has: title (optional), body (plain text or simple Markdown), author name + flat number, and timestamp.
- Directors can **pin** a post (pinned posts float to the top) and **delete** any post.
- Residents can **comment** on posts (one level deep — no nested replies).
- Unread indicator (bold channel name) per channel.

### 3.2 Document Library *(primary feature)*

This is the most important part of the application. It should be fast, clean, and easy to navigate.

**Browsing & Search**
- All documents are visible to any approved resident.
- Documents are organised into **categories**. Suggested starting categories:
  - Moving In
  - Selling Your Property
  - Building Information
  - Legal & Compliance
  - Fire Safety
  - Service Charges & Accounts
- Full-text search across filename and description (Supabase `ilike` or `fts` is sufficient — no external search service needed).
- Filter by category (tab strip or dropdown).
- Sort by: most recent, name A–Z.

**Document Card**
Each document shows: filename, category badge, one-sentence description, upload date, and two action buttons — **Preview** and **Download**.

**Preview**
- PDFs: render in-browser using `<iframe>` with a Supabase signed URL, or PDF.js if iframe is insufficient. Always fall back to the Download button.
- On viewports < 600px wide, skip the preview and show Download only.
- Non-PDF files (Word, Excel): Download only.

**Download**
- Always generate a short-lived signed URL from Supabase Storage (never expose permanent public URLs).
- Signed URL TTL: 60 seconds is sufficient for a download trigger.

**Document Upload (Directors)**
- Directors upload files **directly via the Supabase dashboard or CLI** — there is no upload UI in the application.
- After uploading a file to Supabase Storage, the director inserts a metadata row into the `documents` table (also via the Supabase dashboard, or a simple admin-only form if preferred later).
- The application only needs to **read** documents, never write them.

### 3.3 User Profile

- Residents can update display name, email, and password.
- Flat number is read-only for residents (Directors can change it via Supabase dashboard).

### 3.4 Director Tools (lightweight)

Accessible via a simple `/director` route, visible only to users with the `director` role:

- List of pending registrations → Approve / Reject (with optional note).
- List of all users (name, flat, role, status).
- Delete any post or comment.
- Pin / unpin posts.

No channel management UI, no document upload UI — these are handled directly in Supabase.

---

## 4. Technical Stack

**Principle**: use Supabase for everything possible. Minimise the number of services, build steps, and lines of code.

| Layer | Choice | Rationale |
|---|---|---|
| Frontend | **SvelteKit** | Minimal boilerplate, tiny bundle, no virtual DOM overhead, excellent for a small content-heavy app |
| Styling | **Plain CSS** with CSS custom properties | No build step for styles, no framework to update, no purge configuration. Use a minimal reset (e.g. `modern-normalize`). Responsive via media queries. |
| Backend | **Supabase** (database, auth, storage, edge functions) | Single platform handles everything — no separate API server |
| Database | **PostgreSQL via Supabase** | Row Level Security (RLS) enforces permissions at the data layer |
| Auth | **Supabase Auth** | Built-in email/password, session management, email templates |
| File storage | **Supabase Storage** | Co-located with DB, signed URLs, free tier generous |
| Email | **Supabase Auth emails** for auth flows; **Resend** (free tier) for approval notifications | Minimal setup |
| Hosting | **Vercel** (SvelteKit adapter) or **Cloudflare Pages** | Free tier, edge CDN, zero config |

> **Why SvelteKit over Next.js?** For an app of this size, SvelteKit produces significantly less code, has no React overhead, and its file-based routing and server-side load functions map cleanly onto Supabase queries. It is easier to hand to a developer (or AI) and have them understand the whole codebase at once.

> **Why plain CSS?** Tailwind is excellent but adds a build dependency and requires learning utility classes. For a simple, long-lived app maintained infrequently, plain CSS with a handful of custom properties is more durable and easier to modify without context.

---

## 5. Database Schema

Use **UUIDs** for all primary keys. Enable **Row Level Security on every table**.

```sql
-- Extends Supabase auth.users
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text not null,
  flat_number text not null,
  role        text not null default 'resident' check (role in ('resident', 'director')),
  status      text not null default 'pending'  check (status in ('pending', 'approved', 'rejected')),
  created_at  timestamptz default now()
);

-- Fixed channels — seeded, not managed via UI
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
  storage_path text not null,  -- path within Supabase Storage bucket
  mime_type    text,
  uploaded_by  uuid references public.profiles(id) on delete set null,
  created_at   timestamptz default now()
);
```

**Channel seed data**:
```sql
insert into public.channels (name, slug, description, post_role) values
  ('Announcements', 'announcements', 'Official notices from the directors', 'director'),
  ('General',       'general',       'Day-to-day conversation',              'resident'),
  ('Maintenance',   'maintenance',   'Report issues and maintenance requests','resident');
```

---

## 6. Row Level Security (RLS) Policies

These must be implemented carefully — they are the security layer.

```sql
-- Key helper functions
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
```

> AI assistants: write all RLS policies using these helper functions. Every table needs `enable row level security`. Test that a `pending` user cannot read documents or posts even if they know the route.

---

## 7. Supabase Storage

- Bucket name: `documents`
- Bucket visibility: **private** (never public)
- All file reads go through a signed URL generated server-side (SvelteKit load function), TTL 60s
- Folder structure suggestion: `/{category-slug}/{filename}` — makes it easy to navigate in the dashboard
- Directors upload via the Supabase dashboard Storage UI, then insert a row into `documents` via the Table Editor

---

## 8. Non-Functional Requirements

- **GDPR / UK data residency**: use Supabase **eu-west-2 (London)** region. Vercel with London edge preferred.
- **Privacy**: email addresses are never exposed to other residents. Only Directors can see emails (via Supabase dashboard).
- **Performance**: the document list should load in < 1s. Use SvelteKit's `load()` to server-side render the list — no client-side waterfall.
- **Accessibility**: semantic HTML, keyboard navigation, WCAG 2.1 AA contrast.
- **Cost target**: free tiers of Supabase (500MB DB, 1GB storage, 50MB/day egress) and Vercel (100GB bandwidth) should be sufficient for a single apartment block indefinitely.
- **No analytics, no ads, no tracking pixels.**

---

## 9. Out of Scope (v1)

- Push or email notifications for new posts
- In-app messaging between residents
- Maintenance ticket tracking
- Payments or service charges
- Native mobile apps
- OAuth / social login
- Resident file uploads
- Multiple buildings

---

## 10. Prompting Notes for AI Assistants

- **The document library is the primary feature.** When in doubt, prioritise making it fast, searchable, and clean over the channels/noticeboard.
- **SvelteKit + Supabase JS client** is the intended pattern. Use `+page.server.ts` load functions for all Supabase queries — do not fetch from the client unless necessary (e.g. real-time updates).
- **Never expose raw storage URLs.** Always generate a signed URL server-side immediately before serving it to the client.
- **RLS is the security layer** — not middleware, not client-side checks. Every permission must be enforced by a Postgres RLS policy. Server-side code should still check roles for UX (hiding buttons), but the DB must enforce it regardless.
- **Pending users must be fully locked out.** A pending user who navigates to `/documents` must get a "awaiting approval" screen, not a data fetch error.
- **Plain CSS**: style with CSS custom properties defined in a root `:root {}` block. Use `rem` units, `clamp()` for fluid type, and a simple two-column grid (sidebar + main) that collapses to single-column below 768px. No CSS framework.
- **Keep components small.** A `DocumentCard.svelte`, `PostItem.svelte`, `ChannelList.svelte` — each under ~80 lines. If a component grows larger, split it.
- **Supabase client**: initialise once in `$lib/supabase.ts` and import everywhere. Do not instantiate multiple clients.
- **Error handling**: all Supabase calls should destructure `{ data, error }` and surface errors gracefully — a toast or inline message, never a silent failure or unhandled promise rejection.
- **Database schema changes** should always be done via a numbered migration file in `/supabase/migrations/`, not ad-hoc in the dashboard.
- **Roles are set manually by a Director** in the Supabase dashboard (profiles table). There is no UI to promote a user to director. This is intentional.
