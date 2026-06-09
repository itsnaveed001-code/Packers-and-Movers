# EasyShiftX — booking website

Production-ready Next.js 15 site for **EasyShiftX**, a packing and moving business serving Bengaluru. Slot-based online booking, no online payment — the team confirms each booking by phone and payment is collected on the day of service.

## Stack

- **Next.js 15** (App Router) + **TypeScript** (strict)
- **Tailwind CSS** + lightweight shadcn-style UI primitives
- **Supabase** Postgres + Auth + Row-Level Security
- **React Hook Form** + **Zod** for validation (shared schemas across client/server)
- **react-day-picker** + **date-fns** for date/time handling
- **Brevo** (primary) and **Resend** (fallback) for transactional email
- **Google Maps Places** for address autocomplete
- **lucide-react** for icons
- Deploys on **Vercel**

## What's inside

- Public marketing site (home, about, services, service detail, contact)
- Slot-based booking flow (`/book`) — service → date → time → details → review
- Booking confirmation page (`/booking-confirmed?ref=PGM-XXXXX`)
- Admin control room (`/admin/*`) — bookings dashboard, booking detail with status/reschedule/notes, day-board schedule, availability, services CRUD, working-hours settings, revenue reports, CSV export
- API routes — bookings (create/list/update), slots (availability), contact, lookup, admin settings/services/blocked-dates
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
3. Then run any files inside **`supabase/migrations/`** in order (each one only needs to be run once).
4. In the SQL editor, paste and run **`supabase/seed.sql`** (inserts default services + availability).
5. Go to **Authentication → Users → Add user** and create your admin email + password. Toggle on "Auto Confirm User".
6. Go to **Project Settings → API** and copy:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` (secret, never expose to client) → `SUPABASE_SERVICE_ROLE_KEY`

## Email setup

The app prefers **Brevo** and falls back to **Resend** if Brevo isn't configured.

1. Sign up at <https://brevo.com>. Create an API key → `BREVO_API_KEY`.
2. **Senders → verify** the address you want emails to come from (e.g. `easyshiftx.2415@gmail.com`).
3. (Optional) Create a transactional template for new-booking admin notifications and set its numeric ID as `BREVO_ADMIN_TEMPLATE_ID`. The app passes `REFERENCE / SERVICE / DATE / TIME / CUSTOMER_* / PICKUP / DROPOFF / NOTES / ADMIN_URL` tokens to the template. If unset, the app sends a built-in HTML email instead.
4. Set `ADMIN_EMAIL` to the inbox that should receive new-booking notifications.
5. (Optional) Set `RESEND_API_KEY` as a fallback. If neither is configured, the app logs emails to the console in dev and refuses to send in production.

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

## Connect easyshiftx.com (Hostinger)

1. In Vercel: **Project → Settings → Domains → Add** `easyshiftx.com`.
2. Vercel shows the DNS records to add (usually an `A` record for the apex + a `CNAME` for `www`).
3. In Hostinger **hPanel → Domains → DNS Zone Editor**, add those records exactly as shown. DNS propagation takes 5 minutes to a few hours.

## Editing business details

Phone, WhatsApp, address, and other display values live in [`lib/constants.ts`](lib/constants.ts). Update them there or via env vars (`NEXT_PUBLIC_BUSINESS_*`). Services and availability are managed inside `/admin`.

## What this site does NOT do

- No online payments. Owner confirms by phone, customer pays on the day.
- No customer accounts. People book via the form using a one-time reference code.
- No SMS notifications. Email only. (Extension point: wrap `lib/email/send.ts` to dispatch SMS via Twilio later.)

## License

Private — for use by EasyShiftX.
