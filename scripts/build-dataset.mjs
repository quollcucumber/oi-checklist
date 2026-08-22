// Build src/data/problems.json by scraping oj.uz problem listings and
// matching Codeforces mirror contests for CF account sync.
// Usage: node scripts/build-dataset.mjs

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const SOURCES = [
  { search: "IOI", olympiad: "IOI", name: "International Olympiad in Informatics", re: /^IOI(\d{2})_/ },
  { search: "APIO", olympiad: "APIO", name: "Asia-Pacific Informatics Olympiad", re: /^APIO(\d{2})_/ },
  { search: "CEOI", olympiad: "CEOI", name: "Central European Olympiad in Informatics", re: /^CEOI(\d{2})_/ },
  { search: "BOI", olympiad: "Baltic OI", name: "Baltic Olympiad in Informatics", re: /^BOI(\d{2})_/ },
  { search: "JOI", olympiad: "JOI", name: "Japanese Olympiad in Informatics", re: /^JOI(\d{2})_/ },
  { search: "eJOI", olympiad: "eJOI", name: "European Junior Olympiad in Informatics", re: /^eJOI(\d{2})_/ },
  { search: "COI", olympiad: "COI", name: "Croatian Olympiad in Informatics", re: /^COI(\d{2})_/ },
  { search: "COCI", olympiad: "COCI", name: "Croatian Open Competition in Informatics", re: /^COCI(\d{2})_/ },
];

// Codeforces mirror contests of olympiads in our dataset (contest id -> olympiad/year).
const CF_MIRRORS = [
  { contestId: 1192, olympiad: "CEOI", year: 2019 },
  { contestId: 1193, olympiad: "CEOI", year: 2019 },
  { contestId: 1402, olympiad: "CEOI", year: 2020 },
  { contestId: 1403, olympiad: "CEOI", year: 2020 },
  { contestId: 1386, olympiad: "Baltic OI", year: 2020 },
  { contestId: 1387, olympiad: "Baltic OI", year: 2020 },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchText(url) {
  const res = await fetch(url, { headers: { "User-Agent": "oi-checklist-dataset-builder" } });
  if (!res.ok) throw new Error(`${res.status} for ${url}`);
  return res.text();
}

function parseProblemsPage(html) {
  const rows = [];
  const rowRe = /<td>([A-Za-z0-9_]+)<\/td>.*?<a href="\/problem\/view\/\1">(.*?)<\/a>(?:<span> <span class="label label-info">(.*?)<\/span>)?/gs;
  let m;
  while ((m = rowRe.exec(html))) {
    rows.push({ alias: m[1], title: decodeEntities(m[2]), type: m[3] ?? "Batch" });
  }
  return rows;
}

function decodeEntities(s) {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"');
}

function maxPage(html) {
  const pages = [...html.matchAll(/\?page=(\d+)/g)].map((m) => Number(m[1]));
  return pages.length ? Math.max(...pages) : 1;
}

function yearFrom2Digit(two) {
  const n = Number(two);
  return n >= 80 ? 1900 + n : 2000 + n;
}

const normalize = (t) => t.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

async function main() {
  const problems = [];
  for (const src of SOURCES) {
    const first = await fetchText(`https://oj.uz/problems?search=${src.search}&page=1`);
    const pages = maxPage(first);
    let rows = parseProblemsPage(first);
    for (let p = 2; p <= pages; p++) {
      await sleep(400);
      rows = rows.concat(parseProblemsPage(await fetchText(`https://oj.uz/problems?search=${src.search}&page=${p}`)));
    }
    for (const row of rows) {
      const m = row.alias.match(src.re);
      if (!m) continue;
      problems.push({
        id: row.alias,
        title: row.title,
        olympiad: src.olympiad,
        year: yearFrom2Digit(m[1]),
        type: row.type,
        url: `https://oj.uz/problem/view/${row.alias}`,
      });
    }
    console.log(`${src.olympiad}: ${problems.filter((p) => p.olympiad === src.olympiad).length} problems`);
  }

  // Attach Codeforces problem ids by matching titles within known mirror contests.
  const cfData = await (await fetch("https://codeforces.com/api/problemset.problems")).json();
  if (cfData.status === "OK") {
    for (const mirror of CF_MIRRORS) {
      const cfProblems = cfData.result.problems.filter((p) => p.contestId === mirror.contestId);
      for (const cfp of cfProblems) {
        const match = problems.find(
          (p) => p.olympiad === mirror.olympiad && p.year === mirror.year && normalize(p.title) === normalize(cfp.name)
        );
        if (match) match.cf = `${cfp.contestId}/${cfp.index}`;
      }
    }
    console.log(`CF-linked: ${problems.filter((p) => p.cf).length} problems`);
  }

  problems.sort((a, b) =>
    a.olympiad.localeCompare(b.olympiad) || b.year - a.year || a.id.localeCompare(b.id)
  );

  const outPath = join(__dirname, "..", "src", "data", "problems.json");
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, JSON.stringify(problems, null, 1));
  console.log(`Wrote ${problems.length} problems to ${outPath}`);
}

main();
