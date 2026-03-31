import { Suspense, lazy, useState } from 'react'
import ErrorBoundary from '../components/common/ErrorBoundary'

// Lazy load components for better performance
const CalibrationPanel = lazy(() => import('../components/dashboard/CalibrationPanel'))
const LivePollsPanel = lazy(() => import('../components/dashboard/LivePollsPanel'))
const PlayedResultsPanel = lazy(() => import('../components/dashboard/PlayedResultsPanel'))
const PredictionNotesPanel = lazy(() => import('../components/dashboard/PredictionNotesPanel'))
const ResultsSummary = lazy(() => import('../components/dashboard/ResultsSummary'))

import useDashboardData from '../hooks/useDashboardData'

function Results() {
  const dashboard = useDashboardData()
  const [showSuccessToast, setShowSuccessToast] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')

  // Handle vote success feedback
  const handleVoteWithFeedback = async (pollId, optionId) => {
    try {
      await dashboard.handleVote(pollId, optionId)
      setSuccessMessage('Vote recorded successfully!')
      setShowSuccessToast(true)
      setTimeout(() => setShowSuccessToast(false), 3000)
    } catch (error) {
      console.error('Failed to record vote:', error)
      // You could add error toast here
    }
  }

  const handleRetry = () => {
    window.location.reload()
  }

  // Calculate overall hit rate for better insights
  const overallHitRate = dashboard.resultsCards?.totalPredictions > 0
    ? ((dashboard.resultsCards?.correctPredictions || 0) / dashboard.resultsCards?.totalPredictions * 100).toFixed(1)
    : 0

  return (
    <ErrorBoundary fallback={<ResultsErrorFallback onRetry={handleRetry} />}>
      <main className="route-shell-enter mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        {/* Success Toast */}
        {showSuccessToast && (
          <div className="fixed top-4 right-4 z-50 animate-slide-in">
            <div className="bg-emerald-500/90 backdrop-blur-sm text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              {successMessage}
            </div>
          </div>
        )}

        {/* Header Section */}
        <section className="glass-panel rounded-[32px] p-6 sm:p-8">
          <p className="data-label text-xs uppercase text-emerald-400/80">Results page</p>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-5xl">
                Prediction scorecard
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300 sm:text-lg">
                Review every finished match against the predicted winner and track hit rate across the feed.
              </p>
            </div>
            
            {/* Overall Stats Badge */}
            {dashboard.resultsCards && dashboard.resultsCards.totalPredictions > 0 && (
              <div className="glass-panel rounded-2xl p-4 text-center min-w-[120px]">
                <p className="text-xs text-slate-400 uppercase">Overall hit rate</p>
                <p className={`text-3xl font-bold ${parseFloat(overallHitRate) >= 60 ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {overallHitRate}%
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  {dashboard.resultsCards.correctPredictions || 0}/{dashboard.resultsCards.totalPredictions}
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Main Content */}
        <section className="mt-8 grid gap-6 xl:grid-cols-[1fr_340px]">
          <div className="space-y-6">
            <Suspense fallback={<SummarySkeleton />}>
              <ResultsSummary 
                loading={dashboard.loading} 
                resultsCards={dashboard.resultsCards}
                overallHitRate={overallHitRate}
              />
            </Suspense>

            <Suspense fallback={<CalibrationSkeleton />}>
              <CalibrationPanel 
                loading={dashboard.loading} 
                calibrationBands={dashboard.calibrationBands}
                totalPredictions={dashboard.resultsCards?.totalPredictions || 0}
              />
            </Suspense>

            <Suspense fallback={<ResultsTableSkeleton />}>
              <PlayedResultsPanel 
                loading={dashboard.loading} 
                playedResultInsights={dashboard.playedResultInsights} 
                outcomeLabels={dashboard.outcomeLabels}
                onRefresh={dashboard.handleManualRefresh}
              />
            </Suspense>
          </div>

          <aside className="space-y-5">
            <Suspense fallback={<PollsSkeleton />}>
              <LivePollsPanel 
                loading={dashboard.loading} 
                livePolls={dashboard.livePolls} 
                handleVote={handleVoteWithFeedback}
              />
            </Suspense>

            <Suspense fallback={<NotesSkeleton />}>
              <PredictionNotesPanel 
                loading={dashboard.loading} 
                researchDigest={dashboard.researchDigest} 
                teamIntel={dashboard.teamIntel}
              />
            </Suspense>
          </aside>
        </section>

        {/* Export Data Button (Optional Feature) */}
        {dashboard.playedResultInsights && dashboard.playedResultInsights.length > 0 && (
          <div className="mt-8 flex justify-end">
            <button
              onClick={() => {
                const data = JSON.stringify(dashboard.playedResultInsights, null, 2)
                const blob = new Blob([data], { type: 'application/json' })
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = `results-${new Date().toISOString().split('T')[0]}.json`
                a.click()
                URL.revokeObjectURL(url)
              }}
              className="text-sm text-slate-400 hover:text-emerald-400 transition flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export results
            </button>
          </div>
        )}
      </main>
    </ErrorBoundary>
  )
}

// Loading Skeletons
function SummarySkeleton() {
  return (
    <div className="glass-panel rounded-[32px] p-6 sm:p-8 animate-pulse">
      <div className="h-4 bg-white/10 rounded w-1/4 mb-6"></div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="space-y-2">
            <div className="h-10 bg-white/10 rounded"></div>
            <div className="h-4 bg-white/10 rounded w-2/3"></div>
          </div>
        ))}
      </div>
    </div>
  )
}

function CalibrationSkeleton() {
  return (
    <div className="glass-panel rounded-[32px] p-6 sm:p-8 animate-pulse">
      <div className="h-4 bg-white/10 rounded w-1/3 mb-4"></div>
      <div className="h-32 bg-white/10 rounded"></div>
    </div>
  )
}

function ResultsTableSkeleton() {
  return (
    <div className="glass-panel rounded-[32px] p-6 sm:p-8 animate-pulse">
      <div className="h-4 bg-white/10 rounded w-1/3 mb-6"></div>
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-20 bg-white/10 rounded"></div>
        ))}
      </div>
    </div>
  )
}

function PollsSkeleton() {
  return (
    <div className="glass-panel rounded-[32px] p-6 animate-pulse">
      <div className="h-6 bg-white/10 rounded w-2/3 mb-4"></div>
      <div className="space-y-4">
        <div className="h-24 bg-white/10 rounded"></div>
        <div className="h-24 bg-white/10 rounded"></div>
      </div>
    </div>
  )
}

function NotesSkeleton() {
  return (
    <div className="glass-panel rounded-[32px] p-6 animate-pulse">
      <div className="h-6 bg-white/10 rounded w-2/3 mb-4"></div>
      <div className="space-y-3">
        <div className="h-16 bg-white/10 rounded"></div>
        <div className="h-16 bg-white/10 rounded"></div>
      </div>
    </div>
  )
}

function ResultsErrorFallback({ onRetry }) {
  return (
    <div className="glass-panel rounded-[32px] p-8 text-center max-w-md mx-auto mt-20">
      <div className="text-6xl mb-4">📊</div>
      <h2 className="text-2xl font-bold text-white mb-2">Unable to load results</h2>
      <p className="text-slate-300 mb-6">There was an error loading the prediction results. Please check your connection and try again.</p>
      <button
        onClick={onRetry}
        className="rounded-full border border-emerald-400/30 bg-emerald-500/12 px-6 py-3 text-sm font-medium text-emerald-100 transition hover:bg-emerald-500/18"
      >
        Retry
      </button>
    </div>
  )
}

export default Results