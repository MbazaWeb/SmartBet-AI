import { Suspense, lazy } from 'react'
import ErrorBoundary from '../components/common/ErrorBoundary'

// Lazy load components for better performance
const PredictionBoard = lazy(() => import('../components/dashboard/PredictionBoard'))
const PredictionFeedSection = lazy(() => import('../components/dashboard/PredictionFeedSection'))
const SidebarFilters = lazy(() => import('../components/dashboard/SidebarFilters'))

import useDashboardData from '../hooks/useDashboardData'

function Prediction() {
  const dashboard = useDashboardData()

  const handleRetry = () => {
    window.location.reload()
  }

  return (
    <ErrorBoundary fallback={<PredictionErrorFallback onRetry={handleRetry} />}>
      <main className="route-shell-enter mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        {/* Header Section */}
        <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="glass-panel rounded-[32px] p-6 sm:p-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <p className="data-label text-xs uppercase text-emerald-400/80">Prediction page</p>
                <h1 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-5xl">
                  Live and upcoming predictions
                </h1>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300 sm:text-lg">
                  This page is prediction-only. It keeps the Instagram-style timeline focused on live and upcoming matches with direct filters.
                </p>
              </div>

              <div className="flex flex-col items-start gap-3 lg:items-end">
                <button
                  type="button"
                  onClick={() => {
                    if (!dashboard.loading && !dashboard.refreshing) {
                      dashboard.handleManualRefresh()
                    }
                  }}
                  disabled={dashboard.loading || dashboard.refreshing}
                  className="w-full rounded-full border border-emerald-400/30 bg-emerald-500/10 px-5 py-3 text-sm font-medium text-emerald-100 transition hover:bg-emerald-500/15 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto flex items-center gap-2"
                  aria-label="Refresh predictions"
                >
                  {dashboard.refreshing ? (
                    <>
                      <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Refreshing...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Refresh now
                    </>
                  )}
                </button>
                {dashboard.lastUpdated && (
                  <p className="text-xs text-slate-400 flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Last updated {dashboard.lastUpdated}
                  </p>
                )}
              </div>
            </div>
          </div>

          <Suspense fallback={<BoardSkeleton />}>
            <PredictionBoard
              loading={dashboard.loading}
              researchDigest={dashboard.researchDigest}
              trainingSummary={dashboard.trainingSummary}
            />
          </Suspense>
        </section>

        <section className="mt-8">
          <div className="glass-panel rounded-[32px] p-6 sm:p-8">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="data-label text-xs uppercase text-amber-300/80">Prediction of the day</p>
                <h2 className="mt-3 text-2xl font-semibold text-white sm:text-3xl">Top 5 match calls</h2>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
                  The page prioritizes five strongest live and upcoming match predictions. Calls above 80% confidence are shown first, then the next-best matches fill the list if fewer than five clear that threshold.
                </p>
              </div>
              <div className="rounded-2xl border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                Target: 5 matches with 80%+ confidence
              </div>
            </div>

            {dashboard.loading ? (
              <div className="mt-6 grid gap-4 lg:grid-cols-5 sm:grid-cols-2">
                {[1, 2, 3, 4, 5].map((item) => (
                  <div key={item} className="rounded-[28px] border border-white/10 bg-white/5 p-5 animate-pulse">
                    <div className="h-4 w-20 rounded bg-white/10"></div>
                    <div className="mt-4 h-6 w-3/4 rounded bg-white/10"></div>
                    <div className="mt-3 h-4 w-full rounded bg-white/10"></div>
                    <div className="mt-6 h-10 w-24 rounded bg-white/10"></div>
                  </div>
                ))}
              </div>
            ) : dashboard.predictionOfTheDayMatches.length > 0 ? (
              <div className="mt-6 grid gap-4 lg:grid-cols-5 sm:grid-cols-2">
                {dashboard.predictionOfTheDayMatches.map((match, index) => {
                  const kickoff = new Date(match.utcDate).toLocaleString('en-GB', {
                    day: '2-digit',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })

                  return (
                    <article
                      key={match.id}
                      className="rounded-[28px] border border-white/10 bg-white/5 p-5 transition hover:bg-white/10"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-wide text-slate-400">
                          Match {index + 1}
                        </span>
                        <span className={`rounded-full px-3 py-1 text-xs font-medium ${match.strongestValue >= 80 ? 'border border-emerald-400/20 bg-emerald-500/10 text-emerald-200' : 'border border-amber-400/20 bg-amber-500/10 text-amber-100'}`}>
                          {match.strongestValue}%
                        </span>
                      </div>

                      <p className="mt-4 text-sm text-slate-400">{match.competition?.name || 'Competition pending'}</p>
                      <h3 className="mt-2 text-lg font-semibold leading-6 text-white">
                        {match.homeTeam?.name} vs {match.awayTeam?.name}
                      </h3>
                      <p className="mt-3 text-sm text-slate-400">Kickoff {kickoff}</p>

                      <div className="mt-5 rounded-2xl border border-white/10 bg-slate-950/30 p-4">
                        <p className="data-label text-[11px] uppercase text-slate-500">Strongest angle</p>
                        <p className="mt-2 text-base font-medium text-emerald-300">
                          {dashboard.outcomeLabels?.[match.strongestOutcome] || 'Outcome pending'}
                        </p>
                        <p className="mt-2 text-sm leading-6 text-slate-400 line-clamp-3">
                          {match.analysis?.caption || 'Model confidence is driving this pick while richer analysis is still loading.'}
                        </p>
                      </div>
                    </article>
                  )
                })}
              </div>
            ) : (
              <div className="mt-6 rounded-[28px] border border-white/10 bg-white/5 p-6 text-center text-slate-400">
                No prediction-of-the-day matches are available yet.
              </div>
            )}
          </div>
        </section>

        {/* Main Content Section */}
        <section className="mt-8 grid gap-6 xl:grid-cols-[230px_minmax(0,1fr)]">
          <aside className="hidden xl:block">
            <div className="sticky top-24 space-y-4">
              <Suspense fallback={<SidebarSkeleton />}>
                <SidebarFilters
                  activeFilter={dashboard.activeFilter}
                  handleFilterChange={dashboard.handleFilterChange}
                  selectedDate={dashboard.selectedDate}
                  handleDateChange={dashboard.handleDateChange}
                  sortMode={dashboard.sortMode}
                  setSortMode={dashboard.setSortMode}
                />
              </Suspense>
            </div>
          </aside>

          <Suspense fallback={<FeedSkeleton />}>
            <PredictionFeedSection
              loading={dashboard.loading}
              error={dashboard.error}
              dataStatus={dashboard.dataStatus}
              activeFeedLabel={dashboard.activeFeedLabel}
              activeFeedTab={dashboard.activeFeedTab}
              feedSourceInsights={dashboard.feedSourceInsights}
              handleFeedTabChange={dashboard.handleFeedTabChange}
              visibleMatches={dashboard.visibleMatches}
              filteredFeedInsights={dashboard.filteredFeedInsights}
              selectedFeedInsights={dashboard.selectedFeedInsights}
              nextUpcomingMatch={dashboard.nextUpcomingMatch}
              handleLoadMore={dashboard.handleLoadMore}
              activeFilter={dashboard.activeFilter}
              handleFilterChange={dashboard.handleFilterChange}
              selectedDate={dashboard.selectedDate}
              handleDateChange={dashboard.handleDateChange}
              sortMode={dashboard.sortMode}
              setSortMode={dashboard.setSortMode}
            />
          </Suspense>
        </section>
      </main>
    </ErrorBoundary>
  )
}

// Loading skeletons
function BoardSkeleton() {
  return (
    <div className="glass-panel rounded-[32px] p-6 sm:p-8 animate-pulse">
      <div className="h-4 bg-white/10 rounded w-1/3 mb-4"></div>
      <div className="h-8 bg-white/10 rounded w-2/3 mb-6"></div>
      <div className="space-y-3">
        <div className="h-20 bg-white/10 rounded"></div>
        <div className="h-20 bg-white/10 rounded"></div>
      </div>
    </div>
  )
}

function SidebarSkeleton() {
  return (
    <div className="glass-panel rounded-[32px] p-5 animate-pulse">
      <div className="h-6 bg-white/10 rounded w-2/3 mb-4"></div>
      <div className="space-y-3">
        <div className="h-10 bg-white/10 rounded"></div>
        <div className="h-10 bg-white/10 rounded"></div>
        <div className="h-10 bg-white/10 rounded"></div>
      </div>
    </div>
  )
}

function FeedSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="glass-panel rounded-[32px] p-6">
        <div className="h-10 bg-white/10 rounded w-1/2 mb-4"></div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-64 bg-white/10 rounded-xl"></div>
          ))}
        </div>
      </div>
    </div>
  )
}

function PredictionErrorFallback({ onRetry }) {
  return (
    <div className="glass-panel rounded-[32px] p-8 text-center">
      <div className="text-6xl mb-4">⚠️</div>
      <h2 className="text-2xl font-bold text-white mb-2">Something went wrong</h2>
      <p className="text-slate-300 mb-6">Failed to load prediction data. Please try again.</p>
      <button
        onClick={onRetry}
        className="rounded-full border border-emerald-400/30 bg-emerald-500/12 px-6 py-3 text-sm font-medium text-emerald-100 transition hover:bg-emerald-500/18"
      >
        Retry
      </button>
    </div>
  )
}

export default Prediction