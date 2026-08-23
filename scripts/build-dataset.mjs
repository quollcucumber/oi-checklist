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
  { search: "eJOI", olympiad: "eJOI", name: "European Junior Olympiad in Informatics", re: /^eJOI(\d{2})_/ },
  { search: "COI", olympiad: "COI", name: "Croatian Olympiad in Informatics", re: /^COI(\d{2})_/ },
  { search: "COCI", olympiad: "COCI", name: "Croatian Open Competition in Informatics", re: /^COCI(\d{2})_/ },
  { search: "EGOI", olympiad: "EGOI", name: "European Girls' Olympiad in Informatics", re: /^EGOI(\d{2})_/ },
  { search: "IZhO", olympiad: "IZhO", name: "International Zhautykov Olympiad", re: /^IZhO(\d{2})_/ },
  { search: "NOI", olympiad: "Singapore NOI", name: "Singapore National Olympiad in Informatics", re: /^NOI(\d{2})_/ },
];

// AtCoder contest id -> JOI round (the full JOI archive lives on AtCoder).
const JOI_ROUNDS = [
  { olympiad: "JOI Final", re: /^joi(\d{4})(?:ho|final)$/ },
  { olympiad: "JOI Spring Camp", re: /^joi(?:sc|sp)(\d{4})(?:-day\d)?$/ },
  { olympiad: "JOI Open", re: /^joiopen(\d{4})[a-z]?$/ },
];

const USACO_DIVISIONS = { Bronze: 0, Silver: 1, Gold: 2, Platinum: 3 };

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

// USACO problems from the USACO Guide's metadata dump (usaco.org has no API).
async function fetchUsaco() {
  const data = JSON.parse(
    await fetchText("https://raw.githubusercontent.com/cpinitiative/usaco-problems/main/problems.json")
  );
  const problems = [];
  for (const p of Object.values(data)) {
    problems.push({
      id: `USACO_${p.id}`,
      title: p.title.name,
      olympiad: "USACO",
      year: p.source.year,
      type: p.source.sourceString,
      group: p.source.division,
      url: p.url,
    });
  }
  console.log(`USACO: ${problems.length} problems`);
  return problems;
}

// JOI Final / Spring Camp / Open problems from the AtCoder archive,
// via the AtCoder Problems (kenkoooo) metadata API.
async function fetchJoi() {
  const all = JSON.parse(await fetchText("https://kenkoooo.com/atcoder/resources/problems.json"));
  const problems = [];
  for (const p of all) {
    for (const round of JOI_ROUNDS) {
      const m = p.contest_id.match(round.re);
      if (!m) continue;
      problems.push({
        id: p.id,
        title: p.name,
        olympiad: round.olympiad,
        year: Number(m[1]),
        type: "Batch",
        url: `https://atcoder.jp/contests/${p.contest_id}/tasks/${p.id}`,
      });
    }
  }
  for (const round of JOI_ROUNDS) {
    console.log(`${round.olympiad}: ${problems.filter((p) => p.olympiad === round.olympiad).length} problems`);
  }
  return problems;
}

// FARIO problems from the ORAC archive (orac2.info).
async function fetchFario() {
  const html = await fetchText("https://orac2.info/hub/fario/");
  const problems = [];
  const setRe = /class="set-title[^"]*">FARIO (\d{4})<\/span>|<a href="\/problem\/(\d+)\/">([^<]+)<\/a>/g;
  let year = null;
  let m;
  while ((m = setRe.exec(html))) {
    if (m[1]) {
      year = Number(m[1]);
    } else if (year) {
      problems.push({
        id: `FARIO_${m[2]}`,
        title: decodeEntities(m[3]),
        olympiad: "FARIO",
        year,
        type: "Batch",
        url: `https://orac2.info/problem/${m[2]}/`,
      });
    }
  }
  console.log(`FARIO: ${problems.length} problems`);
  return problems;
}

// Chinese NOI problems from the LibreOJ archive (tag 90 = NOI).
async function fetchCnoi() {
  const problems = [];
  let skip = 0;
  let count = Infinity;
  while (skip < count) {
    const res = await fetch("https://api.loj.ac/api/problem/queryProblemSet", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locale: "en_US", skipCount: skip, takeCount: 100, tagIds: [90] }),
    });
    const data = await res.json();
    count = data.count;
    for (const r of data.result) {
      const m = r.title.match(/^[「[]NOI\s*(\d{4})[」\]]\s*(.*)$/);
      if (!m) continue; // skip mistagged non-NOI problems
      problems.push({
        id: `CNOI_${r.meta.displayId}`,
        title: m[2].trim(),
        olympiad: "CNOI",
        year: Number(m[1]),
        type: "Batch",
        url: `https://loj.ac/p/${r.meta.displayId}`,
      });
    }
    skip += 100;
    await sleep(400);
  }
  console.log(`CNOI: ${problems.length} problems`);
  return problems;
}

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

  problems.push(...(await fetchJoi()));
  problems.push(...(await fetchFario()));
  problems.push(...(await fetchUsaco()));
  problems.push(...(await fetchCnoi()));

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

  const groupRank = (p) => USACO_DIVISIONS[p.group] ?? 0;
  const idNum = (p) => Number(p.id.match(/^(?:USACO|CNOI|FARIO)_(\d+)$/)?.[1] ?? 0);
  problems.sort(
    (a, b) =>
      a.olympiad.localeCompare(b.olympiad) ||
      b.year - a.year ||
      groupRank(a) - groupRank(b) ||
      idNum(a) - idNum(b) ||
      a.id.localeCompare(b.id)
  );

  const outPath = join(__dirname, "..", "src", "data", "problems.json");
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, JSON.stringify(problems, null, 1));
  console.log(`Wrote ${problems.length} problems to ${outPath}`);
}

main();
