import { useEffect, useMemo, useState } from 'react'
import AuthContext from './auth-context'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import { signIn, signUp } from '../api/authApi'

function AuthDialog({ mode, error, loading, onClose, onModeChange, onSubmit, isConfigured }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  function handleSubmit(event) {
    event.preventDefault()
    onSubmit({ email, password })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4 backdrop-blur-sm">
      <div className="glass-panel w-full max-w-md rounded-[30px] p-6 sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="data-label text-xs uppercase text-emerald-400/80">Community access</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">
              {mode === 'signup' ? 'Create your account' : 'Sign in to interact'}
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-400">
              Comments, replies, and live poll voting are locked until the user is authenticated.
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-slate-300">
            Close
          </button>
        </div>

        {!isConfigured ? (
          <div className="mt-6 rounded-2xl border border-amber-400/20 bg-amber-500/10 p-4 text-sm leading-6 text-amber-100">
            Supabase auth is not configured. Add the public URL and anon key in the environment to enable login.
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <label className="block rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300">
            <span className="data-label text-[11px] uppercase text-slate-400">Email</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-2 block w-full bg-transparent text-slate-100 outline-none placeholder:text-slate-500"
              placeholder="name@example.com"
              required
            />
          </label>

          <label className="block rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300">
            <span className="data-label text-[11px] uppercase text-slate-400">Password</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-2 block w-full bg-transparent text-slate-100 outline-none placeholder:text-slate-500"
              placeholder="Minimum 6 characters"
              minLength={6}
              required
            />
          </label>

          {error ? (
            <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={loading || !isConfigured}
            className="w-full rounded-full border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm font-medium text-emerald-200 transition hover:border-emerald-400/50 hover:bg-emerald-500/15 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? 'Working...' : mode === 'signup' ? 'Create account' : 'Sign in'}
          </button>
        </form>

        <div className="mt-4 text-sm text-slate-400">
          {mode === 'signup' ? 'Already have an account?' : 'Need an account?'}{' '}
          <button type="button" onClick={() => onModeChange(mode === 'signup' ? 'signin' : 'signup')} className="text-emerald-300">
            {mode === 'signup' ? 'Sign in' : 'Create one'}
          </button>
        </div>
      </div>
    </div>
  )
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [mode, setMode] = useState('signin')
  const [authError, setAuthError] = useState('')
  const [authPending, setAuthPending] = useState(false)

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return undefined
    }

    let mounted = true

    supabase.auth.getSession().then(({ data }) => {
      if (mounted) {
        setSession(data.session ?? null)
        setLoading(false)
      }
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setLoading(false)
      setDialogOpen(false)
      setAuthError('')
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  async function handleAuthSubmit({ email, password }) {
    if (!supabase) {
      setAuthError('Supabase auth is not configured.')
      return
    }

    setAuthPending(true)
    setAuthError('')

    const cleanEmail = email.trim().toLowerCase()
    const cleanPassword = password.trim()

    try {
      if (mode === 'signup') {
        const result = await signUp({ email: cleanEmail, password: cleanPassword })

        if (result.session?.access_token && result.session?.refresh_token) {
          const { error } = await supabase.auth.setSession(result.session)

          if (error) {
            throw error
          }

          return
        }

        setAuthError(result.message || 'Check your email to confirm the account, then sign in.')
      } else {
        const result = await signIn({ email: cleanEmail, password: cleanPassword })
        const { error } = await supabase.auth.setSession(result.session)

        if (error) {
          throw error
        }
      }
    } catch (error) {
      if (error.message === 'Failed to fetch') {
        setAuthError('Authentication request could not reach Supabase. Check your connection and confirm the Supabase project is available, then retry.')
      } else {
        setAuthError(error.message || 'Authentication failed.')
      }
    } finally {
      setAuthPending(false)
    }
  }

  async function signOut() {
    if (!supabase) {
      return
    }

    await supabase.auth.signOut()
  }

  function closeAuthDialog() {
    setDialogOpen(false)
    setAuthError('')
  }

  const value = useMemo(
    () => ({
      user: session?.user ?? null,
      session,
      loading,
      isConfigured: isSupabaseConfigured,
      openAuth: (nextMode = 'signin') => {
        setMode(nextMode)
        setAuthError('')
        setDialogOpen(true)
      },
      closeAuth: closeAuthDialog,
      signOut,
    }),
    [loading, session],
  )

  return (
    <AuthContext.Provider value={value}>
      {children}
      {dialogOpen ? (
        <AuthDialog
          key={mode}
          mode={mode}
          error={authError}
          loading={authPending}
          onClose={closeAuthDialog}
          onModeChange={setMode}
          onSubmit={handleAuthSubmit}
          isConfigured={isSupabaseConfigured}
        />
      ) : null}
    </AuthContext.Provider>
  )
}
