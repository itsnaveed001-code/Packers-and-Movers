<<<<<<< HEAD
# Packers Go Movers — booking website

Production-ready Next.js 15 site for a packers-and-movers business in India with slot-based online booking. No online payment — owner confirms bookings by phone; payment is collected on the day of service.

## Stack

- **Next.js 15** (App Router) + **TypeScript** (strict)
- **Tailwind CSS** + lightweight shadcn-style UI primitives
- **Supabase** Postgres + Auth + Row-Level Security
- **React Hook Form** + **Zod** for validation (shared schemas across client/server)
- **react-day-picker** + **date-fns** for date/time handling
- **Resend** for transactional email
- **lucide-react** for icons
- Deploys on **Vercel**

## What's inside

- Public marketing site (home, about, services, service detail, contact)
- Slot-based booking flow (`/book`) — service → date → time → details → review
- Booking confirmation page (`/booking-confirmed?ref=PGM-XXXXX`)
- Admin area (`/admin/*`) — dashboard, booking detail, blocked dates, services CRUD
- API routes — bookings (create/list/update), slots (availability), contact, lookup
- Sitemap + robots, per-page metadata, JSON-LD on home

## Quick start (local)

```bash
git clone <your-repo-url>
cd packmove
npm install
cp .env.example .env.local       # fill in real values
npm run dev
```

The site runs at <http://localhost:3000>.

## Supabase setup

1. Create a free project at <https://supabase.com>.
2. In the SQL editor, paste and run **`supabase/schema.sql`**.
3. In the SQL editor, paste and run **`supabase/seed.sql`** (inserts default services + availability).
4. Go to **Authentication → Users → Add user** and create your admin email + password. Skip email confirmation.
5. Go to **Project Settings → API** and copy:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` (secret, never expose to client) → `SUPABASE_SERVICE_ROLE_KEY`

## Resend (email) setup

1. Sign up at <https://resend.com> (free tier is fine to start).
2. Create an API key → `RESEND_API_KEY`.
3. Optional but recommended: verify your domain in Resend so emails come from `noreply@packersgomovers.com`. Until then, `onboarding@resend.dev` is the only allowed `from` address.
4. Set `ADMIN_EMAIL` to the inbox that should receive new-booking notifications.

If `RESEND_API_KEY` is missing, the app logs emails to the console in dev (and refuses to send in production).

## Run locally

```bash
npm run dev      # http://localhost:3000
npm run build    # production build
npm start        # serve the built app
npm run lint     # ESLint
```

## Deploy to Vercel

1. Push this repo to GitHub.
2. In Vercel, **Add New → Project → Import** your GitHub repo.
3. Paste every value from `.env.local` into **Project Settings → Environment Variables** (set them for Production + Preview + Development).
4. Click **Deploy**.

## Connect packersgomovers.com (Hostinger)

1. In Vercel: **Project → Settings → Domains → Add** `packersgomovers.com`.
2. Vercel shows the DNS records to add (usually an `A` record for the apex + a `CNAME` for `www`).
3. In Hostinger **hPanel → Domains → DNS Zone Editor**, add those records exactly as shown. DNS propagation takes 5 minutes to a few hours.

## Editing business details

Phone, WhatsApp, address, and other display values live in `lib/constants.ts`. Update them there or via env vars (`NEXT_PUBLIC_BUSINESS_*`). Services and availability are managed inside `/admin`.

## What this site does NOT do

- No online payments. Owner confirms by phone, customer pays on the day.
- No customer accounts. People book via the form using a one-time reference code.
- No SMS notifications. Email only. (Extension point: wrap `lib/email/send.ts` to dispatch SMS via Twilio later.)
- No real-time WebSockets. Admin sees new bookings on the next page load.

## License

Private — for use by Packers Go Movers.
=======
# Packers-and-Movers
>>>>>>> 6ca1a3ed9bbe92ec00ee018bf9c0b3c3d0b70189
