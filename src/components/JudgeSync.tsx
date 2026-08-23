import { useState } from 'react'
import { fetchCfSolved } from '../lib/codeforces'
import { fetchDmojResult, fetchOjuzResult, JUDGES, type JudgeKey, type JudgeResult } from '../lib/judges'
import type { HandleMap } from '../lib/storage'

interface Props {
  handles: HandleMap
  onHandlesChange: (handles: HandleMap) => void
  onSynced: (judge: JudgeKey, result: JudgeResult) => { solved: number; attempted: number }
}

async function fetchResult(judge: JudgeKey, handle: string): Promise<JudgeResult> {
  if (judge === 'codeforces') return { solved: await fetchCfSolved(handle), attempted: new Set() }
  if (judge === 'ojuz') return fetchOjuzResult(handle)
  return fetchDmojResult(handle)
}

export default function JudgeSync({ handles, onHandlesChange, onSynced }: Props) {
  const [judge, setJudge] = useState<JudgeKey>('codeforces')
  const [syncing, setSyncing] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState(false)

  const handle = handles[judge] ?? ''
  const label = JUDGES.find((j) => j.key === judge)?.label ?? judge

  const sync = async () => {
    if (!handle.trim()) return
    setSyncing(true)
    setMessage(null)
    setError(false)
    try {
      const result = await fetchResult(judge, handle.trim())
      const { solved, attempted } = onSynced(judge, result)
      const parts = []
      if (solved > 0) parts.push(`${solved} solved`)
      if (attempted > 0) parts.push(`${attempted} in progress`)
      setMessage(
        parts.length > 0
          ? `Marked ${parts.join(', ')} from ${label}`
          : `No new solved problems found on ${label}`,
      )
    } catch (e) {
      setError(true)
      setMessage(e instanceof Error ? e.message : 'Sync failed')
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        value={judge}
        onChange={(e) => {
          setJudge(e.target.value as JudgeKey)
          setMessage(null)
        }}
        className="cursor-pointer rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
      >
        {JUDGES.map((j) => (
          <option key={j.key} value={j.key}>
            {j.label}
          </option>
        ))}
      </select>
      <input
        type="text"
        value={handle}
        onChange={(e) => onHandlesChange({ ...handles, [judge]: e.target.value })}
        onKeyDown={(e) => e.key === 'Enter' && sync()}
        placeholder={`${label} handle`}
        className="w-40 rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
      />
      <button
        type="button"
        onClick={sync}
        disabled={syncing || !handle.trim()}
        className="cursor-pointer rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-default disabled:opacity-50"
      >
        {syncing ? 'Syncing…' : 'Sync'}
      </button>
      {message && (
        <span className={`text-sm ${error ? 'text-red-500' : 'text-emerald-600 dark:text-emerald-400'}`}>
          {message}
        </span>
      )}
    </div>
  )
}
