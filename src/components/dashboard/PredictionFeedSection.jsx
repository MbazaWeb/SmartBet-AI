import MatchCard from '../MatchCard'
import { feedTabs, filterOptions, sortOptions } from '../../features/dashboard/helpers'

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
  return (
    <div id="feed">
      {!loading && !error && dataStatus?.servingMode === 'snapshot' ? (
        <div className="mb-5 rounded-3xl border border-amber-400/20 bg-amber-500/10 px-5 py-4 text-sm text-amber-100">
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
      ) : null}

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="data-label text-xs uppercase text-slate-400">Prediction feed</p>
          <h3 className="mt-1 text-2xl font-semibold text-white">{activeFeedLabel}</h3>
        </div>
        {!loading && !error ? (
          <div className="flex flex-wrap items-center gap-2">
            {dataStatus?.providerSources?.includes('football-data') ? (
              <span className="rounded-full border border-sky-400/25 bg-sky-500/10 px-4 py-2 text-sm text-sky-100">
                Fallback provider active
              </span>
            ) : null}
            <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300">
              {Math.min(visibleMatches.length, filteredFeedInsights.length)} of {filteredFeedInsights.length} shown
            </div>
          </div>
        ) : null}
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-3">
        {feedTabs.map((tab) => {
          const isActive = activeFeedTab === tab.id
          const tabCount = feedSourceInsights[tab.id]?.length ?? 0

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleFeedTabChange(tab.id)}
              className={[
                'rounded-full border px-4 py-2 text-sm transition',
                isActive
                  ? 'border-sky-400/40 bg-sky-500/15 text-sky-100'
                  : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10',
              ].join(' ')}
            >
              {tab.label} ({tabCount})
            </button>
          )
        })}
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-3 xl:hidden">
        {filterOptions.map((option) => {
          const isActive = activeFilter === option.id

          return (
            <button
              key={option.id}
              type="button"
              onClick={() => handleFilterChange(option.id)}
              className={[
                'rounded-full border px-4 py-2 text-sm transition',
                isActive
                  ? 'border-emerald-400/40 bg-emerald-500/15 text-emerald-200'
                  : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10',
              ].join(' ')}
            >
              {option.label}
            </button>
          )
        })}

        <label className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300">
          <span className="data-label text-[11px] uppercase text-slate-400">Date</span>
          <input
            type="date"
            value={selectedDate}
            onChange={handleDateChange}
            className="bg-transparent text-slate-100 outline-none [color-scheme:dark]"
          />
        </label>

        <label className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300">
          <span className="data-label text-[11px] uppercase text-slate-400">Sort</span>
          <select
            value={sortMode}
            onChange={(event) => setSortMode(event.target.value)}
            className="bg-transparent text-slate-100 outline-none"
          >
            {sortOptions.map((option) => (
              <option key={option.id} value={option.id} className="bg-slate-950 text-slate-100">
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {loading ? (
        <div className="glass-panel rounded-3xl px-6 py-10 text-center text-lg text-slate-300">
          Loading social prediction feed...
        </div>
      ) : null}

      {!loading && error ? (
        <div className="glass-panel rounded-3xl border border-rose-400/20 px-6 py-10 text-center">
          <p className="text-lg font-medium text-rose-200">Unable to load feed</p>
          <p className="mt-3 text-sm leading-6 text-rose-100/75">{error}</p>
        </div>
      ) : null}

      {!loading && !error && filteredFeedInsights.length > 0 ? (
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

          {visibleMatches.length < filteredFeedInsights.length ? (
            <div className="flex justify-center">
              <button
                type="button"
                onClick={handleLoadMore}
                className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-6 py-3 text-sm font-medium text-emerald-200 transition hover:border-emerald-400/50 hover:bg-emerald-500/15"
              >
                Load more posts
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      {!loading && !error && selectedFeedInsights.length > 0 && filteredFeedInsights.length === 0 ? (
        <div className="glass-panel rounded-3xl px-6 py-10 text-center">
          <p className="text-lg font-medium text-slate-100">No posts found for this filter</p>
          <p className="mt-3 text-sm leading-6 text-slate-400">
            Try another day or clear the date filter to reopen the feed.
          </p>
        </div>
      ) : null}

      {!loading && !error && selectedFeedInsights.length === 0 ? (
        <div className="glass-panel rounded-3xl px-6 py-10 text-center">
          <p className="text-lg font-medium text-slate-100">{buildEmptyFeedLabel(activeFeedLabel)}</p>
          <p className="mt-3 text-sm leading-6 text-slate-400">
            Switch tabs or wait for the backend to return more fixtures for this status.
          </p>
        </div>
      ) : null}
    </div>
  )
}
