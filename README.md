# TourAligner

TourAligner is a Next.js + Supabase app for connecting independent artists with venues.

The current product has four main surfaces:

- Public marketing and discovery pages
- Auth and onboarding
- An authenticated dashboard for artists, venues, and inbox activity
- An admin backoffice for venue claims and moderation

## Stack

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS 4
- Supabase Auth, Postgres, Storage, Realtime, and SQL RPCs

## Core Product Model

### Public

- `/` marketing homepage
- `/venues` public venue directory
- `/venues/[slug]` public venue detail page
- `/bands/[slug]` public artist profile page

### Authenticated user flows

- Sign up / sign in
- Onboarding for artist or venue intent
- Create and manage artist profiles
- Submit venue claims
- Send contact requests
- Manage inbox conversations

### Admin flows

- Review pending venue claims
- Search users, bands, venues, and inquiries
- Suspend users
- Unlist venues
- Deactivate bands

## Domain Concepts

### `profiles`

One row per auth user. Stores account-level data like name, email, role, notification preferences, suspension, and admin status.

### `bands`

Artist profiles owned by a user. Bands can have genres, photos, metadata, and public profile pages.

### `venues`

Public venue directory entries. A venue can exist before it is approved or claimed.

### `venue_claims`

Tracks who is requesting control of a venue. Claims now default to `pending` and require admin approval before `claimed_by_user_id` is assigned on the venue.

### `contact_threads` and `contact_messages`

The current messaging layer. This is the primary conversation workflow between a band and a venue.

### `booking_inquiries`

A legacy-but-still-relevant structured booking table. The app is currently messaging-first, but this table still exists and likely becomes important again when booking confirmation is formalized.

## Important Current Behavior

- Artist profile pages are public.
- Venue claims require admin approval.
- New venue submissions create a venue plus a pending claim.
- The dashboard Venues area now shows pending approvals explicitly.
- The inbox flow is enforced mostly in Supabase SQL functions and RLS, not only in React code.

## Project Structure

```text
src/app
  (marketing)     Public pages
  (auth)          Login, signup, password reset
  (dashboard)     Authenticated app
  admin           Admin-only pages
  actions         Server actions

src/components
  auth            Auth UI
  bands           Artist forms and filters
  contact         Inbox, messaging, contact requests
  profile         User profile/account UI
  venues          Venue forms and directory UI

src/lib
  supabase        SSR/browser/middleware clients
  contact.ts      Inbox/thread helpers
  admin/actions   Admin mutations

supabase
  migrations      Forward-only SQL migrations
  rollback        Manual rollback SQL
  legacy-migrations  Archived duplicate-timestamp history
```

## Local Setup

### App

1. Install dependencies:

```bash
npm install
```

2. Create local env values:

```bash
cp .env.example .env.local
```

3. Set:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

4. Start the app:

```bash
npm run dev
```

### Supabase local development

If you want a local Supabase stack:

```bash
npx supabase start
```

Local ports are configured in [supabase/config.toml](/Users/nsmith/Documents/tour-aligner/supabase/config.toml:1).

## Scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
```

## Database Workflow

Always create migrations with the Supabase CLI:

```bash
npx supabase migration new <descriptive_name>
```

Before pushing schema changes:

1. Check for duplicate migration timestamps.
2. Inspect remote migration state.
3. Prefer repair over blind push if remote history is out of sync.

Useful commands:

```bash
npx supabase migration list
npx supabase db push --dry-run
npx supabase db push
```

### Repo migration rules

- Never hand-create migration filenames.
- Never duplicate timestamps.
- Do not put rollback SQL in `supabase/migrations`.
- Keep rollback SQL in `supabase/rollback`.
- Do not move files from `supabase/legacy-migrations` back into active migrations unless explicitly intended.
- Treat `supabase/.temp/project-ref` as the source of truth for the linked project.

## Verification Status

Current repo quality signals:

- `npm run build` passes
- `npm run lint` passes with a small number of existing warnings
- There is currently no automated test suite in `tests`, `playwright`, or `cypress`

## Known Follow-Up Areas

- Formalize the relationship between `booking_inquiries` and `contact_threads`
- Add a real confirmed/booked workflow instead of stopping at accepted conversations
- Move public upcoming-show rendering away from `booking_inquiries`
- Replace remaining placeholder/project-scaffold traces
- Add automated coverage for claim approval, public profile visibility, and inbox permissions

## Additional Docs

- [Booking and Messaging Architecture](/Users/nsmith/Documents/tour-aligner/docs/booking-and-messaging-architecture.md)
