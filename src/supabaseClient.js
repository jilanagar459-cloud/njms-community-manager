import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // Fails loudly in the browser console rather than silently breaking
  // storage calls, since a missing env var is easy to miss otherwise.
  console.error(
    "Missing Supabase env vars. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY " +
    "in a .env.local file (local dev) or in Vercel's Environment Variables (production)."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
