// Toggle data sources and point the open-source-repo adapter at the repos you
// trust. Fork and edit freely.

export const SOURCES_CONFIG = {
  seed: true, // curated baseline (always on — guarantees the site is never empty)
  ats: true, // Greenhouse / Lever / Ashby public APIs (see companies.config.ts)
  openSourceRepos: true, // community-maintained 校招/实习 lists on GitHub
  official: true, // best-effort 国内大厂官网 adapters (may fail from CI IPs)
};

export interface RepoSource {
  id: string;
  owner: string;
  repo: string;
  /** File path inside the repo to parse. */
  path: string;
  branch?: string;
  /** How to extract jobs from the file. */
  parser: "md-table";
  /** Default category for rows from this repo. */
  category?: import("../lib/types").Category;
  /** Default region for rows from this repo. */
  region?: import("../lib/types").Region;
}

// NOTE: GitHub-hosted 校招 lists change structure often. Each repo here is parsed
// by a small, isolated parser — a broken one only drops its own source. Validate
// a repo (raw file exists + table columns match) before enabling it.
export const OPENSOURCE_REPOS: RepoSource[] = [
  {
    id: "repo:canada-2026",
    owner: "negarprh",
    repo: "Canadian-Tech-Internships-2026",
    path: "README.md",
    parser: "md-table",
    category: "外企",
    region: "海外",
  },
  {
    id: "repo:canada-2027",
    owner: "negarprh",
    repo: "Canadian-Tech-Internships-2026",
    path: "README-2027.md",
    parser: "md-table",
    category: "外企",
    region: "海外",
  },
  {
    id: "repo:europe-2026",
    owner: "LorenzoLaCorte",
    repo: "european-tech-internships-2026",
    path: "README.md",
    parser: "md-table",
    category: "外企",
    region: "海外",
  },
  {
    id: "repo:us-summer-2025",
    owner: "arunike",
    repo: "Summer-2025-Internship-List",
    path: "README.md",
    parser: "md-table",
    category: "外企",
    region: "海外",
  },
  {
    id: "repo:zapply-2026",
    owner: "zapplyjobs",
    repo: "Internships-2026",
    path: "README.md",
    parser: "md-table",
    category: "外企",
    region: "海外",
  },
];
