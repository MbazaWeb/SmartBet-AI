export default function PredictionNotesPanel({ researchDigest, teamIntel }) {
  return (
    <div className="glass-panel rounded-[28px] p-5">
      <p className="data-label text-xs uppercase text-slate-400">Prediction notes</p>
      <div className="mt-4 space-y-3 text-sm leading-6 text-slate-300">
        <p>{researchDigest?.summary || 'AI research summaries will appear here once the backend finishes building the feed.'}</p>
        {teamIntel.slice(0, 2).map((item) => (
          <div key={item.fixtureId} className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="font-medium text-white">{item.team.name}</p>
            <p className="mt-1 text-slate-400">{item.team.league} · {item.team.stadium || 'Venue pending'}</p>
            {item.featuredPlayer ? (
              <p className="mt-2 text-slate-300">{item.featuredPlayer.name} · {item.featuredPlayer.position}</p>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  )
}
