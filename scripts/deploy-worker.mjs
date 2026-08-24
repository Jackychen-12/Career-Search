/**
 * Deploy the career-search-oauth Worker and set the secrets its AI features need.
 *
 * The Worker is the backend for every AI skill on the site (resume parsing,
 * interview questions, cover letters, JD match, coach…). Its DEEPSEEK_API_KEY
 * lives in Cloudflare secrets, which can only be written through an
 * authenticated wrangler session — so this has to run on a machine where you've
 * done `wrangler login`. It cannot run from CI or a sandbox.
 *
 * The key is read from the environment and never written to the repo.
 *
 * Usage:
 *   export DEEPSEEK_API_KEY=sk-...            # required
 *   export SUPABASE_URL=https://xxx.supabase.co   # optional, only if changing it
 *   export SUPABASE_ANON_KEY=eyJ...               # optional
 *   export SUPABASE_TEST_JWT=eyJ...               # optional, enables end-to-end check
 *   node scripts/deploy-worker.mjs
 */
import { execSync, spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const workerDir = path.join(root, "worker");
const WORKER_URL = process.env.WORKER_URL || "https://career-search-oauth.keyu-chen.workers.dev";

const die = (msg) => {
  console.error(`\n✗ ${msg}`);
  process.exit(1);
};

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
if (!DEEPSEEK_API_KEY) {
  die("未设置 DEEPSEEK_API_KEY。请先执行： export DEEPSEEK_API_KEY=sk-...  然后重跑。");
}

// 1. Validate the key against DeepSeek before touching Cloudflare — never push a
//    dead key that would silently break every AI feature on the site.
console.log("→ 校验 DeepSeek key ...");
const check = await fetch("https://api.deepseek.com/chat/completions", {
  method: "POST",
  headers: { "Content-Type": "application/json", Authorization: `Bearer ${DEEPSEEK_API_KEY}` },
  body: JSON.stringify({
    model: "deepseek-chat",
    messages: [{ role: "user", content: "ping" }],
    max_tokens: 1,
  }),
}).catch((e) => die(`无法连接 DeepSeek：${e.message}`));
if (check.status === 401 || check.status === 403) {
  die(`DeepSeek 拒绝了这个 key（HTTP ${check.status}）。请确认 key 正确、账户有余额。`);
}
if (!check.ok) {
  die(`DeepSeek 返回 HTTP ${check.status}，暂不部署。稍后重试或换 key。`);
}
console.log("  ✓ key 有效");

// 2. wrangler must be authenticated. CLOUDFLARE_API_TOKEN in the env also counts.
console.log("→ 检查 Cloudflare 登录态 ...");
const whoami = spawnSync("npx", ["wrangler", "whoami"], { cwd: workerDir, encoding: "utf8" });
const loggedIn = whoami.status === 0 && /You are logged in|API Token|Account/i.test(whoami.stdout || "");
if (!loggedIn && !process.env.CLOUDFLARE_API_TOKEN) {
  die(
    "wrangler 未登录，也没有 CLOUDFLARE_API_TOKEN。\n" +
      "  请在本机执行一次：  npx wrangler login\n" +
      "  或设置 API Token：  export CLOUDFLARE_API_TOKEN=...\n" +
      "  然后重跑本脚本。",
  );
}
console.log("  ✓ 已认证");

// 3. Write secrets. Piping the value via stdin keeps it out of the process list
//    and shell history. Only the keys present in the env get set.
function putSecret(name, value) {
  console.log(`→ 写入 secret ${name} ...`);
  const r = spawnSync("npx", ["wrangler", "secret", "put", name], {
    cwd: workerDir,
    input: value,
    stdio: ["pipe", "inherit", "inherit"],
  });
  if (r.status !== 0) die(`写入 ${name} 失败（wrangler 退出码 ${r.status}）。`);
}

putSecret("DEEPSEEK_API_KEY", DEEPSEEK_API_KEY);
if (process.env.SUPABASE_URL) putSecret("SUPABASE_URL", process.env.SUPABASE_URL);
if (process.env.SUPABASE_ANON_KEY) putSecret("SUPABASE_ANON_KEY", process.env.SUPABASE_ANON_KEY);

// 4. Deploy.
console.log("→ 部署 Worker ...");
try {
  execSync("npx wrangler deploy", { cwd: workerDir, stdio: "inherit" });
} catch {
  die("wrangler deploy 失败，请查看上方输出。");
}

// 5. Health check: no token must yield a clean 401, proving routing + auth are up.
console.log("→ 部署后健康检查 ...");
const ping = await fetch(`${WORKER_URL}/api/resume/parse`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ text: "healthcheck" }),
}).catch((e) => die(`无法访问 Worker：${e.message}`));
if (ping.status === 401) {
  console.log("  ✓ Worker 在线，鉴权层正常（未登录返回 401）");
} else {
  console.log(`  ⚠ Worker 返回 HTTP ${ping.status}，与预期的 401 不同，请手动确认`);
}

// 6. Optional end-to-end check through the Worker with a real Supabase JWT.
if (process.env.SUPABASE_TEST_JWT) {
  console.log("→ 端到端验证（带 JWT 真跑一次简历解析）...");
  const e2e = await fetch(`${WORKER_URL}/api/resume/parse`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.SUPABASE_TEST_JWT}`,
    },
    body: JSON.stringify({
      text: "陈柯宇 四川大学数学系 北京大学金融硕士 技能：Python SQL 大模型 数据分析 产品经理",
    }),
  }).catch((e) => die(`端到端请求失败：${e.message}`));
  const payload = await e2e.json().catch(() => ({}));
  if (e2e.ok && (payload.skills || payload.summary)) {
    console.log(`  ✓ AI 简历解析跑通，返回技能：${(payload.skills || []).slice(0, 5).join(", ")}`);
  } else {
    console.log(`  ⚠ 端到端返回 HTTP ${e2e.status}：${JSON.stringify(payload).slice(0, 200)}`);
  }
}

console.log("\n✅ 完成。可登录 https://career.chenkeyu12.com 上传一份简历做最终确认。");
