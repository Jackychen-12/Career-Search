import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://mijzadmumnlrpvhaxwrm.supabase.co";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1panphZG11bW5scnB2aGF4d3JtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA5MTM3MDEsImV4cCI6MjA5NjQ4OTcwMX0.uGZy27PJRz8SoTzyryzGQgMIGkl5GA08z_kJvIajuKQ";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
