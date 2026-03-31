import { SkeletonBlock, SkeletonText } from '../ui/Skeleton'
import { useState, useMemo } from 'react'

export default function CalibrationPanel({ loading, calibrationBands, totalPredictions = 0 }) {
  const [expandedBand, setExpandedBand] = useState(null)
  const scoredPredictions = totalPredictions || calibrationBands?.reduce((total, band) => total + (band.sampleSize || 0), 0) || 0

  // Calculate overall calibration score
  const calibrationScore = useMemo(() => {
    if (!calibrationBands?.length) return null
    
    let totalAbsGap = 0
    let totalWeight = 0
    
    calibrationBands.forEach(band => {
      if (band.calibrationGap !== null && band.sampleSize > 0) {
        totalAbsGap += Math.abs(band.calibrationGap) * band.sampleSize
        totalWeight += band.sampleSize
      }
    })
    
    return totalWeight > 0 ? (totalAbsGap / totalWeight).toFixed(1) : null
  }, [calibrationBands])

  const getCalibrationStatus = (gap) => {
    if (gap === null) return { text: 'Insufficient data', color: 'text-slate-400' }
    if (Math.abs(gap) <= 5) return { text: 'Well calibrated', color: 'text-emerald-400' }
    if (gap > 5) return { text: 'Overconfident', color: 'text-amber-400' }
    if (gap < -5) return { text: 'Underconfident', color: 'text-sky-400' }
    return { text: 'Needs improvement', color: 'text-slate-400' }
  }

  return (
    <div className="glass-panel rounded-[28px] p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="data-label text-xs uppercase text-slate-400">Calibration</p>
          <p className="mt-1 text-lg font-semibold text-white">Confidence honesty by band</p>
        </div>
        <div className="flex gap-2">
          {calibrationScore !== null && (
            <span className="rounded-full border border-sky-400/30 bg-sky-500/10 px-3 py-1 text-xs text-sky-300">
              Score: {calibrationScore} pts
            </span>
          )}
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
            {scoredPredictions} scored
          </span>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {(loading ? Array.from({ length: 3 }, (_, index) => ({ id: index, loading: true })) : calibrationBands).map((band) => {
          if (band.loading) {
            return (
              <div key={band.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <SkeletonText className="h-4 w-24" />
                    <SkeletonText className="mt-2 h-4 w-52 max-w-full" />
                  </div>
                  <SkeletonBlock className="h-8 w-20 rounded-full" />
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <SkeletonBlock className="h-16 rounded-2xl" />
                  <SkeletonBlock className="h-16 rounded-2xl" />
                  <SkeletonBlock className="h-16 rounded-2xl" />
                </div>
              </div>
            )
          }

          const isHot = band.calibrationGap !== null && band.calibrationGap >= 0
          const calibrationStatus = getCalibrationStatus(band.calibrationGap)
          const isExpanded = expandedBand === band.id

          return (
            <div 
              key={band.id} 
              className="rounded-2xl border border-white/10 bg-white/5 p-4 transition-all duration-200 hover:bg-white/10 cursor-pointer"
              onClick={() => setExpandedBand(isExpanded ? null : band.id)}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-white">{band.id}% band</p>
                    <span className={`text-xs ${calibrationStatus.color}`}>
                      {calibrationStatus.text}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-400">
                    {band.sampleSize ? `${band.sampleSize} finished matches scored in this range.` : 'No finished matches in this range yet.'}
                  </p>
                </div>
                <span
                  className={[
                    'rounded-full border px-3 py-1 text-xs font-medium transition-all',
                    band.calibrationGap === null
                      ? 'border-white/10 bg-white/5 text-slate-300'
                      : isHot
                        ? 'border-emerald-400/30 bg-emerald-500/15 text-emerald-200'
                        : 'border-amber-400/30 bg-amber-500/15 text-amber-200',
                  ].join(' ')}
                >
                  {band.calibrationGap === null ? 'Waiting' : `${band.calibrationGap > 0 ? '+' : ''}${band.calibrationGap} pts`}
                </span>
              </div>

              {/* Progress bar visualization */}
              {band.expectedHitRate !== null && band.actualHitRate !== null && (
                <div className="mt-4">
                  <div className="flex justify-between text-xs text-slate-400 mb-1">
                    <span>Expected: {band.expectedHitRate}%</span>
                    <span>Actual: {band.actualHitRate}%</span>
                  </div>
                  <div className="relative h-2 bg-white/10 rounded-full overflow-hidden">
                    <div 
                      className="absolute h-full bg-sky-500/50 rounded-full"
                      style={{ width: `${band.expectedHitRate}%` }}
                    />
                    <div 
                      className="absolute h-full bg-emerald-400 rounded-full"
                      style={{ width: `${band.actualHitRate}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-slate-950/45 px-3 py-3 hover:bg-slate-950/60 transition">
                  <p className="data-label text-[11px] uppercase text-slate-500">Expected</p>
                  <p className="mt-2 text-sm font-medium text-white">
                    {band.expectedHitRate !== null ? `${band.expectedHitRate}%` : 'N/A'}
                  </p>
                  {band.expectedHitRate !== null && (
                    <p className="mt-1 text-[10px] text-slate-500">
                      {Math.round(band.expectedHitRate * band.sampleSize / 100)} predicted hits
                    </p>
                  )}
                </div>
                <div className="rounded-2xl border border-white/10 bg-slate-950/45 px-3 py-3 hover:bg-slate-950/60 transition">
                  <p className="data-label text-[11px] uppercase text-slate-500">Actual</p>
                  <p className="mt-2 text-sm font-medium text-white">
                    {band.actualHitRate !== null ? `${band.actualHitRate}%` : 'N/A'}
                  </p>
                  {band.actualHitRate !== null && (
                    <p className="mt-1 text-[10px] text-slate-500">
                      {Math.round(band.actualHitRate * band.sampleSize / 100)} actual hits
                    </p>
                  )}
                </div>
                <div className="rounded-2xl border border-white/10 bg-slate-950/45 px-3 py-3 hover:bg-slate-950/60 transition">
                  <p className="data-label text-[11px] uppercase text-slate-500">Gap</p>
                  <p className={`mt-2 text-sm font-medium ${band.calibrationGap > 0 ? 'text-amber-300' : band.calibrationGap < 0 ? 'text-sky-300' : 'text-emerald-300'}`}>
                    {band.calibrationGap !== null ? `${band.calibrationGap > 0 ? '+' : ''}${band.calibrationGap} pts` : 'N/A'}
                  </p>
                  {band.calibrationGap !== null && (
                    <p className="mt-1 text-[10px] text-slate-500">
                      {Math.abs(band.calibrationGap) <= 5 ? 'Good calibration' : 'Needs adjustment'}
                    </p>
                  )}
                </div>
              </div>

              {/* Expanded details */}
              {isExpanded && band.sampleSize > 0 && (
                <div className="mt-4 pt-4 border-t border-white/10">
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <p className="text-slate-500">Total predictions</p>
                      <p className="text-white font-medium">{band.sampleSize}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Correct predictions</p>
                      <p className="text-white font-medium">{Math.round(band.actualHitRate * band.sampleSize / 100)}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Missed predictions</p>
                      <p className="text-white font-medium">{band.sampleSize - Math.round(band.actualHitRate * band.sampleSize / 100)}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Overall calibration insight */}
      {!loading && calibrationScore !== null && (
        <div className="mt-5 pt-4 border-t border-white/10">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-slate-400">Overall calibration:</span>
            <span className={`font-medium ${parseFloat(calibrationScore) <= 5 ? 'text-emerald-400' : 'text-amber-400'}`}>
              {parseFloat(calibrationScore) <= 5 ? 'Good' : 'Needs improvement'}
            </span>
            <button
              onClick={() => setExpandedBand(null)}
              className="ml-auto text-xs text-slate-500 hover:text-slate-300 transition"
            >
              {expandedBand ? 'Collapse all' : 'Expand all'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}