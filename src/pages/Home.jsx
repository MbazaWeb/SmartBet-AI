import { Link, useNavigate } from 'react-router-dom'
import { loadPredictionRoute, loadResultsRoute } from '../lib/routeLoader'
import { useState, useEffect } from 'react'

function Home() {
  const navigate = useNavigate()
  const [isLoadingPrediction, setIsLoadingPrediction] = useState(false)
  const [isLoadingResults, setIsLoadingResults] = useState(false)

  // Preload on mount for faster navigation
  useEffect(() => {
    // Preload prediction route in background after page loads
    const timer = setTimeout(() => {
      loadPredictionRoute().catch(console.error)
      loadResultsRoute().catch(console.error)
    }, 1000)
    
    return () => clearTimeout(timer)
  }, [])

  const handlePredictionClick = async (e) => {
    e.preventDefault()
    setIsLoadingPrediction(true)
    try {
      await loadPredictionRoute()
      navigate('/prediction')
    } catch (error) {
      console.error('Failed to load prediction route:', error)
      // Fallback navigation even if preload fails
      navigate('/prediction')
    } finally {
      setIsLoadingPrediction(false)
    }
  }

  const handleResultsClick = async (e) => {
    e.preventDefault()
    setIsLoadingResults(true)
    try {
      await loadResultsRoute()
      navigate('/results')
    } catch (error) {
      console.error('Failed to load results route:', error)
      navigate('/results')
    } finally {
      setIsLoadingResults(false)
    }
  }

  const features = [
    {
      title: 'Prediction flow',
      subtitle: 'Live and upcoming only',
      description: 'Keep the feed focused on matches you can still act on, with tabs and date filters.',
      icon: '🎯'
    },
    {
      title: 'Results flow',
      subtitle: 'Hit or miss grading',
      description: 'Compare predicted outcome vs the real scoreline and review accuracy without feed noise.',
      icon: '📊'
    },
    {
      title: 'Community flow',
      subtitle: 'Persisted discussion',
      description: 'Likes, comments, and replies stay attached to each fixture through Supabase auth.',
      icon: '💬'
    }
  ]

  const workflowSteps = [
    'Open Prediction to see only live and upcoming fixtures.',
    'Filter by live status, today, tomorrow, or a custom date.',
    'Use the social interaction layer to like or discuss each fixture.'
  ]

  return (
    <main className="route-shell-enter mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="glass-panel relative overflow-hidden rounded-[34px] p-6 sm:p-8 lg:p-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(34,197,94,0.14),_transparent_34%),radial-gradient(circle_at_bottom_right,_rgba(56,189,248,0.16),_transparent_28%)]" />
          <div className="relative">
            <p className="data-label text-xs uppercase text-emerald-400/80">Landing page</p>
            <h1 className="mt-4 max-w-3xl text-3xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
              Prediction intelligence, separated cleanly into signal and scorecard.
            </h1>
            <p className="mt-5 max-w-2xl text-sm leading-7 text-slate-300 sm:text-lg">
              Use Prediction for live and upcoming match calls, then switch to Results to grade every finished fixture against the model. The home page now acts as a true front door instead of a dashboard dump.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                to="/prediction"
                onClick={handlePredictionClick}
                onMouseEnter={() => loadPredictionRoute().catch(console.error)}
                onFocus={() => loadPredictionRoute().catch(console.error)}
                onTouchStart={() => loadPredictionRoute().catch(console.error)}
                className={`rounded-full border border-emerald-400/30 bg-emerald-500/12 px-6 py-3 text-center text-sm font-medium text-emerald-100 transition hover:bg-emerald-500/18 flex items-center justify-center gap-2 ${isLoadingPrediction ? 'cursor-wait opacity-70' : ''}`}
                aria-label="Navigate to prediction page"
              >
                {isLoadingPrediction ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-emerald-100" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Loading...
                  </>
                ) : (
                  'Open Prediction'
                )}
              </Link>
              <Link
                to="/results"
                onClick={handleResultsClick}
                onMouseEnter={() => loadResultsRoute().catch(console.error)}
                onFocus={() => loadResultsRoute().catch(console.error)}
                onTouchStart={() => loadResultsRoute().catch(console.error)}
                className={`rounded-full border border-white/10 bg-white/5 px-6 py-3 text-center text-sm font-medium text-slate-100 transition hover:bg-white/10 flex items-center justify-center gap-2 ${isLoadingResults ? 'cursor-wait opacity-70' : ''}`}
                aria-label="Navigate to results page"
              >
                {isLoadingResults ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-slate-100" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Loading...
                  </>
                ) : (
                  'Open Results'
                )}
              </Link>
            </div>

            <div className="mt-8 flex flex-wrap gap-3 text-xs text-slate-300 sm:text-sm">
              <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2">Mobile-first layout</div>
              <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2">Lazy route loading</div>
              <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2">Snapshot-backed fixtures</div>
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              {features.map((feature, index) => (
                <div key={index} className="rounded-3xl border border-white/10 bg-white/5 p-5 hover:bg-white/10 transition-all duration-300 hover:scale-[1.02]">
                  <div className="text-2xl mb-2">{feature.icon}</div>
                  <p className="data-label text-[11px] uppercase text-slate-500">{feature.title}</p>
                  <p className="mt-3 text-lg font-semibold text-white">{feature.subtitle}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-400">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="glass-panel rounded-[34px] p-6 sm:p-8">
            <p className="data-label text-xs uppercase text-slate-400">Page map</p>
            <h2 className="mt-4 text-2xl font-semibold text-white">Three-page structure</h2>
            <div className="mt-5 grid gap-4">
              <Link 
                to="/prediction" 
                className="rounded-3xl border border-white/10 bg-white/5 p-5 transition hover:bg-white/10 hover:border-emerald-400/30 group"
                onMouseEnter={() => loadPredictionRoute().catch(console.error)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-lg font-semibold text-white group-hover:text-emerald-300 transition-colors">Prediction</p>
                    <p className="mt-2 text-sm leading-6 text-slate-400">Instagram-style match cards, live and upcoming tabs, filters, and model context.</p>
                  </div>
                  <svg className="w-5 h-5 text-slate-400 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>
              <Link 
                to="/results" 
                className="rounded-3xl border border-white/10 bg-white/5 p-5 transition hover:bg-white/10 hover:border-emerald-400/30 group"
                onMouseEnter={() => loadResultsRoute().catch(console.error)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-lg font-semibold text-white group-hover:text-emerald-300 transition-colors">Results</p>
                    <p className="mt-2 text-sm leading-6 text-slate-400">Finished matches, hit-rate scorecards, prediction grading, and side panels.</p>
                  </div>
                  <svg className="w-5 h-5 text-slate-400 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>
            </div>
          </div>

          <div className="glass-panel rounded-[34px] p-6 sm:p-8">
            <p className="data-label text-xs uppercase text-slate-400">Why this split</p>
            <div className="mt-5 space-y-4 text-sm leading-6 text-slate-300">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 hover:bg-white/10 transition">
                <p className="flex items-start gap-2">
                  <span className="text-emerald-400 text-lg">⚡</span>
                  Home is now fast and lightweight. It no longer pulls the entire dashboard payload just to act as navigation.
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 hover:bg-white/10 transition">
                <p className="flex items-start gap-2">
                  <span className="text-emerald-400 text-lg">📦</span>
                  Results and Prediction are lazy-loaded, so the heavier dashboard code only downloads when those routes are visited.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="glass-panel rounded-[34px] p-6 sm:p-8">
          <p className="data-label text-xs uppercase text-slate-400">Prediction workflow</p>
          <div className="mt-5 space-y-4">
            {workflowSteps.map((step, index) => (
              <div key={step} className="flex gap-4 rounded-3xl border border-white/10 bg-white/5 p-4 hover:bg-white/10 transition">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-emerald-400/25 bg-emerald-500/10 text-sm font-semibold text-emerald-200">
                  {String(index + 1).padStart(2, '0')}
                </div>
                <p className="text-sm leading-6 text-slate-300">{step}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-panel rounded-[34px] p-6 sm:p-8">
          <p className="data-label text-xs uppercase text-slate-400">Results workflow</p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="rounded-3xl border border-emerald-400/20 bg-emerald-500/10 p-5 hover:bg-emerald-500/15 transition group">
              <div className="text-2xl mb-2">✅</div>
              <p className="text-sm font-medium text-emerald-100">Green tick</p>
              <p className="mt-3 text-2xl font-bold text-white">Prediction hit</p>
              <p className="mt-2 text-sm leading-6 text-emerald-50/85">If the predicted outcome matches the actual result, the scorecard marks it as a correct call.</p>
            </div>
            <div className="rounded-3xl border border-rose-400/20 bg-rose-500/10 p-5 hover:bg-rose-500/15 transition group">
              <div className="text-2xl mb-2">❌</div>
              <p className="text-sm font-medium text-rose-100">Red miss</p>
              <p className="mt-3 text-2xl font-bold text-white">Prediction missed</p>
              <p className="mt-2 text-sm leading-6 text-rose-50/85">Wrong calls stay visible in the results route so model accuracy is transparent instead of hidden.</p>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}

export default Home