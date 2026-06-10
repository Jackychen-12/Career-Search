/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    unoptimized: true,
  },
  async rewrites() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const workerUrl =
      process.env.NEXT_PUBLIC_WORKER_URL ||
      "https://career-search-oauth.keyu-chen.workers.dev";

    const rules = [];

    if (supabaseUrl) {
      rules.push({
        source: "/sb/:path*",
        destination: `${supabaseUrl}/:path*`,
      });
    }

    rules.push({
      source: "/ai/:path*",
      destination: `${workerUrl}/:path*`,
    });

    return rules;
  },
};

export default nextConfig;
