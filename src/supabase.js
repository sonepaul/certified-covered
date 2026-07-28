import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  // Fail loud in the console during dev if env vars are missing, rather than
  // letting the form silently no-op.
  console.error(
    'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. ' +
      'Copy .env.example to .env (local) or set them in Netlify (prod).'
  );
}

// The anon/publishable key is safe in the browser: it can only INSERT into the
// seven granted columns of `bookings` and has no read grant. No session
// persistence is needed — this client only ever does one anonymous insert.
export const supabase = createClient(url, anonKey, {
  auth: { persistSession: false },
});
