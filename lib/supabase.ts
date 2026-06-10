import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. " +
    "Set them in .env.local (see README for setup instructions)."
  );
}

const resolvedUrl =
  typeof window !== "undefined" ? window.location.origin + "/sb" : SUPABASE_URL;

export const supabase = createClient(resolvedUrl, SUPABASE_ANON_KEY);
