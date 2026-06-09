import path from "node:path";

/** Directory holding the crawled snapshot (committed to the repo by CI). */
export const DATA_DIR = path.join(process.cwd(), "data");

/** Crawled jobs snapshot written by `npm run crawl`. */
export const STORE_PATH = path.join(DATA_DIR, "jobs.json");

/** Crawl run metadata (counts, timestamps, per-source results). */
export const META_PATH = path.join(DATA_DIR, "meta.json");

