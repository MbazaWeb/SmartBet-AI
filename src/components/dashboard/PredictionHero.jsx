import { useState, useEffect } from 'react'

export default function PredictionHero({ topPredictions, loading, error, lastUpdated, refreshing, outcomeLabels }) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [autoplay, setAutoplay] = useState(true)

  // Autoplay carousel
  useEffect(() => {
    if (!autoplay || !topPredictions?.length) return
    
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % Math.min(topPredictions.length, 3))
    }, 5000)
    
    return () => clearInterval(interval)
  }, [autoplay, topPredictions])

  const visiblePredictions = topPredictions?.slice(0, 3) || []

  return (
    <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
      <div className="glass-panel rounded-[32px] p-6 sm:p-8">
        <p className="data-label text-xs uppercase text-emerald-400/80">Prediction stories</p>
        <h1 className="mt-4 text-4xl font-bold tracking-tight text-white sm:text-5xl">
          AI feed for sharp match analysis
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
          Scroll the prediction feed like an Instagram timeline, then review finished matches on the results page to see whether the call landed.
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-slate-400">
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 flex items-center gap-1">
            <span className="animate-pulse text-emerald-400">●</span>
            Auto-refresh every 60s
          </span>
          {lastUpdated && (
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
              Last updated {lastUpdated}
            </span>
          )}
          {refreshing && (
            <span className="text-emerald-300 flex items-center gap-1">
              <svg className="animate-spin h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Refreshing...
            </span>
          )}
        </div>

        {/* Stories carousel */}
        <div className="mt-6 relative">
          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {[1, 2].map((i) => (
                <div key={i} className="rounded-3xl border border-white/10 bg-white/5 px-5 py-6 animate-pulse">
                  <div className="h-4 bg-white/10 rounded w-1/3 mb-4"></div>
                  <div className="h-6 bg-white/10 rounded w-2/3 mb-2"></div>
                  <div className="h-4 bg-white/10 rounded w-full"></div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="rounded-3xl border border-rose-400/20 bg-rose-500/10 px-5 py-6 text-center">
              <p className="text-sm text-rose-200">Unable to load top predictions</p>
            </div>
          ) : visiblePredictions.length > 0 ? (
            <>
              <div className="relative overflow-hidden">
                <div 
                  className="transition-transform duration-500 ease-out"
                  style={{ transform: `translateX(-${currentIndex * 100}%)` }}
                >
                  <div className="flex">
                    {visiblePredictions.map((match, index) => (
                      <div key={match.id} className="w-full flex-shrink-0 px-2">
                        <div className="rounded-3xl border border-white/10 bg-white/5 p-5 hover:bg-white/10 transition cursor-pointer">
                          <div className="flex items-center justify-between gap-3">
                            <p className="data-label text-xs uppercase text-slate-400">Story {index + 1}</p>
                            <span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-200">
                              {match.competition?.name || 'Unknown'}
                            </span>
                          </div>
                          <p className="mt-4 text-xl font-semibold text-white">
                            {match.homeTeam?.name} vs {match.awayTeam?.name}
                          </p>
                          <p className="mt-2 text-sm text-slate-400 line-clamp-2">
                            {match.analysis?.caption || 'AI is building a confidence read for this match.'}
                          </p>
                          <div className="mt-4 flex items-end justify-between gap-3">
                            <div>
                              <p className="data-label text-[11px] uppercase text-slate-500">Strongest angle</p>
                              <p className="mt-1 text-lg font-medium text-emerald-300">
                                {outcomeLabels?.[match.strongestOutcome] || 'N/A'}
                              </p>
                            </div>
                            <p className="text-4xl font-bold tracking-tight text-white">
                              {match.strongestValue}%
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              {/* Carousel controls */}
              {visiblePredictions.length > 1 && (
                <div className="flex justify-center gap-2 mt-4">
                  {visiblePredictions.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setAutoplay(false)
                        setCurrentIndex(idx)
                        setTimeout(() => setAutoplay(true), 5000)
                      }}
                      className={`h-2 rounded-full transition-all ${
                        currentIndex === idx ? 'w-6 bg-emerald-400' : 'w-2 bg-white/30 hover:bg-white/50'
                      }`}
                      aria-label={`Go to story ${idx + 1}`}
                    />
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="rounded-3xl border border-white/10 bg-white/5 px-5 py-6 text-center">
              <p className="text-sm text-slate-400">No top predictions available yet</p>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}