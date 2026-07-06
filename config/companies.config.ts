import type { Category, Region } from "../lib/types";

// ─────────────────────────────────────────────────────────────────────────────
// ATS company list. Fork this and edit the array to track your own companies.
// Adding a company = adding one line. Each entry hits that company's public
// job-board API (Greenhouse / Lever / Ashby) at crawl time.
//
//   Greenhouse token:  the slug in boards.greenhouse.io/<token>
//   Lever token:       the slug in jobs.lever.co/<token>
//   Ashby token:       the org slug in jobs.ashbyhq.com/<token>
// ─────────────────────────────────────────────────────────────────────────────

export type Ats = "greenhouse" | "lever" | "ashby";

export interface AtsCompany {
  name: string;
  ats: Ats;
  token: string;
  tier: number; // 1 = 头部, 2 = 知名, 3 = 其他
  category: Category;
  region?: Region;
}

export const ATS_COMPANIES: AtsCompany[] = [
  // —— Greenhouse ——
  { name: "Stripe", ats: "greenhouse", token: "stripe", tier: 1, category: "外企", region: "海外" },
  { name: "Databricks", ats: "greenhouse", token: "databricks", tier: 1, category: "外企", region: "海外" },
  { name: "Figma", ats: "greenhouse", token: "figma", tier: 1, category: "外企", region: "海外" },
  { name: "Airbnb", ats: "greenhouse", token: "airbnb", tier: 1, category: "外企", region: "海外" },
  { name: "Robinhood", ats: "greenhouse", token: "robinhood", tier: 1, category: "外企", region: "海外" },
  { name: "Coinbase", ats: "greenhouse", token: "coinbase", tier: 1, category: "外企", region: "海外" },
  { name: "Pinterest", ats: "greenhouse", token: "pinterest", tier: 1, category: "外企", region: "海外" },
  { name: "Reddit", ats: "greenhouse", token: "reddit", tier: 1, category: "外企", region: "海外" },
  { name: "DoorDash", ats: "greenhouse", token: "doordash", tier: 1, category: "外企", region: "海外" },
  { name: "Cloudflare", ats: "greenhouse", token: "cloudflare", tier: 1, category: "外企", region: "海外" },
  { name: "Twilio", ats: "greenhouse", token: "twilio", tier: 1, category: "外企", region: "海外" },
  { name: "Instacart", ats: "greenhouse", token: "instacart", tier: 1, category: "外企", region: "海外" },
  { name: "Duolingo", ats: "greenhouse", token: "duolingo", tier: 1, category: "外企", region: "海外" },
  { name: "Canva", ats: "greenhouse", token: "canva", tier: 1, category: "外企", region: "海外" },
  { name: "Discord", ats: "greenhouse", token: "discord", tier: 2, category: "外企", region: "海外" },
  { name: "GitLab", ats: "greenhouse", token: "gitlab", tier: 2, category: "外企", region: "海外" },
  { name: "Brex", ats: "greenhouse", token: "brex", tier: 2, category: "外企", region: "海外" },
  { name: "Samsara", ats: "greenhouse", token: "samsara", tier: 2, category: "外企", region: "海外" },
  { name: "Palantir", ats: "greenhouse", token: "palantir", tier: 1, category: "外企", region: "海外" },
  { name: "Snap", ats: "greenhouse", token: "snap", tier: 1, category: "外企", region: "海外" },
  { name: "Spotify", ats: "greenhouse", token: "spotify", tier: 1, category: "外企", region: "海外" },
  { name: "Block", ats: "greenhouse", token: "block", tier: 1, category: "外企", region: "海外" },

  // —— Lever ——
  { name: "Plaid", ats: "lever", token: "plaid", tier: 2, category: "外企", region: "海外" },
  { name: "Attentive", ats: "lever", token: "attentive", tier: 3, category: "外企", region: "海外" },
  { name: "Spotify", ats: "lever", token: "spotify", tier: 1, category: "外企", region: "海外" },

  // —— Ashby ——
  { name: "Notion", ats: "ashby", token: "notion", tier: 1, category: "外企", region: "海外" },
  { name: "Ramp", ats: "ashby", token: "ramp", tier: 1, category: "外企", region: "海外" },
  { name: "Anthropic", ats: "ashby", token: "anthropic", tier: 1, category: "外企", region: "海外" },
  { name: "Linear", ats: "ashby", token: "linear", tier: 2, category: "外企", region: "海外" },
  { name: "Vercel", ats: "ashby", token: "vercel", tier: 2, category: "外企", region: "海外" },
];= [
  // —— Greenhouse ——
  { name: "Stripe", ats: "greenhouse", token: "stripe", tier: 1, category: "外企", region: "海外" },
  { name: "Databricks", ats: "greenhouse", token: "databricks", tier: 1, category: "外企", region: "海外" },
  { name: "Figma", ats: "greenhouse", token: "figma", tier: 1, category: "外企", region: "海外" },
  { name: "Robinhood", ats: "greenhouse", token: "robinhood", tier: 1, category: "外企", region: "海外" },
  { name: "Coinbase", ats: "greenhouse", token: "coinbase", tier: 1, category: "外企", region: "海外" },
  { name: "Discord", ats: "greenhouse", token: "discord", tier: 2, category: "外企", region: "海外" },
  { name: "GitLab", ats: "greenhouse", token: "gitlab", tier: 2, category: "外企", region: "海外" },
  { name: "Brex", ats: "greenhouse", token: "brex", tier: 2, category: "外企", region: "海外" },
  { name: "Samsara", ats: "greenhouse", token: "samsara", tier: 2, category: "外企", region: "海外" },
  { name: "Pinterest", ats: "greenhouse", token: "pinterest", tier: 1, category: "外企", region: "海外" },
  { name: "Reddit", ats: "greenhouse", token: "reddit", tier: 1, category: "外企", region: "海外" },
  { name: "DoorDash", ats: "greenhouse", token: "doordash", tier: 1, category: "外企", region: "海外" },

  // —— Lever ——
  { name: "Plaid", ats: "lever", token: "plaid", tier: 2, category: "外企", region: "海外" },
  { name: "Attentive", ats: "lever", token: "attentive", tier: 3, category: "外企", region: "海外" },

  // —— Ashby ——
  { name: "Linear", ats: "ashby", token: "linear", tier: 2, category: "外企", region: "海外" },
  { name: "Vercel", ats: "ashby", token: "vercel", tier: 2, category: "外企", region: "海外" },
];
