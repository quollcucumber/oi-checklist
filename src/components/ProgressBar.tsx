interface Props {
  solved: number
  inProgress: number
  total: number
}

export default function ProgressBar({ solved, inProgress, total }: Props) {
  const solvedPct = total === 0 ? 0 : (solved / total) * 100
  const inProgressPct = total === 0 ? 0 : (inProgress / total) * 100
  return (
    <div className="flex items-center gap-3">
      <div className="h-2.5 w-40 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700 sm:w-56">
        <div className="flex h-full">
          <div className="h-full bg-emerald-500 transition-all" style={{ width: `${solvedPct}%` }} />
          <div className="h-full bg-amber-400 transition-all" style={{ width: `${inProgressPct}%` }} />
        </div>
      </div>
      <span className="whitespace-nowrap text-sm tabular-nums text-gray-500 dark:text-gray-400">
        {solved} / {total}
      </span>
    </div>
  )
}
