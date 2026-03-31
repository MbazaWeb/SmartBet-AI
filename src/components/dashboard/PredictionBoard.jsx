import { SkeletonBlock, SkeletonText } from '../ui/Skeleton'
import { useState } from 'react'

export default function PredictionBoard({ loading, researchDigest, trainingSummary }) {
  const [expandedNote, setExpandedNote] = useState(null)

  const getConfidenceColor = (value) => {
    if (value >= 70) return 'text-emerald-400'
    if (value >= 50) return 'text-amber-400'
    return 'text-slate-400'
  }

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
          {researchDigest?.notes && researchDigest.notes.length > 0 && (
            <div className="mt-5 space-y-4">
              {researchDigest.notes.map((note, index) => (
                <div 
                  key={index} 
                  className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm leading-6 text-slate-300 hover:bg-white/10 transition cursor-pointer"
                  onClick={() => setExpandedNote(expandedNote === index ? null : index)}
                >
                  <div className="flex items-start gap-2">
                    <span className="text-emerald-400 text-lg mt-0.5">💡</span>
                    <div className="flex-1">
                      <p className={expandedNote === index ? '' : 'line-clamp-2'}>
                        {note}
                      </p>
                      {note.length > 150 && (
                        <button className="mt-2 text-xs text-emerald-400 hover:text-emerald-300 transition">
                          {expandedNote === index ? 'Show less' : 'Read more'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {trainingSummary && (
            <div className="mt-5 rounded-2xl border border-sky-400/20 bg-sky-500/10 p-4 text-sm text-sky-100 transition-all hover:bg-sky-500/15">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  <svg className="w-5 h-5 text-sky-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="font-medium text-white">{trainingSummary.competitionName}</p>
                  <p className="mt-1 break-words text-sky-100/80">
                    {trainingSummary.seasonName} · {trainingSummary.sampledMatches} matches sampled
                  </p>
                  <div className="mt-3 flex flex-wrap gap-3 text-xs">
                    <span className="rounded-full bg-white/10 px-2 py-1">
                      Avg goals: {trainingSummary.averageGoals}
                    </span>
                    {trainingSummary.confidenceScore && (
                      <span className={`rounded-full bg-white/10 px-2 py-1 ${getConfidenceColor(trainingSummary.confidenceScore)}`}>
                        Confidence: {trainingSummary.confidenceScore}%
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Model performance indicator */}
          {researchDigest?.modelVersion && (
            <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
              <span className="rounded-full border border-white/10 px-2 py-1">
                Model v{researchDigest.modelVersion}
              </span>
              {researchDigest.lastTrainingDate && (
                <span>
                  Last trained: {new Date(researchDigest.lastTrainingDate).toLocaleDateString()}
                </span>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}