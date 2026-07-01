import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

const resolvedUrl =
  typeof window !== "undefined"
    ? window.location.origin + "/sb"
    : SUPABASE_URL || "https://placeholder.supabase.co";

export const supabase = createClient(resolvedUrl, SUPABASE_ANON_KEY, {
  auth: {
    flowType: "implicit",
    detectSessionInUrl: true,
    autoRefreshToken: true,
    persistSession: true,
  },
});
