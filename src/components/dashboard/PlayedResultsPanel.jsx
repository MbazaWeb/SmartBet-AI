import { formatKickoff, formatScore } from '../../features/dashboard/helpers'
import { SkeletonBlock, SkeletonText } from '../ui/Skeleton'

export default function PlayedResultsPanel({ loading, playedResultInsights, outcomeLabels }) {
  return (
    <div className="glass-panel rounded-[28px] p-5" id="results">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="data-label text-xs uppercase text-slate-400">Played matches</p>
          <p className="mt-1 text-lg font-semibold text-white">Prediction vs real result</p>
        </div>
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
          {playedResultInsights.length} scored
        </span>
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
        )) : playedResultInsights.length ? playedResultInsights.map((match) => (
          <div key={match.id} className="rounded-3xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-white">{match.homeTeam.name} vs {match.awayTeam.name}</p>
                <p className="mt-1 text-xs text-slate-400">{match.competition.name} · {formatKickoff(match.utcDate)}</p>
              </div>
              <span
                className={[
                  'inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium',
                  match.isCorrect
                    ? 'border-emerald-400/35 bg-emerald-500/15 text-emerald-200'
                    : 'border-rose-400/35 bg-rose-500/15 text-rose-200',
                ].join(' ')}
              >
                <span>{match.isCorrect ? '✓' : '✕'}</span>
                <span>{match.isCorrect ? 'Hit' : 'Miss'}</span>
              </span>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-slate-950/45 px-3 py-3">
                <p className="data-label text-[11px] uppercase text-slate-500">Prediction</p>
                <p className="mt-2 text-sm font-medium text-white">{outcomeLabels[match.strongestOutcome]}</p>
                <p className="mt-1 text-xs text-slate-400">Confidence {match.strongestValue}%</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-950/45 px-3 py-3">
                <p className="data-label text-[11px] uppercase text-slate-500">Real result</p>
                <p className="mt-2 text-sm font-medium text-white">{match.actualOutcome ? outcomeLabels[match.actualOutcome] : 'Pending'}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-950/45 px-3 py-3">
                <p className="data-label text-[11px] uppercase text-slate-500">Final score</p>
                <p className="mt-2 text-sm font-medium text-white">{formatScore(match.score)}</p>
              </div>
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-3">
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
                    ? `Consensus ${match.valueBet.consensus?.odds?.[match.strongestOutcome] ?? '-'} odds`
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
        )) : (
          <div className="rounded-3xl border border-white/10 bg-white/5 px-4 py-6 text-sm text-slate-400">
            No completed matches are available yet.
          </div>
        )}
      </div>
    </div>
  )
}
