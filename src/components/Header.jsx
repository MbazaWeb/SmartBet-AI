import useAuth from '../context/useAuth'
import { NavLink } from 'react-router-dom'

function Header() {
  const { user, openAuth, signOut, loading, isConfigured } = useAuth()
  const userLabel = user?.email?.split('@')[0] || 'Analyst'

  return (
    <header className="sticky top-0 z-20 border-b border-white/10 bg-slate-950/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <div className="min-w-[180px]">
          <p className="data-label text-xs uppercase text-emerald-400/80">AI Match Intelligence</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-white sm:text-3xl">
            SmartBet AI
          </h1>
        </div>

        <nav className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 p-1 text-sm text-slate-300">
          <NavLink to="/" end className={({ isActive }) => [
            'rounded-full px-4 py-2 transition hover:bg-white/10 hover:text-white',
            isActive ? 'bg-white/10 text-white' : '',
          ].join(' ')}>
            Home
          </NavLink>
          <NavLink to="/results" className={({ isActive }) => [
            'rounded-full px-4 py-2 transition hover:bg-white/10 hover:text-white',
            isActive ? 'bg-white/10 text-white' : '',
          ].join(' ')}>
            Results
          </NavLink>
          <NavLink to="/prediction" className={({ isActive }) => [
            'rounded-full px-4 py-2 transition hover:bg-white/10 hover:text-white',
            isActive ? 'bg-white/10 text-white' : '',
          ].join(' ')}>
            Prediction
          </NavLink>
        </nav>

        <div className="hidden items-center gap-3 sm:flex">
          <div className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-4 py-2 text-right">
            <p className="data-label text-[11px] uppercase text-emerald-300/75">Signal</p>
            <p className="text-sm font-medium text-emerald-100">AI analysis + social feed</p>
          </div>

          {user ? (
            <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-2 py-2">
              <span className="px-3 text-sm text-slate-200">@{userLabel}</span>
              <button
                type="button"
                onClick={signOut}
                className="rounded-full border border-white/10 bg-slate-950/70 px-3 py-1 text-xs text-slate-200 transition hover:bg-white/10"
              >
                Sign out
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => openAuth('signin')}
              disabled={loading || !isConfigured}
              className="rounded-full border border-sky-400/25 bg-sky-500/10 px-4 py-2 text-sm font-medium text-sky-100 transition hover:bg-sky-500/15 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isConfigured ? 'Sign in' : 'Supabase not ready'}
            </button>
          )}
        </div>
      </div>
    </header>
  )
}

export default Header