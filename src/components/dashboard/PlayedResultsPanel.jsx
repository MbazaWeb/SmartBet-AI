import { formatKickoff, formatScore } from '../../features/dashboard/helpers'
import { SkeletonBlock, SkeletonText } from '../ui/Skeleton'
import { useState, useMemo } from 'react'

export default function PlayedResultsPanel({ loading, playedResultInsights, outcomeLabels, onRefresh }) {
  const [filterType, setFilterType] = useState('all') // all, correct, incorrect
  const [searchTerm, setSearchTerm] = useState('')
  const [expandedMatch, setExpandedMatch] = useState(null)

  const filteredMatches = useMemo(() => {
    if (!playedResultInsights) return []
    
    let filtered = [...playedResultInsights]
    
    if (filterType === 'correct') {
      filtered = filtered.filter(m => m.isCorrect)
    } else if (filterType === 'incorrect') {
      filtered = filtered.filter(m => !m.isCorrect)
    }
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(m => 
        m.homeTeam.name.toLowerCase().includes(term) ||
        m.awayTeam.name.toLowerCase().includes(term) ||
        m.competition.name.toLowerCase().includes(term)
      )
    }
    
    return filtered
  }, [playedResultInsights, filterType, searchTerm])

  const stats = useMemo(() => {
    if (!playedResultInsights?.length) return null
    
    const correct = playedResultInsights.filter(m => m.isCorrect).length
    const total = playedResultInsights.length
    const hitRate = (correct / total * 100).toFixed(1)
    
    return { correct, total, hitRate }
  }, [playedResultInsights])

  const handleExport = () => {
    const data = JSON.stringify(playedResultInsights, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `played-results-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (!loading && (!playedResultInsights || playedResultInsights.length === 0)) {
    return (
      <div className="glass-panel rounded-[28px] p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="data-label text-xs uppercase text-slate-400">Played matches</p>
            <p className="mt-1 text-lg font-semibold text-white">Prediction vs real result</p>
          </div>
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">0 scored</span>
        </div>
        <div className="mt-4 rounded-3xl border border-white/10 bg-white/5 px-4 py-6 text-center">
          <p className="text-sm text-slate-400">No completed matches are available yet.</p>
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="mt-3 text-xs text-emerald-400 hover:text-emerald-300 transition"
            >
              Refresh data
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="glass-panel rounded-[28px] p-5" id="results">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="data-label text-xs uppercase text-slate-400">Played matches</p>
          <p className="mt-1 text-lg font-semibold text-white">Prediction vs real result</p>
        </div>
        <div className="flex items-center gap-2">
          {stats && (
            <span className={`rounded-full border px-3 py-1 text-xs font-medium ${
              parseFloat(stats.hitRate) >= 60 
                ? 'border-emerald-400/30 bg-emerald-500/15 text-emerald-200'
                : 'border-amber-400/30 bg-amber-500/15 text-amber-200'
            }`}>
              Hit rate: {stats.hitRate}%
            </span>
          )}
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
            {playedResultInsights.length} scored
          </span>
        </div>
      </div>

      {/* Filters */}
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          onClick={() => setFilterType('all')}
          className={`rounded-full px-3 py-1 text-xs transition ${
            filterType === 'all'
              ? 'border-sky-400/40 bg-sky-500/15 text-sky-200'
              : 'border-white/10 bg-white/5 text-slate-400 hover:bg-white/10'
          }`}
        >
          All ({playedResultInsights?.length || 0})
        </button>
        <button
          onClick={() => setFilterType('correct')}
          className={`rounded-full px-3 py-1 text-xs transition ${
            filterType === 'correct'
              ? 'border-emerald-400/40 bg-emerald-500/15 text-emerald-200'
              : 'border-white/10 bg-white/5 text-slate-400 hover:bg-white/10'
          }`}
        >
          ✓ Hit ({stats?.correct || 0})
        </button>
        <button
          onClick={() => setFilterType('incorrect')}
          className={`rounded-full px-3 py-1 text-xs transition ${
            filterType === 'incorrect'
              ? 'border-rose-400/40 bg-rose-500/15 text-rose-200'
              : 'border-white/10 bg-white/5 text-slate-400 hover:bg-white/10'
          }`}
        >
          ✗ Miss ({stats ? stats.total - stats.correct : 0})
        </button>
        <div className="flex-1 min-w-[150px]">
          <input
            type="text"
            placeholder="Search teams..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300 placeholder-slate-500 focus:outline-none focus:border-emerald-400/30"
          />
        </div>
        <button
          onClick={handleExport}
          className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-400 hover:text-slate-300 transition"
          title="Export results"
        >
          📥 Export
        </button>
      </div>

      <div className="mt-4 space-y-3">
        {loading ? Array.from({ length: 3 }, (_, index) => (
          <div key={index} className="rounded-3xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <SkeletonText className="h-4 w-48 max-w-full" />
                <SkeletonText className="mt-2 h-4 w-56 max-w-full" />
              </div>
              <SkeletonBlock className="h-8 w-16 rounded-full" />
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <SkeletonBlock className="h-20 rounded-2xl" />
              <SkeletonBlock className="h-20 rounded-2xl" />
              <SkeletonBlock className="h-20 rounded-2xl" />
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <SkeletonBlock className="h-20 rounded-2xl" />
              <SkeletonBlock className="h-20 rounded-2xl" />
              <SkeletonBlock className="h-20 rounded-2xl" />
            </div>
          </div>
        )) : filteredMatches.length ? filteredMatches.map((match) => {
          const isExpanded = expandedMatch === match.id
          
          return (
            <div 
              key={match.id} 
              className="rounded-3xl border border-white/10 bg-white/5 p-4 transition-all hover:bg-white/10"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 cursor-pointer" onClick={() => setExpandedMatch(isExpanded ? null : match.id)}>
                  <p className="text-sm font-semibold text-white hover:text-emerald-300 transition">
                    {match.homeTeam.name} vs {match.awayTeam.name}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    {match.competition.name} · {formatKickoff(match.utcDate)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={[
                      'inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-medium',
                      match.isCorrect
                        ? 'border-emerald-400/35 bg-emerald-500/15 text-emerald-200'
                        : 'border-rose-400/35 bg-rose-500/15 text-rose-200',
                    ].join(' ')}
                  >
                    <span>{match.isCorrect ? '✓' : '✕'}</span>
                    <span>{match.isCorrect ? 'Hit' : 'Miss'}</span>
                  </span>
                  <button
                    onClick={() => setExpandedMatch(isExpanded ? null : match.id)}
                    className="text-slate-400 hover:text-slate-300 transition"
                  >
                    <svg className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-slate-950/45 px-3 py-3 hover:bg-slate-950/60 transition">
                  <p className="data-label text-[11px] uppercase text-slate-500">Prediction</p>
                  <p className="mt-2 text-sm font-medium text-white">{outcomeLabels?.[match.strongestOutcome] || 'N/A'}</p>
                  <p className="mt-1 text-xs text-slate-400">Confidence {match.strongestValue}%</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-slate-950/45 px-3 py-3 hover:bg-slate-950/60 transition">
                  <p className="data-label text-[11px] uppercase text-slate-500">Real result</p>
                  <p className="mt-2 text-sm font-medium text-white">
                    {match.actualOutcome ? outcomeLabels?.[match.actualOutcome] : 'Pending'}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-slate-950/45 px-3 py-3 hover:bg-slate-950/60 transition">
                  <p className="data-label text-[11px] uppercase text-slate-500">Final score</p>
                  <p className="mt-2 text-sm font-medium text-white">{formatScore(match.score)}</p>
                </div>
              </div>

              {isExpanded && (
                <div className="mt-3 pt-3 border-t border-white/10">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl border border-white/10 bg-slate-950/45 px-3 py-3">
                      <p className="data-label text-[11px] uppercase text-slate-500">Stability</p>
                      <p className="mt-2 text-sm font-medium text-white">{match.model?.stability || 'N/A'}</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-slate-950/45 px-3 py-3">
                      <p className="data-label text-[11px] uppercase text-slate-500">Market implied</p>
                      <p className="mt-2 text-sm font-medium text-white">
                        {match.valueBet?.available
                          ? `${match.valueBet.outcomes?.[match.strongestOutcome]?.impliedProbability ?? 0}%`
                          : 'N/A'}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        {match.valueBet?.available
                          ? `Consensus ${match.valueBet.consensus?.odds?.[match.strongestOutcome] || '-'} odds`
                          : 'No bookmaker line stored for this fixture.'}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-slate-950/45 px-3 py-3">
                      <p className="data-label text-[11px] uppercase text-slate-500">Value edge</p>
                      <p className="mt-2 text-sm font-medium text-white">
                        {match.valueBet?.available
                          ? `${match.valueBet.outcomes?.[match.strongestOutcome]?.edge > 0 ? '+' : ''}${match.valueBet.outcomes?.[match.strongestOutcome]?.edge ?? 0} pts`
                          : 'N/A'}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        {match.valueBet?.available
                          ? `EV ${match.valueBet.outcomes?.[match.strongestOutcome]?.expectedValue > 0 ? '+' : ''}${match.valueBet.outcomes?.[match.strongestOutcome]?.expectedValue ?? 0}%`
                          : 'Expected value appears once bookmaker odds are available.'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        }) : (
          <div className="rounded-3xl border border-white/10 bg-white/5 px-4 py-6 text-center text-sm text-slate-400">
            No matches match your filters.
            <button
              onClick={() => { setFilterType('all'); setSearchTerm('') }}
              className="ml-2 text-emerald-400 hover:text-emerald-300 transition"
            >
              Clear filters
            </button>
          </div>
        )}
      </div>
    </div>
  )
}