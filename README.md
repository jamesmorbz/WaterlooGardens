# Waterloo Gardens Resident Portal

A private web portal for residents of Waterloo Gardens, N1 1TY, London. Built and maintained by residents.

**Features**: announcements, residents' forum, and a searchable document library (service charge accounts, meeting minutes, insurance, and more).

---

## Stack

- **SvelteKit** (Svelte 5 runes) — frontend and server-side rendering
- **Supabase** — PostgreSQL database, authentication, and file storage
- **Vercel** — hosting (eu-west-2 / London region for GDPR)
- **Resend** — transactional email for account approval notifications
- Plain CSS — no UI framework

---

## Getting Started

### Prerequisites

- Node.js 18+
- A Supabase project (eu-west-2 region)
- A Vercel account (for deployment)
- A Resend account (for email notifications)

### Local Development

```bash
npm install
npm run dev
```

### Environment Variables

Create a `.env` file (see `.env.example`):

```
PUBLIC_SUPABASE_URL=https://your-project.supabase.co
PUBLIC_SUPABASE_ANON_KEY=your-anon-key
RESEND_API_KEY=re_your_key
SUPABASE_ACCESS_TOKEN=your-token   # only needed for CLI commands
```

### Database Setup

Migrations are in `/supabase/migrations/`. Apply them with:

```bash
npx supabase db push
```

### Type Checking

```bash
npm run check   # must pass with 0 errors, 0 warnings before deploying
```

---

## Deployment

Deployed automatically to Vercel on push to `main`. The SvelteKit Vercel adapter is pre-configured.

---

## Access

The portal is private to residents of the building. New accounts are reviewed and approved by a director before access is granted.

- **Public**: home, announcements, forum, about, FAQ
- **Approved residents**: document library, profile, posting in the forum
- **Directors**: director panel (post announcements, upload/delete documents, manage residents)

---

## Documentation

- `CLAUDE.md` — developer and AI assistant guide (architecture, patterns, constraints)
- `REQUIREMENTS.md` — product requirements reflecting what is actually built
