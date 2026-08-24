/**
 * Stage pdf.js runtime assets into public/ before dev & build.
 *
 * The worker comes from pdfjs-dist's **legacy** bundle, matching the legacy
 * entry point lib/resumeParser.ts imports. The default bundle calls
 * `Promise.withResolvers` (Chrome 119+ / Safari 17.4+) on every worker RPC, so
 * it throws outright on iOS 16 Safari and the WeChat/Android WebViews a lot of
 * users open the site from; the legacy bundle ships core-js polyfills instead.
 * Main thread and worker have to come from the same bundle.
 *
 * cmaps/ is published so CID-keyed CJK fonts resolve — without it Chinese
 * resumes exported by WPS/Word come back empty or garbled. standard_fonts/
 * covers PDFs that reference base-14 fonts without embedding them, and wasm/
 * the JBIG2/OpenJPEG/QCMS decoders pdf.js reaches for on those image formats.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "node_modules", "pdfjs-dist");
const publicDir = path.join(root, "public");

function copyDir(from, to) {
  fs.mkdirSync(to, { recursive: true });
  let n = 0;
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const s = path.join(from, entry.name);
    const d = path.join(to, entry.name);
    if (entry.isDirectory()) {
      n += copyDir(s, d);
    } else {
      fs.copyFileSync(s, d);
      n++;
    }
  }
  return n;
}

fs.mkdirSync(publicDir, { recursive: true });
fs.copyFileSync(
  path.join(dist, "legacy", "build", "pdf.worker.min.mjs"),
  path.join(publicDir, "pdf.worker.min.mjs"),
);

const cmaps = copyDir(path.join(dist, "cmaps"), path.join(publicDir, "pdfjs", "cmaps"));
const fonts = copyDir(
  path.join(dist, "standard_fonts"),
  path.join(publicDir, "pdfjs", "standard_fonts"),
);
const wasm = copyDir(path.join(dist, "wasm"), path.join(publicDir, "pdfjs", "wasm"));

console.log("[pdfjs] worker -> public/pdf.worker.min.mjs (legacy build)");
console.log(`[pdfjs] cmaps: ${cmaps}, standard_fonts: ${fonts}, wasm: ${wasm} files`);
