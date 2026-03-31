import { SkeletonBlock, SkeletonText } from '../ui/Skeleton'

export default function ResultsSummary({ loading, resultsCards, overallHitRate }) {
  const getTrendIcon = (value, previousValue) => {
    if (!previousValue) return null
    if (value > previousValue) return '📈'
    if (value < previousValue) return '📉'
    return '➡️'
  }

  const getTrendColor = (value, previousValue) => {
    if (!previousValue) return 'text-slate-400'
    if (value > previousValue) return 'text-emerald-400'
    if (value < previousValue) return 'text-amber-400'
    return 'text-slate-400'
  }

  if (!loading && (!resultsCards || resultsCards.length === 0)) {
    return (
      <div className="glass-panel rounded-[28px] p-5">
        <p className="data-label text-xs uppercase text-slate-400">Results</p>
        <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-6 text-center">
          <p className="text-sm text-slate-400">No results data available</p>
          <p className="text-xs text-slate-500 mt-1">Check back after matches are completed</p>
        </div>
      </div>
    )
  }

  return (
    <div className="glass-panel rounded-[28px] p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="data-label text-xs uppercase text-slate-400">Results Summary</p>
        {overallHitRate && (
          <div className="flex items-center gap-2">
            <span className={`text-sm font-bold ${parseFloat(overallHitRate) >= 60 ? 'text-emerald-400' : 'text-amber-400'}`}>
              {overallHitRate}%
            </span>
            <span className="text-xs text-slate-500">hit rate</span>
          </div>
        )}
      </div>
      
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {loading ? (
          Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <SkeletonText className="h-4 w-24" />
              <SkeletonText className="mt-3 h-8 w-20" />
              <SkeletonText className="mt-3 h-4 w-11/12" />
            </div>
          ))
        ) : (
          resultsCards.map((card) => (
            <div key={card.label} className="rounded-2xl border border-white/10 bg-white/5 p-4 hover:bg-white/10 transition group">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-white">{card.label}</p>
                {card.trend && (
                  <span className={`text-sm ${getTrendColor(card.value, card.previousValue)}`}>
                    {getTrendIcon(card.value, card.previousValue)}
                  </span>
                )}
              </div>
              <p className={`mt-2 text-2xl font-bold ${
                card.label === 'Hit Rate' && parseFloat(card.value) >= 60 
                  ? 'text-emerald-400' 
                  : card.label === 'Hit Rate' && parseFloat(card.value) < 50
                    ? 'text-amber-400'
                    : 'text-emerald-300'
              }`}>
                {card.value}
              </p>
              <p className="mt-2 text-xs leading-5 text-slate-400">{card.detail}</p>
              
              {/* Mini progress bar for hit rate */}
              {card.label === 'Hit Rate' && card.value.includes('%') && (
                <div className="mt-3 h-1 bg-white/10 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-emerald-400 rounded-full transition-all duration-500"
                    style={{ width: card.value }}
                  />
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Quick insight */}
      {!loading && overallHitRate && (
        <div className="mt-4 pt-3 border-t border-white/10">
          <p className="text-xs text-slate-500 flex items-center gap-1">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            {parseFloat(overallHitRate) >= 60 
              ? 'Your model is performing above expectations!'
              : parseFloat(overallHitRate) >= 50
                ? 'Your model is performing at expected levels.'
                : 'Your model is underperforming. Consider reviewing calibration.'}
          </p>
        </div>
      )}
    </div>
  )
}