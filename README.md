# Certified & Covered — Landing Page

Marketing landing page + "Book Your Class" lead capture for Certified & Covered.
Static Vite site; leads are written straight to Supabase from the browser.

## Stack

- **Vite** (vanilla JS, no framework)
- **@supabase/supabase-js** — single anonymous `INSERT` into `bookings`
- Deployed on **Netlify** (`netlify.toml` builds `dist/`)

## Local development

```bash
npm install
cp .env.example .env   # fill in the two VITE_ values
npm run dev            # http://localhost:5173
npm run build          # production build -> dist/
npm run preview        # serve the built dist/
```

## Environment variables

| Name | Value |
|------|-------|
| `VITE_SUPABASE_URL` | `https://emgcvbpylddbqrqyxevh.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | the **publishable** key (`sb_publishable_…`) |

The publishable key is safe in browser code: anon has **column-level `INSERT`
only** on `bookings` and **no read grant**. The `.env` file is gitignored; the
same two values are set in the Netlify dashboard for production.

**Never** put the Supabase `service_role` key in this repo, in Netlify, or in
any browser code — it bypasses row-level security.

## The insert contract

`bookings` accepts an anonymous insert of **exactly these seven columns**:

```
org_name, contact_name, team_size, cert_type, deadline_date, phone, email
```

Rules the front-end honors (see `src/main.js`):

1. Send **only** those seven keys — never `id`, `status`, or `created_at`
   (anon has no grant on them; including them is rejected).
2. Never chain `.select()` on the insert — anon cannot read.
3. Empty `deadline_date` / `team_size` are sent as `null`, not `''`.

Front-end validation mirrors the five DB constraints so users get friendly
messages rather than raw database errors:

- `team_size` must be a whole number > 0 (or blank)
- at least one of `email` / `phone` is required
- `email`, if present, must be a valid shape
- `status` is DB-defaulted to `new`

## Viewing leads

Anon can't read, so the pipeline is worked from the **Supabase dashboard table
editor**. Useful sort: `deadline_date` ascending, filtered to `status = 'new'`.

## Project layout

```
index.html        # full landing page markup
src/main.js       # form validation + Supabase insert
src/supabase.js   # client (reads VITE_ env vars)
src/styles.css    # all styles
netlify.toml      # build + headers + SPA redirect
```
