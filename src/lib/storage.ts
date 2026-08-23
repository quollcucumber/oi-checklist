import type { StatusMap } from '../types'
import type { JudgeKey } from './judges'

const STATUS_KEY = 'oi-checklist:statuses'
const CF_HANDLE_KEY = 'oi-checklist:cf-handle'
const HANDLES_KEY = 'oi-checklist:handles'
const THEME_KEY = 'oi-checklist:theme'

export type HandleMap = Partial<Record<JudgeKey, string>>

export function loadStatuses(): StatusMap {
  try {
    return JSON.parse(localStorage.getItem(STATUS_KEY) ?? '{}') as StatusMap
  } catch {
    return {}
  }
}

export function saveStatuses(statuses: StatusMap) {
  localStorage.setItem(STATUS_KEY, JSON.stringify(statuses))
}

export function loadHandles(): HandleMap {
  try {
    const handles = JSON.parse(localStorage.getItem(HANDLES_KEY) ?? '{}') as HandleMap
    const legacyCf = localStorage.getItem(CF_HANDLE_KEY)
    if (legacyCf && !handles.codeforces) handles.codeforces = legacyCf
    return handles
  } catch {
    return {}
  }
}

export function saveHandles(handles: HandleMap) {
  localStorage.setItem(HANDLES_KEY, JSON.stringify(handles))
}

export function loadTheme(): 'dark' | 'light' {
  const stored = localStorage.getItem(THEME_KEY)
  if (stored === 'dark' || stored === 'light') return stored
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function saveTheme(theme: 'dark' | 'light') {
  localStorage.setItem(THEME_KEY, theme)
}

export function exportData(): string {
  return JSON.stringify({ statuses: loadStatuses(), handles: loadHandles() }, null, 2)
}

export function importData(json: string): StatusMap {
  const parsed = JSON.parse(json) as { statuses?: StatusMap; handles?: HandleMap; cfHandle?: string }
  if (!parsed.statuses || typeof parsed.statuses !== 'object') {
    throw new Error('Invalid file: missing "statuses"')
  }
  saveStatuses(parsed.statuses)
  const handles = parsed.handles ?? {}
  if (typeof parsed.cfHandle === 'string' && !handles.codeforces) handles.codeforces = parsed.cfHandle
  saveHandles(handles)
  return parsed.statuses
}
