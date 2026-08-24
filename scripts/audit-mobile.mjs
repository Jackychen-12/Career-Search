/**
 * Renders every page at a real phone viewport and reports horizontal overflow.
 *
 * Run: node scripts/audit-mobile.mjs [baseUrl]
 */
import { chromium, devices } from "playwright";

const base = process.argv[2] ?? "http://localhost:3111";
const paths = ["/", "/profile", "/timeline", "/skills", "/events", "/report"];

const browser = await chromium.launch();
const context = await browser.newContext({
  ...devices["iPhone 13"],
  locale: "zh-CN",
});
const page = await context.newPage();

const consoleErrors = [];
page.on("console", (m) => {
  if (m.type() === "error") consoleErrors.push(m.text());
});
page.on("pageerror", (e) => consoleErrors.push(`pageerror: ${e.message}`));

let problems = 0;

for (const p of paths) {
  consoleErrors.length = 0;
  await page.goto(base + p, { waitUntil: "networkidle", timeout: 60_000 }).catch(() => {});
  await page.waitForTimeout(1200);

  const report = await page.evaluate(() => {
    const vw = window.innerWidth;
    const docWidth = document.documentElement.scrollWidth;
    const offenders = [];
    for (const el of document.querySelectorAll("body *")) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      // only flag what actually pushes past the viewport, not inner scrollers
      if (r.right > vw + 1 || r.left < -1) {
        let scrollableAncestor = false;
        for (let a = el.parentElement; a; a = a.parentElement) {
          const ox = getComputedStyle(a).overflowX;
          if (ox === "auto" || ox === "scroll" || ox === "hidden") {
            scrollableAncestor = true;
            break;
          }
        }
        if (!scrollableAncestor) {
          offenders.push({
            tag: el.tagName.toLowerCase(),
            cls: (el.className || "").toString().slice(0, 70),
            right: Math.round(r.right),
            text: (el.textContent || "").trim().slice(0, 40),
          });
        }
      }
    }
    return { vw, docWidth, offenders: offenders.slice(0, 6), total: offenders.length };
  });

  const overflow = report.docWidth > report.vw + 1;
  const status = overflow || consoleErrors.length ? "ISSUE" : "ok   ";
  if (overflow || consoleErrors.length) problems++;

  console.log(
    `${status} ${p.padEnd(10)} viewport=${report.vw} scrollWidth=${report.docWidth}` +
      `${overflow ? `  <- horizontal overflow (+${report.docWidth - report.vw}px)` : ""}`,
  );
  for (const o of report.offenders) {
    console.log(`        overflows to ${o.right}px  <${o.tag} class="${o.cls}">  "${o.text}"`);
  }
  if (report.total > report.offenders.length) {
    console.log(`        ...and ${report.total - report.offenders.length} more`);
  }
  for (const e of consoleErrors.slice(0, 4)) {
    console.log(`        console: ${e.slice(0, 140)}`);
  }
}

await browser.close();
console.log(problems ? `\n${problems} page(s) with issues` : "\nno mobile overflow or console errors");
