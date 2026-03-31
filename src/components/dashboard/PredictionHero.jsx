export default function PredictionHero({ topPredictions, loading, error, lastUpdated, refreshing, outcomeLabels }) {
  return (
    <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
      <div className="glass-panel rounded-[32px] p-6 sm:p-8">
        <p className="data-label text-xs uppercase text-emerald-400/80">Prediction stories</p>
        <h2 className="mt-4 text-4xl font-bold tracking-tight text-white sm:text-5xl">
          AI feed for sharp match analysis
        </h2>
        <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
          Scroll the prediction feed like an Instagram timeline, then review finished matches on the results page to see whether the call landed.
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-slate-400">
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
            Auto-refresh every 60s
          </span>
          {lastUpdated ? <span>Last updated {lastUpdated}</span> : null}
          {refreshing ? <span className="text-emerald-300">Refreshing live data...</span> : null}
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {loading ? (
            <div className="rounded-3xl border border-white/10 bg-white/5 px-5 py-6 text-sm text-slate-300">
              Loading top stories...
            </div>
          ) : null}

          {!loading && !error
            ? topPredictions.map((match, index) => (
                <div key={match.id} className="rounded-3xl border border-white/10 bg-white/5 p-5">
                  <div className="flex items-center justify-between gap-3">
                    <p className="data-label text-xs uppercase text-slate-400">Story {index + 1}</p>
                    <span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-200">
                      {match.competition.name}
                    </span>
                  </div>
                  <p className="mt-4 text-xl font-semibold text-white">{match.homeTeam.name} vs {match.awayTeam.name}</p>
                  <p className="mt-2 text-sm text-slate-400">{match.analysis?.caption || 'AI is building a confidence read for this match.'}</p>
                  <div className="mt-4 flex items-end justify-between gap-3">
                    <div>
                      <p className="data-label text-[11px] uppercase text-slate-500">Strongest angle</p>
                      <p className="mt-1 text-lg font-medium text-emerald-300">{outcomeLabels[match.strongestOutcome]}</p>
                    </div>
                    <p className="text-4xl font-bold tracking-tight text-white">{match.strongestValue}%</p>
                  </div>
                </div>
              ))
            : null}
        </div>
      </div>
    </section>
  )
}
