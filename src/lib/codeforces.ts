interface CfSubmission {
  verdict?: string
  problem: { contestId?: number; index: string }
}

interface CfResponse {
  status: string
  comment?: string
  result?: CfSubmission[]
}

/**
 * Fetch the set of problems ("contestId/index") a Codeforces user has solved,
 * using the public CORS-enabled Codeforces API.
 */
export async function fetchCfSolved(handle: string): Promise<Set<string>> {
  const res = await fetch(
    `https://codeforces.com/api/user.status?handle=${encodeURIComponent(handle)}`,
  )
  const data = (await res.json()) as CfResponse
  if (data.status !== 'OK' || !data.result) {
    throw new Error(data.comment ?? 'Codeforces API error')
  }
  const solved = new Set<string>()
  for (const sub of data.result) {
    if (sub.verdict === 'OK' && sub.problem.contestId !== undefined) {
      solved.add(`${sub.problem.contestId}/${sub.problem.index}`)
    }
  }
  return solved
}
