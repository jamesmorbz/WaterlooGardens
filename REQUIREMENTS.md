# Waterloo Gardens Resident Portal — Product Requirements

**Building**: Waterloo Gardens, N1 1TY, London  
**Status**: v1 built and deployed

> This document reflects what has actually been built. Where the original PRD differs from the implementation, the implementation takes precedence. See `CLAUDE.md` for developer/AI guidance.

---

## 1. Project Overview

A lightweight web-based resident portal for Waterloo Gardens (N1 1TY). It serves **residents** (leaseholders and tenants) and **directors** (the RTM board members who manage the building).

**Primary feature**: document library — browse, search, preview, and download building documents. A noticeboard with three fixed channels provides community communication.

Keep the application as simple as possible to build, run, and maintain. Prefer deleting code over adding it. Every dependency must earn its place. Fully responsive on mobile and desktop.

---

## 2. User Roles & Permissions

### 2.1 Roles

| Role | Description |
|---|---|
| **Resident** | Approved leaseholder or tenant. Can read all channels, post in General and Maintenance, browse/download/preview documents. |
| **Director** | RTM board member. All resident permissions plus: post in Announcements, upload and delete documents via the Director Panel, approve/reject registrations, delete any post. |

There is no separate "admin" concept — directors are the admins. Director role is set manually in the Supabase dashboard (`role = 'director'`). No in-app promotion UI.

### 2.2 User Types

Residents register as either **leaseholder** (owns the lease) or **tenant** (rents from their landlord). This is set at registration and displayed as a badge on profiles and in the director panel. It is informational only and does not affect permissions.

### 2.3 Registration

- Users self-register with: **full name**, **flat number**, **user type** (leaseholder/tenant), **email**, **password**.
- Flat number format: a number optionally prefixed by a single letter — e.g. `1`, `12`, `B1`, `B11`. Validated server-side with `/^[A-Za-z]?\d+$/`.
- New accounts are `pending` until a Director approves them. This is the sole anti-spam mechanism — no CAPTCHAs.
- After registration, show a clear "awaiting approval" screen (`/pending`).
- Email the resident on approval (or rejection) via Resend.
- Pending users who visit any page see a sitewide amber banner (suppressed on `/about` and `/faq`).

### 2.4 Authentication

- Supabase Auth — email + password only. "Forgot password" via Supabase's built-in flow.
- Minimum password: 8 characters.
- No OAuth in v1.
- Rejected users are automatically signed out and redirected to `/login?rejected=1`.

---

## 3. Features

### 3.1 Channels (Noticeboard / Forum)

Three fixed channels, seeded in the database. No channel management UI.

| Channel | Purpose | Who can post | Display style |
|---|---|---|---|
| **Announcements** | Official notices from the directors | Directors only | Noticeboard: newest-first, card style, read-only |
| **General** | Day-to-day conversation | All approved residents | Chat: chronological, grouped by author |
| **Maintenance** | Report issues | All approved residents | Chat: chronological, grouped by author |

- All channels are **publicly readable** — no login required to browse.
- Posting requires an approved account.
- Each post has: optional title, body (plain text), author name + flat number, timestamp.
- Directors can pin posts (pinned float to top) and delete any post.
- Residents can comment on posts (one level, no nested replies). Authors can delete own comments.
- Announcements are posted via the Director Panel only — the `/channels/announcements` view has no compose form.

### 3.2 Document Library *(primary feature)*

Fast, clean, easy to navigate. All documents visible to any approved resident.

**Search & Filter**
- Smart multi-word search: every word in the query must appear somewhere in filename, description, category, or tags.
- Category tabs: derived from the distinct categories present in the database.
- Tag filter pills: all unique tags across all documents, multiple active simultaneously (AND logic).
- Sort: "Most recent" or "Name A–Z" via a custom dropdown (not a native `<select>`).

**Document Card** (`DocumentCard.svelte`)
Each document shows: filename, category badge, upload date, description, tag pills, Preview and Download buttons.

**Preview**: `<iframe>` with a Supabase signed URL (TTL 60s). Generated server-side immediately before serving. On viewports < 600px, preview is hidden; Download only.

**Download**: short-lived signed URL from Supabase Storage. Never permanent public URLs.

**Document Upload (Directors)**
Directors upload via the **Director Panel** (`/director?tab=upload`) — PDF only, max 20 MB. The file is uploaded to Supabase Storage and a metadata row inserted into `documents` atomically. If the DB insert fails, the storage file is removed.

**Document Management (Directors)**
Directors can search and delete documents from the **Director Panel** (`/director?tab=docs`). Deletion removes both the storage file and the DB row.

### 3.3 User Profile

- Residents can update display name, email, and password.
- Flat number is displayed but read-only for residents (directors change it via Supabase dashboard only).
- Profile page shows user_type badge and director badge (if applicable).

### 3.4 Director Panel (`/director`)

Five tabs, accessed via URL param `?tab=`:

| Tab | Key | Purpose |
|---|---|---|
| Pending | `pending` | List of pending registrations; Approve or Reject each |
| Post Announcement | `announce` | Post to the Announcements channel with optional title and pin |
| Upload Document | `upload` | Upload a PDF with display name, description, category, tags |
| Documents | `docs` | Searchable list of all documents with delete buttons |
| Residents | `residents` | Full resident list, searchable by name/flat/type; shows badges |

---

## 4. Technical Stack

| Layer | Choice |
|---|---|
| Frontend | SvelteKit (Svelte 5 runes syntax) |
| Styling | Plain CSS — custom properties, `rem`, `clamp()`, media queries |
| Backend | Supabase (PostgreSQL + Auth + Storage) |
| Hosting | Vercel (SvelteKit Vercel adapter, eu-west-2 / London region) |
| Email | Supabase Auth emails (auth flows) + Resend (approval notifications) |

---

## 5. Database Schema

```sql
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text not null,
  flat_number text not null,
  role        text not null default 'resident' check (role in ('resident', 'director')),
  status      text not null default 'pending'  check (status in ('pending', 'approved', 'rejected')),
  user_type   text not null default 'leaseholder' check (user_type in ('leaseholder', 'tenant')),
  created_at  timestamptz default now()
  -- NOTE: no email column; email lives in auth.users only
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

**Channel seed data**:
```sql
insert into public.channels (name, slug, description, post_role) values
  ('Announcements', 'announcements', 'Official notices from the directors', 'director'),
  ('General',       'general',       'Day-to-day conversation',              'resident'),
  ('Maintenance',   'maintenance',   'Report issues and maintenance requests','resident');
```

---

## 6. Security

RLS is the security layer — not middleware, not client-side guards. Every permission is enforced by a Postgres policy. UI hides controls for UX, but the DB enforces access regardless.

Key helper functions:
```sql
create or replace function public.is_approved() returns boolean language sql security definer as $$
  select exists (select 1 from public.profiles where id = auth.uid() and status = 'approved');
$$;

create or replace function public.is_director() returns boolean language sql security definer as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'director' and status = 'approved');
$$;
```

Supabase Storage bucket `documents` is **private**. All file access goes through server-side signed URLs (TTL 60s).

---

## 7. Non-Functional Requirements

- **GDPR / UK data residency**: Supabase eu-west-2 (London) region. Vercel London edge.
- **Privacy**: email addresses never exposed to other residents. Directors see emails only via the Supabase dashboard.
- **Performance**: document list server-side rendered via SvelteKit `load()` — no client-side waterfall.
- **Accessibility**: semantic HTML, keyboard navigation, WCAG 2.1 AA contrast.
- **Cost target**: free tiers of Supabase and Vercel are sufficient for a single apartment block indefinitely.
- No analytics, no ads, no tracking pixels.

---

## 8. Out of Scope (v1)

- Push or email notifications for new posts
- In-app messaging between residents
- Maintenance ticket tracking
- Payments or service charges
- Native mobile apps
- OAuth / social login
- Resident file uploads
- Multiple buildings
