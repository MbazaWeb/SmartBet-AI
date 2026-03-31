import { SkeletonBlock, SkeletonText } from '../ui/Skeleton'

export default function PredictionBoard({ loading, researchDigest, trainingSummary }) {
  return (
    <div className="glass-panel rounded-[32px] p-6 sm:p-8" id="prediction">
      <p className="data-label text-xs uppercase text-slate-400">Prediction board</p>
      <h3 className="mt-4 text-xl font-semibold text-white sm:text-2xl">Prediction model, training, and provider context</h3>
      <p className="mt-3 text-sm leading-6 text-slate-400">
        The backend research layer blends API-Football fixtures, TheSportsDB player/team context, and StatsBomb reference data into social-ready analysis.
      </p>

      {loading ? (
        <div className="mt-5 space-y-4">
          {[0, 1, 2].map((index) => (
            <div key={index} className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <SkeletonText className="h-4 w-11/12" />
              <SkeletonText className="mt-3 h-4 w-4/5" />
            </div>
          ))}
          <SkeletonBlock className="h-24 rounded-2xl border border-sky-400/20 bg-sky-500/10" />
        </div>
      ) : (
        <>
          <div className="mt-5 space-y-4">
            {researchDigest?.notes?.map((note) => (
              <div key={note} className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm leading-6 text-slate-300">
                {note}
              </div>
            ))}
          </div>

          {trainingSummary ? (
            <div className="mt-5 rounded-2xl border border-sky-400/20 bg-sky-500/10 p-4 text-sm text-sky-100">
              <p className="font-medium text-white">{trainingSummary.competitionName}</p>
              <p className="mt-2 break-words">{trainingSummary.seasonName} · {trainingSummary.sampledMatches} matches sampled · Avg goals {trainingSummary.averageGoals}</p>
            </div>
          ) : null}
        </>
      )}
    </div>
  )
}
