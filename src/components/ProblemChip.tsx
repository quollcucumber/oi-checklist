import type { Problem, Status } from '../types'

interface Props {
  problem: Problem
  status: Status
  onToggle: () => void
}

const STATUS_STYLES: Record<Status, string> = {
  unsolved:
    'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700',
  'in-progress':
    'bg-amber-100 text-amber-900 hover:bg-amber-200 dark:bg-amber-500/20 dark:text-amber-300 dark:hover:bg-amber-500/30',
  solved:
    'bg-emerald-100 text-emerald-900 hover:bg-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:hover:bg-emerald-500/30',
}

const STATUS_LABELS: Record<Status, string> = {
  unsolved: 'unsolved',
  'in-progress': 'in progress',
  solved: 'solved',
}

export default function ProblemChip({ problem, status, onToggle }: Props) {
  return (
    <div
      className={`group inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm transition-colors ${STATUS_STYLES[status]}`}
    >
      <button
        type="button"
        onClick={onToggle}
        title={`${problem.title} — ${STATUS_LABELS[status]} (click to change)`}
        className="cursor-pointer font-medium"
      >
        {problem.title}
      </button>
      <a
        href={problem.url}
        target="_blank"
        rel="noreferrer"
        title={`Open ${problem.id} on oj.uz`}
        className="text-gray-400 opacity-60 transition-opacity hover:text-blue-500 group-hover:opacity-100 dark:text-gray-500"
        aria-label={`Open ${problem.title} on oj.uz`}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
          <path d="M15 3h6v6" />
          <path d="M10 14 21 3" />
        </svg>
      </a>
    </div>
  )
}
