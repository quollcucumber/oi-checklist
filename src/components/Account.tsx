import { useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

interface Props {
  session: Session | null
  syncState: 'idle' | 'syncing' | 'synced' | 'error'
}

const inputCls =
  'w-44 rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-sm placeholder-gray-400 focus:border-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800'
const buttonCls =
  'cursor-pointer rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-100 disabled:cursor-default disabled:opacity-50 dark:border-gray-700 dark:hover:bg-gray-800'

export default function Account({ session, syncState }: Props) {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  const signIn = async (signUp: boolean) => {
    setBusy(true)
    setMessage('')
    try {
      const auth = supabase().auth
      const { error } = signUp
        ? await auth.signUp({ email, password })
        : await auth.signInWithPassword({ email, password })
      if (error) throw error
      setMessage(signUp ? 'Account created! Check your email if confirmation is required.' : '')
      if (!signUp) setOpen(false)
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setBusy(false)
    }
  }

  if (session) {
    return (
      <div className="flex items-center gap-2 text-sm">
        <span className="text-gray-500 dark:text-gray-400" title={session.user.email}>
          {session.user.email}
          {syncState === 'syncing' && ' · syncing…'}
          {syncState === 'synced' && ' · synced'}
          {syncState === 'error' && ' · sync error'}
        </span>
        <button type="button" onClick={() => supabase().auth.signOut()} className={buttonCls}>
          Sign out
        </button>
      </div>
    )
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className={buttonCls}>
        Sign in
      </button>
    )
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        autoComplete="email"
        className={inputCls}
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
        autoComplete="current-password"
        className={inputCls}
      />
      <button type="button" onClick={() => signIn(false)} disabled={busy || !email || !password} className={buttonCls}>
        Sign in
      </button>
      <button type="button" onClick={() => signIn(true)} disabled={busy || !email || !password} className={buttonCls}>
        Sign up
      </button>
      <button type="button" onClick={() => setOpen(false)} className={buttonCls}>
        ✕
      </button>
      {message && <span className="text-xs text-amber-600 dark:text-amber-400">{message}</span>}
    </div>
  )
}
