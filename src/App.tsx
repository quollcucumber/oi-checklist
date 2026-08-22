import { useEffect, useMemo, useRef, useState } from 'react'
import problemsData from './data/problems.json'
import type { Problem, StatusMap } from './types'
import { STATUS_CYCLE } from './types'
import OlympiadSection from './components/OlympiadSection'
import ProgressBar from './components/ProgressBar'
import CfSync from './components/CfSync'
import {
  exportData,
  importData,
  loadCfHandle,
  loadStatuses,
  loadTheme,
  saveCfHandle,
  saveStatuses,
  saveTheme,
} from './lib/storage'

const problems = problemsData as Problem[]

const OLYMPIADS: { key: string; fullName: string }[] = [
  { key: 'IOI', fullName: 'International Olympiad in Informatics' },
  { key: 'APIO', fullName: 'Asia-Pacific Informatics Olympiad' },
  { key: 'CEOI', fullName: 'Central European Olympiad in Informatics' },
  { key: 'Baltic OI', fullName: 'Baltic Olympiad in Informatics' },
  { key: 'JOI', fullName: 'Japanese Olympiad in Informatics' },
  { key: 'eJOI', fullName: 'European Junior Olympiad in Informatics' },
  { key: 'COI', fullName: 'Croatian Olympiad in Informatics' },
  { key: 'COCI', fullName: 'Croatian Open Competition in Informatics' },
  { key: 'EGOI', fullName: "European Girls' Olympiad in Informatics" },
  { key: 'USACO', fullName: 'USA Computing Olympiad' },
  { key: 'CNOI', fullName: 'China National Olympiad in Informatics' },
]

export default function App() {
  const [statuses, setStatuses] = useState<StatusMap>(loadStatuses)
  const [theme, setTheme] = useState<'dark' | 'light'>(loadTheme)
  const [search, setSearch] = useState('')
  const [hideSolved, setHideSolved] = useState(false)
  const [cfHandle, setCfHandle] = useState(loadCfHandle)
  const fileInput = useRef<HTMLInputElement>(null)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    saveTheme(theme)
  }, [theme])

  useEffect(() => {
    saveStatuses(statuses)
  }, [statuses])

  useEffect(() => {
    saveCfHandle(cfHandle)
  }, [cfHandle])

  const toggle = (id: string) => {
    setStatuses((prev) => ({ ...prev, [id]: STATUS_CYCLE[prev[id] ?? 'unsolved'] }))
  }

  const applyCfSolved = (solved: Set<string>): number => {
    let marked = 0
    setStatuses((prev) => {
      const next = { ...prev }
      for (const p of problems) {
        if (p.cf && solved.has(p.cf) && next[p.id] !== 'solved') {
          next[p.id] = 'solved'
          marked++
        }
      }
      return next
    })
    return marked
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return problems.filter((p) => {
      if (hideSolved && statuses[p.id] === 'solved') return false
      if (!q) return true
      return (
        p.title.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q) ||
        String(p.year).includes(q) ||
        p.olympiad.toLowerCase().includes(q)
      )
    })
  }, [search, hideSolved, statuses])

  const solvedTotal = problems.filter((p) => statuses[p.id] === 'solved').length
  const inProgressTotal = problems.filter((p) => statuses[p.id] === 'in-progress').length

  const handleExport = () => {
    const blob = new Blob([exportData()], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'oi-checklist.json'
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const handleImport = async (file: File) => {
    try {
      setStatuses(importData(await file.text()))
      setCfHandle(loadCfHandle())
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Import failed')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-gray-100">
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white/90 backdrop-blur dark:border-gray-800 dark:bg-gray-900/90">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold">OI Checklist</h1>
            <ProgressBar solved={solvedTotal} inProgress={inProgressTotal} total={problems.length} />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleExport}
              className="cursor-pointer rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
            >
              Export
            </button>
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              className="cursor-pointer rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
            >
              Import
            </button>
            <input
              ref={fileInput}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) handleImport(f)
                e.target.value = ''
              }}
            />
            <button
              type="button"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              title="Toggle dark mode"
              className="cursor-pointer rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
            >
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-5 px-4 py-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search problems…"
              className="w-56 rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-sm placeholder-gray-400 focus:border-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800"
            />
            <label className="flex cursor-pointer items-center gap-1.5 text-sm text-gray-600 dark:text-gray-300">
              <input
                type="checkbox"
                checked={hideSolved}
                onChange={(e) => setHideSolved(e.target.checked)}
                className="cursor-pointer accent-blue-600"
              />
              Hide solved
            </label>
          </div>
          <CfSync handle={cfHandle} onHandleChange={setCfHandle} onSynced={applyCfSolved} />
        </div>

        <p className="text-sm text-gray-500 dark:text-gray-400">
          Click a problem to cycle its status:{' '}
          <span className="rounded bg-gray-200 px-1.5 py-0.5 dark:bg-gray-800">unsolved</span> →{' '}
          <span className="rounded bg-amber-100 px-1.5 py-0.5 text-amber-900 dark:bg-amber-500/20 dark:text-amber-300">
            in progress
          </span>{' '}
          →{' '}
          <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-emerald-900 dark:bg-emerald-500/20 dark:text-emerald-300">
            solved
          </span>
          . Linking a Codeforces handle auto-marks problems with official CF mirrors. Progress is saved in your
          browser.
        </p>

        {OLYMPIADS.map(({ key, fullName }) => {
          const sectionProblems = filtered.filter((p) => p.olympiad === key)
          if (sectionProblems.length === 0) return null
          return (
            <OlympiadSection
              key={key}
              olympiad={key}
              fullName={fullName}
              problems={sectionProblems}
              statuses={statuses}
              onToggle={toggle}
            />
          )
        })}

        <footer className="pb-6 pt-2 text-center text-xs text-gray-400 dark:text-gray-500">
          Problem data from{' '}
          <a href="https://oj.uz" target="_blank" rel="noreferrer" className="underline hover:text-gray-600">
            oj.uz
          </a>
          ,{' '}
          <a
            href="https://usaco.org"
            target="_blank"
            rel="noreferrer"
            className="underline hover:text-gray-600"
          >
            usaco.org
          </a>
          , and{' '}
          <a href="https://loj.ac" target="_blank" rel="noreferrer" className="underline hover:text-gray-600">
            loj.ac
          </a>
          {' · '}Inspired by{' '}
          <a
            href="https://checklist.spoi.org.in/"
            target="_blank"
            rel="noreferrer"
            className="underline hover:text-gray-600"
          >
            checklist.spoi.org.in
          </a>
        </footer>
      </main>
    </div>
  )
}
