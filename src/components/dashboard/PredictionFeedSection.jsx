import MatchCard from '../MatchCard'
import { SkeletonBlock, SkeletonCircle, SkeletonText } from '../ui/Skeleton'
import { feedTabs, filterOptions, sortOptions } from '../../features/dashboard/helpers'
import { useEffect, useRef, useCallback } from 'react'

function buildEmptyFeedLabel(activeFeedLabel) {
  const label = activeFeedLabel.toLowerCase()
  if (label === 'all predictions') {
    return 'No predictions available'
  }
  return `No ${label} predictions available`
}

export default function PredictionFeedSection({
  loading,
  error,
  dataStatus,
  activeFeedLabel,
  activeFeedTab,
  feedSourceInsights,
  handleFeedTabChange,
  visibleMatches,
  filteredFeedInsights,
  selectedFeedInsights,
  nextUpcomingMatch,
  handleLoadMore,
  activeFilter,
  handleFilterChange,
  selectedDate,
  handleDateChange,
  sortMode,
  setSortMode,
}) {
  const loadingCards = Array.from({ length: 3 }, (_, index) => index)
  const loadMoreRef = useRef(null)
  const hasMore = visibleMatches.length < filteredFeedInsights.length

  // Infinite scroll observer
  const handleObserver = useCallback((entries) => {
    const [target] = entries
    if (target.isIntersecting && !loading && hasMore) {
      handleLoadMore()
    }
  }, [loading, hasMore, handleLoadMore])

  useEffect(() => {
    const element = loadMoreRef.current
    if (!element) return
    
    const observer = new IntersectionObserver(handleObserver, {
      threshold: 0.1,
      rootMargin: '100px'
    })
    
    observer.observe(element)
    
    return () => observer.disconnect()
  }, [handleObserver])

  return (
    <div id="feed">
      {/* Snapshot banner */}
      {!loading && !error && dataStatus?.servingMode === 'snapshot' && (
        <div className="mb-5 rounded-3xl border border-amber-400/20 bg-amber-500/10 px-5 py-4 text-sm text-amber-100 transition-all hover:bg-amber-500/15">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="data-label text-[11px] uppercase text-amber-200/80">Saved snapshot</p>
              <p className="mt-1 font-medium text-amber-50">
                Serving persisted fixtures because live providers returned no fresh matches.
              </p>
            </div>
            <div className="text-right text-xs text-amber-100/80">
              <p>{dataStatus.snapshotCount} saved fixtures</p>
              <p>{dataStatus.lastSnapshotAt ? `Last saved ${new Date(dataStatus.lastSnapshotAt).toLocaleString('en-GB')}` : 'Snapshot time unavailable'}</p>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="data-label text-xs uppercase text-slate-400">Prediction feed</p>
          <h2 className="mt-1 text-2xl font-semibold text-white">{activeFeedLabel}</h2>
        </div>
        {!loading && !error && (
          <div className="flex flex-wrap items-center gap-2">
            {dataStatus?.providerSources?.includes('football-data') && (
              <span className="rounded-full border border-sky-400/25 bg-sky-500/10 px-4 py-2 text-sm text-sky-100 flex items-center gap-1">
                <span className="animate-pulse">●</span>
                Fallback provider active
              </span>
            )}
            <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300">
              {Math.min(visibleMatches.length, filteredFeedInsights.length)} of {filteredFeedInsights.length} shown
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="mb-5 grid grid-cols-1 gap-3 sm:flex sm:flex-wrap sm:items-center">
        {feedTabs.map((tab) => {
          const isActive = activeFeedTab === tab.id
          const tabCount = feedSourceInsights[tab.id]?.length ?? 0

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleFeedTabChange(tab.id)}
              className={[
                'w-full rounded-full border px-4 py-2 text-sm transition-all sm:w-auto',
                isActive
                  ? 'border-sky-400/40 bg-sky-500/15 text-sky-100 shadow-lg shadow-sky-500/10'
                  : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10',
              ].join(' ')}
              aria-label={`Show ${tab.label} predictions`}
            >
              {tab.label}
              <span className="ml-2 text-xs opacity-75">({tabCount})</span>
            </button>
          )
        })}
      </div>

      {/* Mobile filters */}
      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:hidden">
        {filterOptions.map((option) => {
          const isActive = activeFilter === option.id
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => handleFilterChange(option.id)}
              className={[
                'w-full rounded-full border px-4 py-2 text-sm transition',
                isActive
                  ? 'border-emerald-400/40 bg-emerald-500/15 text-emerald-200'
                  : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10',
              ].join(' ')}
            >
              {option.label}
            </button>
          )
        })}

        <label className="flex w-full items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300">
          <span className="data-label text-[11px] uppercase text-slate-400">Date</span>
          <input
            type="date"
            value={selectedDate}
            onChange={handleDateChange}
            className="min-w-0 flex-1 bg-transparent text-slate-100 outline-none [color-scheme:dark]"
            aria-label="Filter by date"
          />
        </label>

        <label className="flex w-full items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300">
          <span className="data-label text-[11px] uppercase text-slate-400">Sort</span>
          <select
            value={sortMode}
            onChange={(event) => setSortMode(event.target.value)}
            className="min-w-0 flex-1 bg-transparent text-slate-100 outline-none"
          >
            {sortOptions.map((option) => (
              <option key={option.id} value={option.id} className="bg-slate-950 text-slate-100">
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="space-y-5">
          {loadingCards.map((card) => (
            <div key={card} className="glass-panel rounded-[30px] p-5 sm:p-6">
              <div className="flex items-start gap-4">
                <SkeletonCircle className="h-12 w-12 shrink-0" />
                <div className="min-w-0 flex-1">
                  <SkeletonText className="h-4 w-40" />
                  <SkeletonText className="mt-3 h-4 w-56 max-w-full" />
                </div>
                <SkeletonBlock className="h-10 w-20 rounded-full" />
              </div>
              <div className="mt-6 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
                <div className="rounded-[28px] border border-white/10 bg-white/5 p-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <SkeletonBlock className="h-24 rounded-3xl" />
                    <SkeletonBlock className="h-24 rounded-3xl" />
                  </div>
                  <SkeletonText className="mt-4 h-4 w-5/6" />
                  <SkeletonText className="mt-3 h-4 w-3/5" />
                </div>
                <div className="space-y-3 rounded-[28px] border border-white/10 bg-white/5 p-4">
                  <SkeletonBlock className="h-20 rounded-3xl" />
                  <SkeletonBlock className="h-20 rounded-3xl" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error state */}
      {!loading && error && (
        <div className="glass-panel rounded-3xl border border-rose-400/20 px-6 py-10 text-center">
          <div className="text-4xl mb-3">⚠️</div>
          <p className="text-lg font-medium text-rose-200">Unable to load feed</p>
          <p className="mt-3 text-sm leading-6 text-rose-100/75">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 rounded-full border border-rose-400/30 bg-rose-500/10 px-6 py-2 text-sm text-rose-200 hover:bg-rose-500/15 transition"
          >
            Retry
          </button>
        </div>
      )}

      {/* Feed content */}
      {!loading && !error && filteredFeedInsights.length > 0 && (
        <div className="space-y-6">
          {visibleMatches.map((match) => (
            <MatchCard
              key={match.id}
              match={match}
              prediction={match.prediction}
              analysis={match.analysis}
              intel={match.intel}
              isNextMatch={nextUpcomingMatch?.id === match.id}
            />
          ))}
          
          {/* Load more trigger */}
          {hasMore && (
            <div ref={loadMoreRef} className="flex justify-center py-4">
              <div className="animate-pulse flex items-center gap-2 text-sm text-slate-400">
                <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Loading more...
              </div>
            </div>
          )}
          
          {!hasMore && visibleMatches.length > 0 && (
            <div className="text-center py-8">
              <p className="text-sm text-slate-500">✨ You've seen all predictions</p>
            </div>
          )}
        </div>
      )}

      {/* Empty states */}
      {!loading && !error && selectedFeedInsights.length > 0 && filteredFeedInsights.length === 0 && (
        <div className="glass-panel rounded-3xl px-6 py-10 text-center">
          <div className="text-4xl mb-3">🔍</div>
          <p className="text-lg font-medium text-slate-100">No posts found for this filter</p>
          <p className="mt-3 text-sm leading-6 text-slate-400">
            Try another day or clear the date filter to reopen the feed.
          </p>
          <button
            onClick={() => handleFilterChange('all')}
            className="mt-4 text-sm text-emerald-400 hover:text-emerald-300 transition"
          >
            Clear all filters
          </button>
        </div>
      )}

      {!loading && !error && selectedFeedInsights.length === 0 && (
        <div className="glass-panel rounded-3xl px-6 py-10 text-center">
          <div className="text-4xl mb-3">📅</div>
          <p className="text-lg font-medium text-slate-100">{buildEmptyFeedLabel(activeFeedLabel)}</p>
          <p className="mt-3 text-sm leading-6 text-slate-400">
            Switch tabs or wait for the backend to return more fixtures for this status.
          </p>
        </div>
      )}
    </div>
  )
}