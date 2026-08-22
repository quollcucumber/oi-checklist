import { useMemo, useState } from 'react'
import type { Problem, Status, StatusMap } from '../types'
import ProblemChip from './ProblemChip'
import ProgressBar from './ProgressBar'

interface Props {
  olympiad: string
  fullName: string
  problems: Problem[]
  statuses: StatusMap
  onToggle: (id: string) => void
}

export default function OlympiadSection({ olympiad, fullName, problems, statuses, onToggle }: Props) {
  const [collapsed, setCollapsed] = useState(false)

  const byYear = useMemo(() => {
    const map = new Map<number, Problem[]>()
    for (const p of problems) {
      const list = map.get(p.year) ?? []
      list.push(p)
      map.set(p.year, list)
    }
    return [...map.entries()].sort((a, b) => b[0] - a[0])
  }, [problems])

  const statusOf = (p: Problem): Status => statuses[p.id] ?? 'unsolved'
  const solved = problems.filter((p) => statusOf(p) === 'solved').length
  const inProgress = problems.filter((p) => statusOf(p) === 'in-progress').length

  return (
    <section className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <button
        type="button"
        onClick={() => setCollapsed(!collapsed)}
        className="flex w-full cursor-pointer flex-wrap items-center justify-between gap-3 px-5 py-4 text-left"
      >
        <div className="flex items-center gap-2">
          <span className={`text-gray-400 transition-transform ${collapsed ? '' : 'rotate-90'}`}>▸</span>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{olympiad}</h2>
          <span className="hidden text-sm text-gray-400 sm:inline dark:text-gray-500">{fullName}</span>
        </div>
        <ProgressBar solved={solved} inProgress={inProgress} total={problems.length} />
      </button>
      {!collapsed && (
        <div className="border-t border-gray-100 px-5 py-4 dark:border-gray-800">
          <div className="space-y-3">
            {byYear.map(([year, yearProblems]) => {
              const groups: { group?: string; items: Problem[] }[] = []
              for (const p of yearProblems) {
                const last = groups[groups.length - 1]
                if (last && last.group === p.group) last.items.push(p)
                else groups.push({ group: p.group, items: [p] })
              }
              return (
                <div key={year} className="flex items-start gap-4">
                  <div className="w-12 shrink-0 pt-1.5 text-sm font-semibold tabular-nums text-gray-500 dark:text-gray-400">
                    {year}
                  </div>
                  <div className="flex flex-1 flex-col gap-2">
                    {groups.map(({ group, items }, i) => (
                      <div key={group ?? i} className="flex flex-wrap items-center gap-2">
                        {group && (
                          <span className="w-16 shrink-0 text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
                            {group}
                          </span>
                        )}
                        {items.map((p) => (
                          <ProblemChip key={p.id} problem={p} status={statusOf(p)} onToggle={() => onToggle(p.id)} />
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </section>
  )
}
