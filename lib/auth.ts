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
      redirectTo: window.location.origin + "/callback",
      scopes: "gist",
    },
  });
  if (error) throw new Error(error.message || "GitHub 登录失败");
}

export async function sendOtpCode(email: string) {
  const { error } = await supabase.auth.signInWithOtp({ email });
  if (error) throw new Error(error.message || "验证码发送失败，请检查邮箱地址或稍后重试");
}

export async function verifyOtpCode(email: string, token: string) {
  const { error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: "email",
  });
  if (error) throw new Error(error.message || "验证码无效或已过期，请重新获取");
}

export async function signOut() {
  await supabase.auth.signOut();
  if (typeof window !== "undefined") {
    window.localStorage.removeItem("career-search:prefs:v1");
    window.localStorage.removeItem("career-search:tracking");
    window.localStorage.removeItem("career-search:interviews");
  }
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
