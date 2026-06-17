import { supabase } from "./supabase";

export interface GhUser {
  login: string;
  avatar_url: string;
  name: string | null;
  email?: string;
}

export async function signInWithGitHub() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "github",
    options: {
      redirectTo: window.location.origin + "/callback/",
      scopes: "gist",
    },
  });
  if (error) console.error("Login error:", error.message);
}

export async function sendMagicLink(email: string) {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: window.location.origin + "/callback/",
    },
  });
  if (error) throw new Error(error.message);
}

export async function signOut() {
  await supabase.auth.signOut();
}

export async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export async function getUser(): Promise<GhUser | null> {
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;
  const meta = data.user.user_metadata;
  return {
    login: meta?.user_name ?? meta?.preferred_username ?? data.user.email?.split("@")[0] ?? "",
    avatar_url: meta?.avatar_url ?? "",
    name: meta?.full_name ?? meta?.name ?? null,
    email: data.user.email ?? undefined,
  };
}
