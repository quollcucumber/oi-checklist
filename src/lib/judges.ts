import type { Problem } from '../types'

/**
 * oj.uz and DMOJ don't send CORS headers, so fall back to public CORS
 * proxies when a direct fetch fails. Which proxies can reach which site
 * varies (e.g. dmoj.ca blocks corsproxy.io but r.jina.ai gets through,
 * while r.jina.ai truncates oj.uz's large HTML tables), so each judge
 * gets its own ordered list.
 */
type Proxy = (url: string) => string

const direct: Proxy = (url) => url
const corsproxy: Proxy = (url) => `https://corsproxy.io/?url=${encodeURIComponent(url)}`
const jina: Proxy = (url) => `https://r.jina.ai/${url}`
const allorigins: Proxy = (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`

const OJUZ_PROXIES = [direct, corsproxy, allorigins]
const DMOJ_PROXIES = [direct, jina, corsproxy, allorigins]

async function fetchViaProxy(url: string, proxies: Proxy[]): Promise<string> {
  let lastError: Error | null = null
  for (const proxy of proxies) {
    try {
      const res = await fetch(proxy(url))
      // A 404 relayed by any proxy means the resource itself is missing.
      if (res.status === 404) throw new Error('HTTP 404')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return await res.text()
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e))
      if (isNotFound(lastError)) throw lastError
    }
  }
  throw lastError ?? new Error('Fetch failed')
}

const isNotFound = (e: unknown) => e instanceof Error && e.message.includes('404')

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
  let html: string
  try {
    html = await fetchViaProxy(`https://oj.uz/profile/${encodeURIComponent(handle)}`, OJUZ_PROXIES)
  } catch (e) {
    if (isNotFound(e)) throw new Error(`oj.uz profile "${handle}" not found`)
    throw new Error(`Couldn't reach oj.uz — try again later`)
  }
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
  let text: string
  try {
    text = await fetchViaProxy(`https://dmoj.ca/api/v2/user/${encodeURIComponent(handle)}`, DMOJ_PROXIES)
  } catch (e) {
    if (isNotFound(e)) throw new Error(`DMOJ user "${handle}" not found`)
    throw new Error(`Couldn't reach DMOJ — try again later`)
  }
  // Some proxies (r.jina.ai) wrap the response in prose; extract the JSON object.
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start === -1 || end === -1) throw new Error(`DMOJ user "${handle}" not found`)
  const data = JSON.parse(text.slice(start, end + 1)) as DmojUserResponse
  const codes = data.data?.object?.solved_problems
  if (!codes) {
    const msg = data.error?.message
    // DMOJ's raw 404 message is "page/object not found".
    if (!msg || msg.includes('not found')) throw new Error(`DMOJ user "${handle}" not found`)
    throw new Error(msg)
  }
  return { solved: new Set(codes), attempted: new Set() }
}

export type JudgeKey = 'codeforces' | 'ojuz' | 'dmoj'

export const JUDGES: { key: JudgeKey; label: string; matcher: (p: Problem) => string | undefined }[] = [
  { key: 'codeforces', label: 'Codeforces', matcher: (p) => p.cf },
  { key: 'ojuz', label: 'oj.uz', matcher: (p) => (p.url.startsWith('https://oj.uz/') ? p.id : undefined) },
  { key: 'dmoj', label: 'DMOJ', matcher: (p) => p.dmoj },
]
