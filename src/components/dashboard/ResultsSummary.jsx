export default function ResultsSummary({ resultsCards }) {
  return (
    <div className="glass-panel rounded-[28px] p-5">
      <p className="data-label text-xs uppercase text-slate-400">Results</p>
      <div className="mt-4 space-y-3">
        {resultsCards.map((card) => (
          <div key={card.label} className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-sm font-medium text-white">{card.label}</p>
            <p className="mt-2 text-2xl font-bold text-emerald-300">{card.value}</p>
            <p className="mt-2 text-sm leading-6 text-slate-400">{card.detail}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
