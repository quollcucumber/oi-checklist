export interface Problem {
  id: string
  title: string
  olympiad: string
  year: number
  type: string
  url: string
  /** Codeforces problem id ("contestId/index") when a CF mirror exists. */
  cf?: string
}

export type Status = 'unsolved' | 'in-progress' | 'solved'

export type StatusMap = Record<string, Status>

export const STATUS_CYCLE: Record<Status, Status> = {
  unsolved: 'in-progress',
  'in-progress': 'solved',
  solved: 'unsolved',
}
