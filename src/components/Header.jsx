import useAuth from '../context/useAuth'
import { NavLink } from 'react-router-dom'
import { loadPredictionRoute, loadResultsRoute } from '../lib/routeLoader'
import { useState, useEffect, useRef } from 'react'

const navItems = [
  { to: '/', label: 'Home', icon: '🏠' },
  { to: '/results', label: 'Results', preload: loadResultsRoute, icon: '📊' },
  { to: '/prediction', label: 'Prediction', preload: loadPredictionRoute, icon: '🎯' },
]

function Header() {
  const { user, openAuth, signOut, loading, isConfigured } = useAuth()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [notifications] = useState([])
  const [showNotifications, setShowNotifications] = useState(false)
  const menuRef = useRef(null)
  const notificationRef = useRef(null)

  const userLabel = user?.email?.split('@')[0] || 'Analyst'

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMobileMenuOpen(false)
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleNavIntent = (preload) => {
    preload?.()
  }

  const handleSignOut = async () => {
    try {
      await signOut()
      setMobileMenuOpen(false)
    } catch (error) {
      console.error('Sign out failed:', error)
    }
  }

  const getInitials = (name) => {
    return name?.slice(0, 2).toUpperCase() || 'AI'
  }

  return (
    <header className={`sticky top-0 z-50 transition-all duration-300 ${
      scrolled 
        ? 'border-b border-white/10 bg-slate-950/95 backdrop-blur-xl shadow-lg' 
        : 'border-b border-white/10 bg-slate-950/80 backdrop-blur-xl'
    }`}>
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-4 px-4 py-3 sm:px-6 lg:px-8">
        {/* Logo Section */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-sky-400 shadow-lg">
              <span className="text-sm font-bold text-slate-950">AI</span>
            </div>
            <div>
              <p className="data-label text-[10px] uppercase text-emerald-400/80 leading-none">AI Match Intelligence</p>
              <h1 className="text-lg font-bold tracking-tight text-white sm:text-2xl">
                SmartBet AI
              </h1>
            </div>
          </div>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden items-center gap-1 rounded-full border border-white/10 bg-white/5 p-1 sm:flex">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              onMouseEnter={() => handleNavIntent(item.preload)}
              onFocus={() => handleNavIntent(item.preload)}
              className={({ isActive }) => [
                'flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all duration-200',
                isActive 
                  ? 'border border-emerald-400/30 bg-emerald-500/12 text-white shadow-lg shadow-emerald-500/10' 
                  : 'text-slate-300 hover:bg-white/10 hover:text-white',
              ].join(' ')}
            >
              <span className="text-base">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Right Section */}
        <div className="flex items-center gap-2 sm:ml-auto">
          {/* Signal Badge - Desktop */}
          <div className="hidden rounded-full border border-emerald-400/20 bg-emerald-500/10 px-4 py-2 lg:block">
            <div className="flex items-center gap-2">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <p className="data-label text-[10px] uppercase text-emerald-300/75">Signal</p>
              <p className="text-xs font-medium text-emerald-100">AI analysis + social feed</p>
            </div>
          </div>

          {/* Notifications */}
          {user && (
            <div className="relative" ref={notificationRef}>
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative rounded-full border border-white/10 bg-white/5 p-2 transition hover:bg-white/10"
                aria-label="Notifications"
              >
                <svg className="h-5 w-5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {notifications.length > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white">
                    {notifications.length}
                  </span>
                )}
              </button>

              {/* Notifications Dropdown */}
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 rounded-2xl border border-white/10 bg-slate-900/95 backdrop-blur-xl shadow-xl">
                  <div className="border-b border-white/10 p-3">
                    <p className="font-medium text-white">Notifications</p>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {notifications.length > 0 ? (
                      notifications.map((notif, idx) => (
                        <div key={idx} className="border-b border-white/10 p-3 hover:bg-white/5">
                          <p className="text-sm text-slate-300">{notif.message}</p>
                          <p className="mt-1 text-xs text-slate-500">{notif.time}</p>
                        </div>
                      ))
                    ) : (
                      <div className="p-4 text-center text-sm text-slate-400">
                        No new notifications
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Auth Section */}
          {user ? (
            <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-2 py-1">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-sky-400">
                <span className="text-xs font-bold text-slate-950">{getInitials(userLabel)}</span>
              </div>
              <span className="hidden px-2 text-sm text-slate-200 sm:inline">@{userLabel}</span>
              <button
                type="button"
                onClick={handleSignOut}
                className="rounded-full border border-white/10 bg-slate-950/70 px-3 py-1.5 text-xs text-slate-200 transition hover:bg-white/10"
                aria-label="Sign out"
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

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="rounded-full border border-white/10 bg-white/5 p-2 transition hover:bg-white/10 sm:hidden"
            aria-label="Menu"
          >
            <svg className="h-5 w-5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Navigation Menu */}
        {mobileMenuOpen && (
          <div ref={menuRef} className="order-3 w-full animate-slide-down sm:hidden">
            <nav className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-slate-900/95 p-3 backdrop-blur-xl">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) => [
                    'flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all',
                    isActive 
                      ? 'border border-emerald-400/30 bg-emerald-500/12 text-white' 
                      : 'text-slate-300 hover:bg-white/10 hover:text-white',
                  ].join(' ')}
                >
                  <span className="text-lg">{item.icon}</span>
                  <span>{item.label}</span>
                  {item.label === 'Prediction' && (
                    <span className="ml-auto text-[10px] text-emerald-400">Live</span>
                  )}
                </NavLink>
              ))}
              {!user && (
                <button
                  onClick={() => {
                    openAuth('signin')
                    setMobileMenuOpen(false)
                  }}
                  className="mt-2 rounded-xl border border-sky-400/25 bg-sky-500/10 px-4 py-3 text-sm font-medium text-sky-100"
                >
                  Sign in
                </button>
              )}
            </nav>
          </div>
        )}
      </div>
    </header>
  )
}

export default Header