import CalibrationPanel from '../components/dashboard/CalibrationPanel'
import LivePollsPanel from '../components/dashboard/LivePollsPanel'
import PlayedResultsPanel from '../components/dashboard/PlayedResultsPanel'
import PredictionNotesPanel from '../components/dashboard/PredictionNotesPanel'
import ResultsSummary from '../components/dashboard/ResultsSummary'
import useDashboardData from '../hooks/useDashboardData'

function Results() {
  const dashboard = useDashboardData()

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <section className="glass-panel rounded-[32px] p-6 sm:p-8">
        <p className="data-label text-xs uppercase text-emerald-400/80">Results page</p>
        <h2 className="mt-4 text-4xl font-bold tracking-tight text-white sm:text-5xl">
          Prediction scorecard
        </h2>
        <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
          Review every finished match against the predicted winner and track hit rate across the feed.
        </p>
      </section>

      <section className="mt-8 grid gap-6 xl:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <ResultsSummary resultsCards={dashboard.resultsCards} />
          <CalibrationPanel calibrationBands={dashboard.calibrationBands} />
          <PlayedResultsPanel playedResultInsights={dashboard.playedResultInsights} outcomeLabels={dashboard.outcomeLabels} />
        </div>

        <aside className="space-y-5">
          <LivePollsPanel livePolls={dashboard.livePolls} handleVote={dashboard.handleVote} />
          <PredictionNotesPanel researchDigest={dashboard.researchDigest} teamIntel={dashboard.teamIntel} />
        </aside>
      </section>
    </main>
  )
}

export default Results