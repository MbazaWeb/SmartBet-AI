import useAuth from '../context/useAuth'
import { NavLink } from 'react-router-dom'
import { loadPredictionRoute, loadResultsRoute } from '../lib/routeLoader'

const navItems = [
  { to: '/', label: 'Home' },
  { to: '/results', label: 'Results', preload: loadResultsRoute },
  { to: '/prediction', label: 'Prediction', preload: loadPredictionRoute },
]

function Header() {
  const { user, openAuth, signOut, loading, isConfigured } = useAuth()
  const userLabel = user?.email?.split('@')[0] || 'Analyst'

  const handleNavIntent = (preload) => {
    preload?.()
  }

  return (
    <header className="sticky top-0 z-20 border-b border-white/10 bg-slate-950/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <div className="min-w-0 flex-1">
          <p className="data-label text-xs uppercase text-emerald-400/80">AI Match Intelligence</p>
          <h1 className="mt-1 text-xl font-bold tracking-tight text-white sm:text-3xl">
            SmartBet AI
          </h1>
        </div>

        <div className="flex items-center gap-2 sm:ml-auto sm:gap-3">
          <div className="hidden rounded-full border border-emerald-400/20 bg-emerald-500/10 px-4 py-2 text-right lg:block">
            <p className="data-label text-[11px] uppercase text-emerald-300/75">Signal</p>
            <p className="text-sm font-medium text-emerald-100">AI analysis + social feed</p>
          </div>

          {user ? (
            <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-2 py-2">
              <span className="hidden px-3 text-sm text-slate-200 sm:inline">@{userLabel}</span>
              <button
                type="button"
                onClick={signOut}
                className="rounded-full border border-white/10 bg-slate-950/70 px-3 py-2 text-xs text-slate-200 transition hover:bg-white/10"
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
              {isConfigured ? 'Sign in' : 'Auth offline'}
            </button>
          )}
        </div>

        <nav className="order-3 -mx-1 flex w-full gap-2 overflow-x-auto px-1 pb-1 text-sm text-slate-300 sm:order-none sm:mx-0 sm:w-auto sm:flex-wrap sm:justify-center sm:overflow-visible sm:rounded-full sm:border sm:border-white/10 sm:bg-white/5 sm:p-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              onMouseEnter={() => handleNavIntent(item.preload)}
              onFocus={() => handleNavIntent(item.preload)}
              onTouchStart={() => handleNavIntent(item.preload)}
              className={({ isActive }) => [
                'whitespace-nowrap rounded-full border border-white/10 bg-white/5 px-4 py-2.5 transition hover:bg-white/10 hover:text-white sm:border-transparent sm:bg-transparent',
                isActive ? 'border-emerald-400/30 bg-emerald-500/12 text-white sm:bg-white/10' : '',
              ].join(' ')}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </header>
  )
}

export default Header