import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Status, StatusMap } from '../types'

// Supabase project config. Both values are public by design (access is
// controlled by Row Level Security). Set them to enable accounts + sync.
const SUPABASE_URL: string = ''
const SUPABASE_ANON_KEY: string = ''

export const syncEnabled = SUPABASE_URL !== '' && SUPABASE_ANON_KEY !== ''

let client: SupabaseClient | null = null

export function supabase(): SupabaseClient {
  if (!client) client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  return client
}

const STATUS_RANK: Record<Status, number> = { unsolved: 0, 'in-progress': 1, solved: 2 }

/** Merge two status maps, keeping the more advanced status for each problem. */
export function mergeStatuses(a: StatusMap, b: StatusMap): StatusMap {
  const merged: StatusMap = { ...a }
  for (const [id, status] of Object.entries(b)) {
    const cur = merged[id]
    if (!cur || STATUS_RANK[status] > STATUS_RANK[cur]) merged[id] = status
  }
  return merged
}

export async function fetchRemoteStatuses(userId: string): Promise<StatusMap> {
  const { data, error } = await supabase()
    .from('checklists')
    .select('statuses')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return (data?.statuses as StatusMap) ?? {}
}

export async function pushRemoteStatuses(userId: string, statuses: StatusMap): Promise<void> {
  const { error } = await supabase()
    .from('checklists')
    .upsert({ user_id: userId, statuses, updated_at: new Date().toISOString() })
  if (error) throw new Error(error.message)
}
