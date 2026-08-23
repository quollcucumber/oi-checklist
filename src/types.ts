export interface Problem {
  id: string
  title: string
  olympiad: string
  year: number
  type: string
  url: string
  /** Sub-division within a year (e.g. USACO Bronze/Silver/Gold/Platinum). */
  group?: string
  /** Codeforces problem id ("contestId/index") when a CF mirror exists. */
  cf?: string
  /** DMOJ problem code when a DMOJ mirror exists. */
  dmoj?: string
}

export type Status = 'unsolved' | 'in-progress' | 'solved'

export type StatusMap = Record<string, Status>

export const STATUS_CYCLE: Record<Status, Status> = {
  unsolved: 'in-progress',
  'in-progress': 'solved',
  solved: 'unsolved',
}
