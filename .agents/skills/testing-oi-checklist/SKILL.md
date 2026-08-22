---
name: testing-oi-checklist
description: How to run and end-to-end test the OI Checklist app (Vite dev server, localStorage state, Codeforces sync)
---

# Testing the OI Checklist app

## Run
- `npm run dev` → http://localhost:5173. If vite fails with "Cannot find native binding", the npm optional-deps bug hit; run:
  `npm install --no-save @rolldown/binding-linux-x64-gnu@$(node -p "require('rolldown/package.json').version") @oxlint/binding-linux-x64-gnu@$(node -p "require('oxlint/package.json').version")`

## State
- All state is in localStorage keys `oi-checklist:statuses`, `oi-checklist:cf-handle`, `oi-checklist:theme`. Clear localStorage for a fresh 0/411 start.
- Dataset: src/data/problems.json — 411 problems (IOI 152, APIO 46, CEOI 109, Baltic OI 104); exactly 17 have a `cf` field (CEOI 2019: 1192/*, 1193/*; CEOI 2020: 1402/*, 1403/*; Baltic OI 2020: 1386/*, 1387/A+C).

## Codeforces sync
- Handle `Benq` (verified via CF API) has solved 16 of the 17 mirrors — everything except 1387/A (BOI20_graph). Expect "Marked 16 problems solved from Codeforces" from a clean state, and BOI20 "Graph" staying gray.
- `tourist` has solved 0 mirrors → "No new solved problems found on Codeforces".
- Nonexistent handle (≤24 chars, e.g. `nosuchuserxyz987`) → red inline "User with handle ... not found". Handles >24 chars trigger a CF field-length error instead.
- Pressing Enter in the handle input also triggers sync — more reliable than clicking the Sync button if unsure of coordinates.
- Verify sync requests fired with `performance.getEntriesByType('resource').filter(r=>r.name.includes('codeforces'))` if a click may have missed.

## Export/Import
- Export downloads `oi-checklist.json` to ~/Downloads (shape: `{"statuses": {...}, "cfHandle": "..."}`).
- Import of invalid JSON shows a native `alert()` (must dismiss) and leaves state untouched.

## Gotchas
- Clicking a chip's external-link icon opens oj.uz in a new tab and must NOT cycle the status; the icon is a small target at the chip's right edge — zoom first to get coordinates.
- `ctrl+Home`/`End` only scroll when page (not an input) has focus; prefer mouse scroll.
