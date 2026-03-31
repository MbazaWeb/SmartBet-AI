import { useEffect, useMemo, useState, useCallback, useRef } from 'react'
import AuthContext from './auth-context'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import { signIn, signUp, resetPassword } from '../api/authApi'

const SESSION_TIMEOUT_MS = 30 * 60 * 1000

// Enhanced Auth Dialog with password reset and better UX
function AuthDialog({ mode, error, loading, onClose, onModeChange, onSubmit, isConfigured }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showResetPassword, setShowResetPassword] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [resetLoading, setResetLoading] = useState(false)
  const [resetSuccess, setResetSuccess] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [touched, setTouched] = useState({ email: false, password: false })

  // Validation
  const emailError = touched.email && email && !/^[^\s@]+@([^\s@]+\.)+[^\s@]+$/.test(email)
    ? 'Please enter a valid email address'
    : null

  const passwordError = touched.password && mode === 'signup' && password && password.length < 6
    ? 'Password must be at least 6 characters'
    : null

  const confirmPasswordError = touched.password && mode === 'signup' && password !== confirmPassword
    ? 'Passwords do not match'
    : null

  const handleResetPassword = async (e) => {
    e.preventDefault()
    if (!resetEmail.trim()) return

    setResetLoading(true)
    try {
      await resetPassword(resetEmail)
      setResetSuccess(true)
      setTimeout(() => {
        setShowResetPassword(false)
        setResetSuccess(false)
        setResetEmail('')
      }, 3000)
    } catch (error) {
      // Error is handled by resetPassword function
      console.error('Password reset failed:', error)
    } finally {
      setResetLoading(false)
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (mode === 'signup' && password !== confirmPassword) return
    onSubmit({ email, password })
  }

  if (showResetPassword) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4 backdrop-blur-sm">
        <div className="glass-panel w-full max-w-md rounded-[30px] p-6 sm:p-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="data-label text-xs uppercase text-emerald-400/80">Reset password</p>
              <h2 className="mt-2 text-2xl font-semibold text-white">Reset your password</h2>
              <p className="mt-3 text-sm leading-6 text-slate-400">
                Enter your email address and we'll send you a link to reset your password.
              </p>
            </div>
            <button 
              type="button" 
              onClick={() => {
                setShowResetPassword(false)
                setResetSuccess(false)
                setResetEmail('')
              }} 
              className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-slate-300 hover:bg-white/10 transition"
            >
              Back
            </button>
          </div>

          {resetSuccess ? (
            <div className="mt-6 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-4 text-sm text-emerald-100">
              Password reset email sent! Check your inbox for instructions.
            </div>
          ) : (
            <form onSubmit={handleResetPassword} className="mt-6 space-y-4">
              <label className="block rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300 focus-within:border-emerald-400/30 transition">
                <span className="data-label text-[11px] uppercase text-slate-400">Email</span>
                <input
                  type="email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  className="mt-2 block w-full bg-transparent text-slate-100 outline-none placeholder:text-slate-500"
                  placeholder="name@example.com"
                  required
                  autoFocus
                />
              </label>

              <button
                type="submit"
                disabled={resetLoading || !resetEmail.trim()}
                className="w-full rounded-full border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm font-medium text-emerald-200 transition hover:bg-emerald-500/15 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {resetLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Sending...
                  </span>
                ) : (
                  'Send reset link'
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4 backdrop-blur-sm">
      <div 
        className="glass-panel w-full max-w-md rounded-[30px] p-6 sm:p-7 animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="data-label text-xs uppercase text-emerald-400/80">Community access</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">
              {mode === 'signup' ? 'Create your account' : 'Sign in to interact'}
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-400">
              {mode === 'signup' 
                ? 'Join the community to comment, like, and vote on predictions.' 
                : 'Comments, replies, and live poll voting are locked until the user is authenticated.'}
            </p>
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-slate-300 hover:bg-white/10 transition"
            aria-label="Close dialog"
          >
            ✕
          </button>
        </div>

        {!isConfigured && (
          <div className="mt-6 rounded-2xl border border-amber-400/20 bg-amber-500/10 p-4 text-sm leading-6 text-amber-100">
            <div className="flex items-start gap-2">
              <span className="text-amber-400">⚠️</span>
              <p>Supabase auth is not configured. Add the public URL and anon key in the environment to enable login.</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {/* Email Field */}
          <label className="block rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300 focus-within:border-emerald-400/30 transition">
            <span className="data-label text-[11px] uppercase text-slate-400">Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => setTouched(prev => ({ ...prev, email: true }))}
              className="mt-2 block w-full bg-transparent text-slate-100 outline-none placeholder:text-slate-500"
              placeholder="name@example.com"
              required
              autoFocus
            />
          </label>
          {emailError && (
            <p className="text-xs text-rose-400 mt-1">{emailError}</p>
          )}

          {/* Password Field */}
          <label className="block rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300 focus-within:border-emerald-400/30 transition">
            <div className="flex items-center justify-between">
              <span className="data-label text-[11px] uppercase text-slate-400">Password</span>
              {mode === 'signin' && (
                <button
                  type="button"
                  onClick={() => setShowResetPassword(true)}
                  className="text-[10px] text-emerald-400 hover:text-emerald-300 transition"
                >
                  Forgot password?
                </button>
              )}
            </div>
            <div className="relative mt-2">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onBlur={() => setTouched(prev => ({ ...prev, password: true }))}
                className="block w-full bg-transparent text-slate-100 outline-none placeholder:text-slate-500 pr-8"
                placeholder={mode === 'signup' ? 'Minimum 6 characters' : 'Enter your password'}
                minLength={6}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-0 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
          </label>
          {passwordError && (
            <p className="text-xs text-rose-400 mt-1">{passwordError}</p>
          )}

          {/* Confirm Password (signup only) */}
          {mode === 'signup' && (
            <>
              <label className="block rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300 focus-within:border-emerald-400/30 transition">
                <span className="data-label text-[11px] uppercase text-slate-400">Confirm Password</span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="mt-2 block w-full bg-transparent text-slate-100 outline-none placeholder:text-slate-500"
                  placeholder="Confirm your password"
                  required
                />
              </label>
              {confirmPasswordError && (
                <p className="text-xs text-rose-400 mt-1">{confirmPasswordError}</p>
              )}
            </>
          )}

          {/* Error Message */}
          {error && (
            <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100 animate-shake">
              <div className="flex items-start gap-2">
                <span>⚠️</span>
                <p>{error}</p>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || !isConfigured || (mode === 'signup' && (passwordError || confirmPasswordError))}
            className="w-full rounded-full border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm font-medium text-emerald-200 transition hover:bg-emerald-500/15 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {mode === 'signup' ? 'Creating account...' : 'Signing in...'}
              </span>
            ) : (
              mode === 'signup' ? 'Create account' : 'Sign in'
            )}
          </button>
        </form>

        {/* Mode Toggle */}
        <div className="mt-4 text-center text-sm text-slate-400">
          {mode === 'signup' ? 'Already have an account?' : 'Need an account?'}{' '}
          <button 
            type="button" 
            onClick={() => {
              onModeChange(mode === 'signup' ? 'signin' : 'signup')
              setPassword('')
              setConfirmPassword('')
              setTouched({ email: false, password: false })
            }} 
            className="text-emerald-400 hover:text-emerald-300 transition font-medium"
          >
            {mode === 'signup' ? 'Sign in' : 'Create one'}
          </button>
        </div>

        {/* Terms and Privacy */}
        {mode === 'signup' && (
          <p className="mt-4 text-center text-[11px] text-slate-500">
            By signing up, you agree to our{' '}
            <button type="button" className="text-emerald-400 hover:text-emerald-300 transition">
              Terms
            </button>
            {' '}and{' '}
            <button type="button" className="text-emerald-400 hover:text-emerald-300 transition">
              Privacy Policy
            </button>
          </p>
        )}
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
  const [lastActivity, setLastActivity] = useState(Date.now())
  const activityTimeoutRef = useRef(null)

  const signOut = useCallback(async () => {
    if (!supabase) return

    try {
      await supabase.auth.signOut()
    } catch (error) {
      console.error('Sign out error:', error)
    }
  }, [])

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return undefined
    }

    let mounted = true

    // Get initial session
    supabase.auth.getSession().then(({ data }) => {
      if (mounted) {
        setSession(data.session ?? null)
        setLoading(false)
        if (data.session) {
          setLastActivity(Date.now())
        }
      }
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (mounted) {
        setSession(nextSession)
        setLoading(false)
        setDialogOpen(false)
        setAuthError('')
        if (nextSession) {
          setLastActivity(Date.now())
        }
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
      if (activityTimeoutRef.current) {
        clearInterval(activityTimeoutRef.current)
      }
    }
  }, [])

  // Track user activity to prevent session timeout
  useEffect(() => {
    if (!session) return

    const resetActivityTimer = () => {
      setLastActivity(Date.now())
      if (activityTimeoutRef.current) {
        clearTimeout(activityTimeoutRef.current)
      }
    }

    const checkInactivity = () => {
      const inactiveTime = Date.now() - lastActivity
      if (inactiveTime >= SESSION_TIMEOUT_MS) {
        signOut()
      }
    }

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart']
    events.forEach(event => window.addEventListener(event, resetActivityTimer))
    
    activityTimeoutRef.current = setInterval(checkInactivity, 60000)

    return () => {
      events.forEach(event => window.removeEventListener(event, resetActivityTimer))
      if (activityTimeoutRef.current) {
        clearInterval(activityTimeoutRef.current)
      }
    }
  }, [lastActivity, session, signOut])

  const handleAuthSubmit = useCallback(async ({ email, password }) => {
    if (!supabase) {
      setAuthError('Supabase auth is not configured.')
      return
    }

    setAuthPending(true)
    setAuthError('')

    const cleanEmail = email.trim().toLowerCase()
    const cleanPassword = password.trim()

    try {
      let result
      if (mode === 'signup') {
        result = await signUp({ email: cleanEmail, password: cleanPassword })

        if (result.session?.access_token && result.session?.refresh_token) {
          const { error } = await supabase.auth.setSession(result.session)
          if (error) throw error
          return
        }

        setAuthError(result.message || 'Check your email to confirm the account, then sign in.')
      } else {
        result = await signIn({ email: cleanEmail, password: cleanPassword })
        const { error } = await supabase.auth.setSession(result.session)
        if (error) throw error
      }
    } catch (error) {
      if (error.message === 'Failed to fetch') {
        setAuthError('Authentication request could not reach Supabase. Check your connection and confirm the Supabase project is available, then retry.')
      } else if (error.message.includes('Invalid login credentials')) {
        setAuthError('Invalid email or password. Please try again.')
      } else if (error.message.includes('Email not confirmed')) {
        setAuthError('Please confirm your email address before signing in. Check your inbox for the confirmation link.')
      } else {
        setAuthError(error.message || 'Authentication failed.')
      }
    } finally {
      setAuthPending(false)
    }
  }, [mode])

  const refreshSession = useCallback(async () => {
    if (!supabase) return null
    
    try {
      const { data, error } = await supabase.auth.refreshSession()
      if (error) throw error
      setSession(data.session)
      return data.session
    } catch (error) {
      console.error('Session refresh error:', error)
      return null
    }
  }, [])

  const openAuth = useCallback((nextMode = 'signin') => {
    setMode(nextMode)
    setAuthError('')
    setDialogOpen(true)
  }, [])

  const closeAuth = useCallback(() => {
    setDialogOpen(false)
    setAuthError('')
  }, [])

  const value = useMemo(
    () => ({
      user: session?.user ?? null,
      session,
      loading,
      isConfigured: isSupabaseConfigured,
      openAuth,
      closeAuth,
      signOut,
      refreshSession,
    }),
    [loading, session, openAuth, closeAuth, signOut, refreshSession],
  )

  return (
    <AuthContext.Provider value={value}>
      {children}
      {dialogOpen && (
        <AuthDialog
          key={`${mode}-${dialogOpen}`}
          mode={mode}
          error={authError}
          loading={authPending}
          onClose={closeAuth}
          onModeChange={setMode}
          onSubmit={handleAuthSubmit}
          isConfigured={isSupabaseConfigured}
        />
      )}
    </AuthContext.Provider>
  )
}