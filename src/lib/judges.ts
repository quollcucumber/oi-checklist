import type { Problem } from '../types'

/**
 * oj.uz and DMOJ don't send CORS headers, so fall back to public CORS
 * proxies when a direct fetch fails.
 */
const PROXIES: ((url: string) => string)[] = [
  (url) => url,
  (url) => `https://corsproxy.io/?url=${encodeURIComponent(url)}`,
  (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  (url) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
]

async function fetchViaProxy(url: string): Promise<string> {
  let lastError: Error | null = null
  for (const proxy of PROXIES) {
    try {
      const res = await fetch(proxy(url))
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return await res.text()
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e))
    }
  }
  throw lastError ?? new Error('Fetch failed')
}

export interface JudgeResult {
  solved: Set<string>
  attempted: Set<string>
}

/**
 * Scrape an oj.uz profile page, whose "Solved problems" and "Submitted but
 * unsolved problems" panels list problem aliases (which are this app's
 * problem ids for all oj.uz-sourced olympiads).
 */
export async function fetchOjuzResult(handle: string): Promise<JudgeResult> {
  const html = await fetchViaProxy(`https://oj.uz/profile/${encodeURIComponent(handle)}`)
  const solvedAt = html.indexOf('Solved problems')
  if (solvedAt === -1) throw new Error(`oj.uz profile "${handle}" not found`)
  const attemptedAt = html.indexOf('Submitted but unsolved problems')
  const aliases = (segment: string) =>
    new Set([...segment.matchAll(/problem\/view\/([A-Za-z0-9_]+)"/g)].map((m) => m[1]))
  const solvedEnd = attemptedAt === -1 ? html.length : attemptedAt
  return {
    solved: aliases(html.slice(solvedAt, solvedEnd)),
    attempted: attemptedAt === -1 ? new Set() : aliases(html.slice(attemptedAt)),
  }
}

interface DmojUserResponse {
  data?: { object?: { solved_problems?: string[] } }
  error?: { message?: string }
}

/** Fetch the set of DMOJ problem codes a user has fully solved via the public DMOJ API. */
export async function fetchDmojResult(handle: string): Promise<JudgeResult> {
  const text = await fetchViaProxy(`https://dmoj.ca/api/v2/user/${encodeURIComponent(handle)}`)
  const data = JSON.parse(text) as DmojUserResponse
  const codes = data.data?.object?.solved_problems
  if (!codes) throw new Error(data.error?.message ?? `DMOJ user "${handle}" not found`)
  return { solved: new Set(codes), attempted: new Set() }
}

export type JudgeKey = 'codeforces' | 'ojuz' | 'dmoj'

export const JUDGES: { key: JudgeKey; label: string; matcher: (p: Problem) => string | undefined }[] = [
  { key: 'codeforces', label: 'Codeforces', matcher: (p) => p.cf },
  { key: 'ojuz', label: 'oj.uz', matcher: (p) => (p.url.startsWith('https://oj.uz/') ? p.id : undefined) },
  { key: 'dmoj', label: 'DMOJ', matcher: (p) => p.dmoj },
]
