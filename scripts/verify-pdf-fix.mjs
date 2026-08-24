/**
 * Guards the mobile PDF fix.
 *
 *   1. asserts the default pdfjs entry point still needs Promise.withResolvers
 *      (i.e. the bug we fixed is real), and that the legacy bundle self-polyfills
 *   2. asserts the worker we publish is the legacy one, matching the main thread
 *   3. deletes Promise.withResolvers to emulate iOS 16 / WeChat WebView, then
 *      parses a real PDF through the legacy bundle
 *
 * Run: node scripts/verify-pdf-fix.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "node_modules", "pdfjs-dist");
const fails = [];

function check(label, ok, detail = "") {
  console.log(`${ok ? "ok  " : "FAIL"}  ${label}${detail ? ` — ${detail}` : ""}`);
  if (!ok) fails.push(label);
}

// --- 1. the bug is real, and legacy is the cure ------------------------------
const CORE_JS_POLYFILL = /target:\s*"Promise"\s*,\s*stat:\s*!0\s*\}\s*,\s*\{\s*withResolvers/;
const modern = fs.readFileSync(path.join(dist, "build", "pdf.min.mjs"), "utf8");
const legacy = fs.readFileSync(path.join(dist, "legacy", "build", "pdf.min.mjs"), "utf8");
const legacyWorker = fs.readFileSync(
  path.join(dist, "legacy", "build", "pdf.worker.min.mjs"),
  "utf8",
);

check(
  "default bundle relies on native Promise.withResolvers",
  modern.includes("Promise.withResolvers") && !CORE_JS_POLYFILL.test(modern),
);
check("legacy bundle polyfills Promise.withResolvers", CORE_JS_POLYFILL.test(legacy));
check("legacy worker polyfills Promise.withResolvers", CORE_JS_POLYFILL.test(legacyWorker));

// --- 2. we publish the legacy worker ----------------------------------------
const publishedPath = path.join(root, "public", "pdf.worker.min.mjs");
if (!fs.existsSync(publishedPath)) {
  check("public/pdf.worker.min.mjs exists", false, "run `node scripts/prepare-pdfjs.mjs`");
} else {
  const published = fs.readFileSync(publishedPath, "utf8");
  check("published worker is the legacy build", CORE_JS_POLYFILL.test(published));
}
check(
  "resumeParser imports the legacy entry point",
  fs
    .readFileSync(path.join(root, "lib", "resumeParser.ts"), "utf8")
    .includes('import("pdfjs-dist/legacy/build/pdf.mjs")'),
);
for (const asset of ["pdfjs/cmaps", "pdfjs/standard_fonts", "pdfjs/wasm"]) {
  const p = path.join(root, "public", asset);
  const n = fs.existsSync(p) ? fs.readdirSync(p).length : 0;
  check(`public/${asset} staged`, n > 0, `${n} files`);
}

// --- 3. parse a real PDF with no native Promise.withResolvers ---------------
function buildPdf(text) {
  const objs = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  const stream = `BT /F1 12 Tf 72 760 Td (${text}) Tj ET`;
  objs.push(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);

  let pdf = "%PDF-1.4\n";
  const offsets = [];
  objs.forEach((body, i) => {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xref = pdf.length;
  pdf += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
  for (const off of offsets) pdf += `${String(off).padStart(10, "0")} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return new Uint8Array(Buffer.from(pdf, "latin1"));
}

const SAMPLE =
  "Chen Keyu - Sichuan University Math, Peking University Finance MSc. " +
  "Skills: Python, SQL, LLM, product management, data analysis.";

delete Promise.withResolvers;
check("emulated old WebView", typeof Promise.withResolvers === "undefined");

const pdfjs = await import(path.join(dist, "legacy", "build", "pdf.mjs"));
check(
  "legacy bundle restored Promise.withResolvers on import",
  typeof Promise.withResolvers === "function",
);

const task = pdfjs.getDocument({
  data: buildPdf(SAMPLE),
  cMapUrl: path.join(root, "public/pdfjs/cmaps/"),
  cMapPacked: true,
  standardFontDataUrl: path.join(root, "public/pdfjs/standard_fonts/"),
  disableFontFace: true,
  verbosity: 0,
});

try {
  const pdf = await task.promise;
  const page = await pdf.getPage(1);
  const content = await page.getTextContent();
  const text = content.items.map((i) => ("str" in i ? i.str : "")).join(" ").trim();
  page.cleanup();
  check("extracted text from PDF", text.includes("Chen Keyu") && text.includes("Python"), `${text.length} chars`);
} catch (e) {
  check("extracted text from PDF", false, `${e.name}: ${e.message}`);
} finally {
  await task.destroy().catch(() => {});
}

console.log(fails.length ? `\n${fails.length} check(s) failed` : "\nall checks passed");
process.exitCode = fails.length ? 1 : 0;
