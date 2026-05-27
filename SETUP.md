# Setup guide — for the owner

This is the step-by-step guide to get **packersgomovers.com** live, from a fresh laptop with nothing installed. No coding required — every step is copy-paste and clicks.

You'll need:

- Your laptop
- Your packersgomovers.com domain (already with Hostinger)
- A credit/debit card or UPI (just for free-tier signups — nothing is charged)

The whole thing takes about **45–60 minutes** the first time.

---

## 1. Install Node.js (one-time)

If you don't already have Node.js, install it.

1. Go to <https://nodejs.org>
2. Download the **LTS** version (the big green button on the left)
3. Run the installer and click Next-Next-Finish

To confirm it worked, open a terminal and run:

```bash
node --version
```

You should see something like `v20.x.x`.

> [screenshot: nodejs.org with LTS button highlighted]

---

## 2. Get the code

If you cloned this repo from GitHub, you already have it. If not:

```bash
git clone <your-github-repo-url>
cd packmove
npm install
```

This downloads all the libraries the site needs (about 2 minutes).

---

## 3. Create your Supabase project (the database)

Supabase is where bookings, services, and admin accounts live.

1. Go to <https://supabase.com> and click **Start your project**.
2. Sign up with GitHub or email.
3. Click **New Project**.
   - **Name:** `packersgomovers`
   - **Database password:** create a strong one and **save it somewhere safe** (you may never need it, but if you lose it you lose access to the project).
   - **Region:** choose **Mumbai (Asia Pacific - Mumbai)** for best speed in India.
   - **Pricing plan:** Free.
4. Wait 2–3 minutes for the project to provision.

> [screenshot: Supabase "Create new project" page]

### 3a. Run the database schema

1. Open the Supabase project you just created.
2. In the left sidebar, click **SQL Editor**.
3. Click **+ New query**.
4. In a file browser, open the project folder and open `supabase/schema.sql`. Copy the entire contents.
5. Paste into the Supabase SQL editor.
6. Click **Run**. You should see "Success. No rows returned."

> [screenshot: SQL editor with schema.sql pasted, Run button highlighted]

### 3b. Run the seed (initial services)

1. Click **+ New query** again.
2. Open `supabase/seed.sql` in your file browser, copy the contents.
3. Paste into the SQL editor and click **Run**.

This loads the 6 default services. You can edit them later in the admin panel.

### 3c. Create your admin user

1. In Supabase, click **Authentication** in the left sidebar.
2. Click **Users**.
3. Click **Add user → Create new user**.
4. Enter your email and choose a strong password. **Save these — this is your admin login.**
5. **Important:** turn ON **Auto Confirm User** so you don't have to verify the email.
6. Click **Create user**.

> [screenshot: Add user modal with Auto Confirm User toggled on]

### 3d. Copy your API keys

1. In Supabase, click **Project Settings** (gear icon at bottom-left).
2. Click **API** in the sidebar.
3. You'll need three values. Open `.env.local` in your project folder (or `.env.example` if you haven't made one yet) and paste each value:

| Where in Supabase | Goes into `.env.local` as |
|---|---|
| `Project URL` | `NEXT_PUBLIC_SUPABASE_URL` |
| `anon` `public` key | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| `service_role` `secret` key | `SUPABASE_SERVICE_ROLE_KEY` |

> ⚠️ The `service_role` key is **secret**. Never paste it on a website or share a screenshot of it. It bypasses all security on the database.

---

## 4. Set up Resend (transactional email)

Resend sends:

- A new-booking notification to **you** (so you know to call the customer)
- A confirmation email to the **customer** (with their reference code)

1. Go to <https://resend.com> and sign up.
2. In the dashboard, click **API Keys → Create API Key**.
3. Name it `packersgomovers-prod`. Copy the key (starts with `re_`).
4. In `.env.local`, set:

```
RESEND_API_KEY=re_your_key_here
ADMIN_EMAIL=your_email@gmail.com
```

`ADMIN_EMAIL` is where new-booking notifications go.

### 4a. Optional but recommended — verify your domain

Until you verify `packersgomovers.com` in Resend, emails are sent from `onboarding@resend.dev` (which is fine for testing but unprofessional for production).

1. In Resend, click **Domains → Add Domain → `packersgomovers.com`**.
2. Resend shows you DNS records to add (TXT + MX + DKIM).
3. In Hostinger **hPanel → Domains → DNS Zone Editor**, add each record exactly.
4. Wait 5–30 minutes, then click **Verify** in Resend.
5. Once verified, set `RESEND_FROM_EMAIL=Packers Go Movers <noreply@packersgomovers.com>` in `.env.local`.

---

## 5. Fill in business details

Open `lib/constants.ts` in any text editor (VS Code, Notepad, anything).

Find this section:

```ts
export const BUSINESS = {
  name: ...,
  phone: ...,
  whatsapp: ...,
  address: ...,
  // ...
};
```

Replace each value with your real one:

- **`phone`** — your business phone in the form `+91 98765 43210`
- **`whatsapp`** — digits only, country code + number: `919876543210`
- **`address`** — your office address as one line
- **`gst`** — your GSTIN, or delete this if you don't want to show one

Or — easier — set them as environment variables in `.env.local`:

```
NEXT_PUBLIC_BUSINESS_PHONE=+91 98765 43210
NEXT_PUBLIC_BUSINESS_WHATSAPP=919876543210
```

---

## 6. Test it locally

```bash
npm run dev
```

Open <http://localhost:3000> in your browser.

- Click around, verify your business info shows correctly.
- Go to `/book`, complete a test booking — pick any service, date, time, fill the form.
- You should land on the confirmation page with a reference code.
- Check Supabase **Table editor → bookings** — your test booking should be there.
- Check your `ADMIN_EMAIL` inbox — a notification should arrive (or be logged to the terminal in dev mode).

Then sign in to the admin:

- Open <http://localhost:3000/admin/login>
- Sign in with the email + password you created in Supabase
- You should see the booking you just made on the dashboard

---

## 7. Deploy to Vercel

1. Push your code to GitHub if it isn't there already.
2. Go to <https://vercel.com> and sign in with GitHub.
3. Click **Add New → Project**.
4. Pick your `packmove` repo. Click **Import**.
5. Vercel will detect it's a Next.js app. Don't change any settings.
6. Expand **Environment Variables** and paste *every variable* from `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `RESEND_API_KEY`
   - `ADMIN_EMAIL`
   - `RESEND_FROM_EMAIL` (if you set one)
   - `NEXT_PUBLIC_BUSINESS_NAME`
   - `NEXT_PUBLIC_BUSINESS_PHONE`
   - `NEXT_PUBLIC_BUSINESS_WHATSAPP`
   - `NEXT_PUBLIC_SITE_URL` — set to `https://packersgomovers.com`
7. Click **Deploy**. Wait 2–3 minutes.

Your site is now live at a temporary `vercel.app` URL.

> [screenshot: Vercel deploy success screen]

---

## 8. Connect packersgomovers.com

### Vercel side

1. In your Vercel project, click **Settings → Domains**.
2. In the box, type `packersgomovers.com` and click **Add**.
3. Vercel shows you DNS records to add — usually:
   - An **A record** for `@` pointing to `76.76.21.21`
   - A **CNAME** for `www` pointing to `cname.vercel-dns.com`
4. Also click **Add** for `www.packersgomovers.com` so both work.

### Hostinger side

1. Log into Hostinger → **hPanel**.
2. **Domains → packersgomovers.com → DNS / Nameservers → DNS Zone Editor**.
3. For each record Vercel showed you:
   - Click **Add Record**
   - **Type:** A (or CNAME)
   - **Name:** `@` for the apex, `www` for the www record
   - **Points to:** the value Vercel showed
   - **TTL:** leave default (14400)
   - Save.
4. If Hostinger already has old A/CNAME records for `@` or `www`, delete them first — they'll conflict.

Wait 5–30 minutes (sometimes a couple of hours). Then visit <https://packersgomovers.com> — you should see your site, with HTTPS automatically provisioned.

> [screenshot: Hostinger DNS Zone Editor with A and CNAME records]

---

## 9. First-day admin tasks

Now that the site is live:

1. **Sign in** at `https://packersgomovers.com/admin/login`
2. **Review and edit services** — `/admin/services`
   - Update descriptions and prices to match what you really offer
   - Deactivate any services you don't want yet (toggle the eye icon)
3. **Block holiday dates** — `/admin/availability`
   - Block Diwali, Christmas, any day your team is off
4. **Place a real test booking** from a private/incognito tab to confirm the customer emails arrive
5. **Bookmark** `https://packersgomovers.com/admin` on your phone

---

## Troubleshooting

**Booking form says "Booking is temporarily unavailable"**
→ Your services table is empty. Re-run `supabase/seed.sql`, or add services in `/admin/services`.

**Customer didn't get a confirmation email**
→ Check Resend dashboard for delivery status. If `RESEND_FROM_EMAIL` uses a domain you haven't verified yet, change it to use `onboarding@resend.dev` temporarily.

**`/admin` keeps redirecting to `/admin/login`**
→ Your admin user may not be confirmed. In Supabase → Authentication → Users, find your user and check the **Confirmed** column.

**Bookings appear in Supabase but not on the admin dashboard**
→ Refresh the page. The admin loads on each visit — it doesn't auto-update.

**Site shows old data after a change**
→ Marketing pages are cached for 5 minutes. Trigger a redeploy in Vercel to bust the cache immediately.

---

## Who to ask for help

- Supabase issues — <https://supabase.com/support>
- Resend issues — support@resend.com
- Vercel deploy issues — <https://vercel.com/support>
- DNS / Hostinger — Hostinger live chat (usually fast)

For the code itself, ask whoever built the site for you.
