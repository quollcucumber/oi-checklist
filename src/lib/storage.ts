import type { StatusMap } from '../types'

const STATUS_KEY = 'oi-checklist:statuses'
const CF_HANDLE_KEY = 'oi-checklist:cf-handle'
const THEME_KEY = 'oi-checklist:theme'

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

export function loadCfHandle(): string {
  return localStorage.getItem(CF_HANDLE_KEY) ?? ''
}

export function saveCfHandle(handle: string) {
  localStorage.setItem(CF_HANDLE_KEY, handle)
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
  return JSON.stringify({ statuses: loadStatuses(), cfHandle: loadCfHandle() }, null, 2)
}

export function importData(json: string): StatusMap {
  const parsed = JSON.parse(json) as { statuses?: StatusMap; cfHandle?: string }
  if (!parsed.statuses || typeof parsed.statuses !== 'object') {
    throw new Error('Invalid file: missing "statuses"')
  }
  saveStatuses(parsed.statuses)
  if (typeof parsed.cfHandle === 'string') saveCfHandle(parsed.cfHandle)
  return parsed.statuses
}
