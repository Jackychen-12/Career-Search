// Cloudflare Worker — GitHub OAuth token exchange proxy.
// Deploy: `cd worker && wrangler deploy`
// Environment variables (set via wrangler secret):
//   GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, ALLOWED_ORIGIN

interface Env {
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
  ALLOWED_ORIGIN: string;
}

function cors(env: Env): HeadersInit {
  return {
    "Access-Control-Allow-Origin": env.ALLOWED_ORIGIN,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors(env) });
    }

    const url = new URL(request.url);
    if (url.pathname !== "/api/oauth/exchange" || request.method !== "POST") {
      return new Response("Not Found", { status: 404 });
    }

    const body = (await request.json()) as { code?: string };
    if (!body.code) {
      return Response.json({ error: "missing code" }, { status: 400, headers: cors(env) });
    }

    const ghRes = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        client_id: env.GITHUB_CLIENT_ID,
        client_secret: env.GITHUB_CLIENT_SECRET,
        code: body.code,
      }),
    });

    const data = (await ghRes.json()) as { access_token?: string; error?: string };
    if (data.error || !data.access_token) {
      return Response.json({ error: data.error ?? "token exchange failed" }, { status: 401, headers: cors(env) });
    }

    return Response.json({ access_token: data.access_token }, { headers: cors(env) });
  },
};
