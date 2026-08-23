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
  { search: "balkan", olympiad: "Balkan OI", name: "Balkan Olympiad in Informatics", re: /^balkan(\d{2})_/i },
  { search: "INOI", olympiad: "INOI", name: "Iranian National Olympiad in Informatics", re: /^INOI(\d{2})_/ },
  { search: "info1cup", olympiad: "Info(1)Cup", name: "Info(1)Cup International Contest", re: /^info1cup(\d{2})_/ },
];

// AtCoder contest id -> JOI round (the full JOI archive lives on AtCoder).
const JOI_ROUNDS = [
  { olympiad: "JOI Final", re: /^joi(\d{4})(?:ho|final)$/ },
  { olympiad: "JOI Spring Camp", re: /^joi(?:sc|sp)(\d{4})(?:-day\d)?$/ },
  { olympiad: "JOI Open", re: /^joiopen(\d{4})[a-z]?$/ },
];

const GROUP_ORDER = { Bronze: 0, Silver: 1, Gold: 2, Platinum: 3, I: 0, II: 1, III: 2, Junior: 0, Senior: 1 };

const POI_STAGES = { 1: "I", 2: "II", 3: "III" };

// DMOJ mirror groups: parse problem names and match dataset problems by year + title.
const DMOJ_PATTERNS = [
  { group: "IOI", olympiad: "IOI", re: /^IOI '(\d{2}) P\d+ - (.+)$/ },
  { group: "CEOI", olympiad: "CEOI", re: /^CEOI '(\d{2}) P\d+ - (.+)$/ },
  { group: "JOI", olympiad: "JOI Open", re: /^JOI '(\d{2}) Open P\d+ - (.+)$/ },
  { group: "COCI", olympiad: "COCI", re: /^COCI '(\d{2}) Contest \d+ #\d+ (.+)$/ },
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

// Polish OI problems from the szkopul.edu.pl archive. Edition N finals are
// held in spring of year 1993+N (edition I was the 1993/94 school year).
async function fetchPoi() {
  const problems = [];
  let page = 1;
  let pages = 1;
  while (page <= pages) {
    const html = await fetchText(`https://szkopul.edu.pl/problemset/?origin=oi&page=${page}`);
    pages = maxPage(html);
    for (const row of html.split("<tbody>").pop().split("<tr>")) {
      const link = row.match(/\/problemset\/problem\/([\w-]+)\/site\/\s*"?\s*>\s*(.*?)\s*<\/a>/s);
      if (!link) continue;
      const edition = row.match(/\?origin=oi_(\d+)"/);
      if (!edition) continue;
      const stage = row.match(/\?origin=oi_e(\d)"/);
      problems.push({
        id: `POI_${link[1]}`,
        title: decodeEntities(link[2]),
        olympiad: "POI",
        year: 1993 + Number(edition[1]),
        type: "Batch",
        group: stage ? POI_STAGES[Number(stage[1])] : undefined,
        url: `https://szkopul.edu.pl/problemset/problem/${link[1]}/site/`,
      });
    }
    page++;
    await sleep(400);
  }
  console.log(`POI: ${problems.length} problems`);
  return problems;
}

// CCC and CCO problems straight from the DMOJ archive (also enables DMOJ sync).
const DMOJ_GROUPS = [
  { group: "CCC", olympiad: "CCC", re: /^CCC '(\d{2}) ([JS])\d+ - (.+)$/, divisions: { J: "Junior", S: "Senior" } },
  { group: "CCO", olympiad: "CCO", re: /^CCO '(\d{2}) P\d+ - (.+)$/ },
];

async function fetchDmojGroup({ group, olympiad, re, divisions }) {
  const problems = [];
  let page = 1;
  let hasMore = true;
  while (hasMore) {
    const data = JSON.parse(
      await fetchText(`https://dmoj.ca/api/v2/problems?group=${group}&page=${page}`)
    ).data;
    hasMore = data.has_more;
    page++;
    for (const obj of data.objects) {
      const m = obj.name.match(re);
      if (!m) continue;
      problems.push({
        id: obj.code,
        title: m[3] ?? m[2],
        olympiad,
        year: yearFrom2Digit(m[1]),
        type: "Batch",
        group: divisions ? divisions[m[2]] : undefined,
        url: `https://dmoj.ca/problem/${obj.code}`,
        dmoj: obj.code,
      });
    }
    await sleep(400);
  }
  console.log(`${olympiad}: ${problems.length} problems`);
  return problems;
}

// Attach DMOJ problem codes for DMOJ account sync by matching mirror names.
async function attachDmoj(problems) {
  const byKey = new Map();
  for (const p of problems) {
    byKey.set(`${p.olympiad}|${p.year}|${normalize(p.title)}`, p);
    // JOI titles are "日本語 (English)" — index the English part too.
    const en = p.title.match(/\(([^()]+)\)\s*$/);
    if (en) byKey.set(`${p.olympiad}|${p.year}|${normalize(en[1])}`, p);
  }
  let page = 1;
  let hasMore = true;
  let linked = 0;
  while (hasMore) {
    const data = JSON.parse(await fetchText(`https://dmoj.ca/api/v2/problems?page=${page}`)).data;
    hasMore = data.has_more;
    page++;
    for (const obj of data.objects) {
      const pattern = DMOJ_PATTERNS.find((pat) => pat.group === obj.group);
      if (!pattern) continue;
      const m = obj.name.match(pattern.re);
      if (!m) continue;
      const year = yearFrom2Digit(m[1]);
      // COCI seasons span two years, so also try the following year.
      for (const y of [year, year + 1]) {
        const match = byKey.get(`${pattern.olympiad}|${y}|${normalize(m[2])}`);
        if (match && !match.dmoj) {
          match.dmoj = obj.code;
          linked++;
          break;
        }
      }
    }
    await sleep(400);
  }
  console.log(`DMOJ-linked: ${linked} problems`);
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
  problems.push(...(await fetchPoi()));
  for (const g of DMOJ_GROUPS) problems.push(...(await fetchDmojGroup(g)));

  await attachDmoj(problems);

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

  const groupRank = (p) => GROUP_ORDER[p.group] ?? 0;
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
