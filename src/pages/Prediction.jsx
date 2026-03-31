import PredictionBoard from '../components/dashboard/PredictionBoard'
import PredictionFeedSection from '../components/dashboard/PredictionFeedSection'
import SidebarFilters from '../components/dashboard/SidebarFilters'
import useDashboardData from '../hooks/useDashboardData'

function Prediction() {
  const dashboard = useDashboardData()

  return (
    <main className="route-shell-enter mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="glass-panel rounded-[32px] p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="data-label text-xs uppercase text-emerald-400/80">Prediction page</p>
              <h2 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-5xl">
                Live and upcoming predictions
              </h2>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300 sm:text-lg">
                This page is prediction-only. It keeps the Instagram-style timeline focused on live and upcoming matches with direct filters.
              </p>
            </div>

            <div className="flex flex-col items-start gap-3 sm:items-end">
              <button
                type="button"
                onClick={dashboard.handleManualRefresh}
                disabled={dashboard.loading || dashboard.refreshing}
                className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-5 py-3 text-sm font-medium text-emerald-100 transition hover:bg-emerald-500/15 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {dashboard.refreshing ? 'Refreshing...' : 'Refresh now'}
              </button>
              {dashboard.lastUpdated ? (
                <p className="text-sm text-slate-400">Last updated {dashboard.lastUpdated}</p>
              ) : null}
            </div>
          </div>
        </div>

        <PredictionBoard
          loading={dashboard.loading}
          researchDigest={dashboard.researchDigest}
          trainingSummary={dashboard.trainingSummary}
        />
      </section>

      <section className="mt-8 grid gap-6 xl:grid-cols-[230px_minmax(0,1fr)]">
        <aside className="hidden xl:block">
          <div className="sticky top-24 space-y-4">
            <SidebarFilters
              activeFilter={dashboard.activeFilter}
              handleFilterChange={dashboard.handleFilterChange}
              selectedDate={dashboard.selectedDate}
              handleDateChange={dashboard.handleDateChange}
              sortMode={dashboard.sortMode}
              setSortMode={dashboard.setSortMode}
            />
          </div>
        </aside>

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
      </section>
    </main>
  )
}

export default Prediction