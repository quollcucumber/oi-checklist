import { useState } from 'react'
import { fetchCfSolved } from '../lib/codeforces'

interface Props {
  handle: string
  onHandleChange: (handle: string) => void
  onSynced: (solved: Set<string>) => number
}

export default function CfSync({ handle, onHandleChange, onSynced }: Props) {
  const [syncing, setSyncing] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState(false)

  const sync = async () => {
    if (!handle.trim()) return
    setSyncing(true)
    setMessage(null)
    setError(false)
    try {
      const solved = await fetchCfSolved(handle.trim())
      const marked = onSynced(solved)
      setMessage(
        marked > 0
          ? `Marked ${marked} problem${marked === 1 ? '' : 's'} solved from Codeforces`
          : 'No new solved problems found on Codeforces',
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
      <input
        type="text"
        value={handle}
        onChange={(e) => onHandleChange(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && sync()}
        placeholder="Codeforces handle"
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
