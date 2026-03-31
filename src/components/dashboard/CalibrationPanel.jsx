export default function CalibrationPanel({ calibrationBands }) {
  return (
    <div className="glass-panel rounded-[28px] p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="data-label text-xs uppercase text-slate-400">Calibration</p>
          <p className="mt-1 text-lg font-semibold text-white">Confidence honesty by band</p>
        </div>
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
          {calibrationBands.reduce((total, band) => total + band.sampleSize, 0)} scored
        </span>
      </div>

      <div className="mt-4 space-y-3">
        {calibrationBands.map((band) => {
          const isHot = band.calibrationGap !== null && band.calibrationGap >= 0

          return (
            <div key={band.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-white">{band.id}% band</p>
                  <p className="mt-1 text-xs text-slate-400">{band.sampleSize ? `${band.sampleSize} finished matches scored in this range.` : 'No finished matches in this range yet.'}</p>
                </div>
                <span
                  className={[
                    'rounded-full border px-3 py-1 text-xs font-medium',
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

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-slate-950/45 px-3 py-3">
                  <p className="data-label text-[11px] uppercase text-slate-500">Expected</p>
                  <p className="mt-2 text-sm font-medium text-white">{band.expectedHitRate !== null ? `${band.expectedHitRate}%` : 'N/A'}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-slate-950/45 px-3 py-3">
                  <p className="data-label text-[11px] uppercase text-slate-500">Actual</p>
                  <p className="mt-2 text-sm font-medium text-white">{band.actualHitRate !== null ? `${band.actualHitRate}%` : 'N/A'}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-slate-950/45 px-3 py-3">
                  <p className="data-label text-[11px] uppercase text-slate-500">Gap</p>
                  <p className="mt-2 text-sm font-medium text-white">{band.calibrationGap !== null ? `${band.calibrationGap > 0 ? '+' : ''}${band.calibrationGap} pts` : 'N/A'}</p>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}