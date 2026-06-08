const TOKEN_KEY = "career-search:gh-token";
const USER_KEY = "career-search:gh-user";

// These are set at build time or hard-coded for the public OAuth App.
// The client_id is NOT secret — it's safe to embed in client code.
const CLIENT_ID = process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID ?? "";
const WORKER_URL = process.env.NEXT_PUBLIC_OAUTH_WORKER_URL ?? "";

export interface GhUser {
  login: string;
  avatar_url: string;
  name: string | null;
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getUser(): GhUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function isLoggedIn(): boolean {
  return !!getToken();
}

export function login() {
  const redirect = window.location.origin + (process.env.NEXT_PUBLIC_BASE_PATH ?? "") + "/callback/";
  const url = `https://github.com/login/oauth/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(redirect)}&scope=gist`;
  window.location.href = url;
}

export async function handleCallback(code: string): Promise<boolean> {
  try {
    const res = await fetch(`${WORKER_URL}/api/oauth/exchange`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    const data = await res.json() as { access_token?: string };
    if (!data.access_token) return false;

    localStorage.setItem(TOKEN_KEY, data.access_token);

    const userRes = await fetch("https://api.github.com/user", {
      headers: { Authorization: `Bearer ${data.access_token}` },
    });
    if (userRes.ok) {
      const user = await userRes.json() as GhUser;
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    }
    return true;
  } catch {
    return false;
  }
}

export function logout() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}
