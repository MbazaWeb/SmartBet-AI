import { SkeletonBlock, SkeletonText } from '../ui/Skeleton'
import { useState } from 'react'

export default function PredictionNotesPanel({ loading, researchDigest, teamIntel }) {
  const [expandedSections, setExpandedSections] = useState({})

  const toggleSection = (sectionId) => {
    setExpandedSections(prev => ({ ...prev, [sectionId]: !prev[sectionId] }))
  }

  const teamIntelData = teamIntel?.slice(0, 3) || []

  return (
    <div className="glass-panel rounded-[28px] p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="data-label text-xs uppercase text-slate-400">Prediction notes</p>
        {!loading && researchDigest?.summary && (
          <span className="text-[10px] text-slate-500">AI generated</span>
        )}
      </div>
      
      <div className="mt-4 space-y-3 text-sm leading-6 text-slate-300">
        {loading ? (
          <>
            <SkeletonText className="h-4 w-11/12" />
            <SkeletonText className="h-4 w-4/5" />
            {[0, 1].map((index) => (
              <div key={index} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <SkeletonText className="h-4 w-32" />
                <SkeletonText className="mt-3 h-4 w-44" />
                <SkeletonBlock className="mt-3 h-10 rounded-2xl" />
              </div>
            ))}
          </>
        ) : (
          <>
            {/* Research summary */}
            {researchDigest?.summary && (
              <div 
                className="rounded-2xl border border-white/10 bg-white/5 p-4 cursor-pointer hover:bg-white/10 transition"
                onClick={() => toggleSection('summary')}
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="font-medium text-white flex items-center gap-2">
                    <span>📊</span> AI Analysis
                  </p>
                  <svg 
                    className={`w-4 h-4 transition-transform ${expandedSections.summary ? 'rotate-180' : ''}`} 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
                <p className={`mt-2 text-slate-300 ${expandedSections.summary ? '' : 'line-clamp-2'}`}>
                  {researchDigest.summary}
                </p>
              </div>
            )}

            {/* Team intelligence */}
            {teamIntelData.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Team Intel</p>
                {teamIntelData.map((item, idx) => (
                  <div 
                    key={item.fixtureId || idx} 
                    className="rounded-2xl border border-white/10 bg-white/5 p-4 hover:bg-white/10 transition cursor-pointer"
                    onClick={() => toggleSection(`team-${idx}`)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-white">{item.team?.name || 'Unknown Team'}</p>
                        <p className="mt-1 text-xs text-slate-400">
                          {item.team?.league || 'League'} · {item.team?.stadium || 'Venue pending'}
                        </p>
                      </div>
                      {item.featuredPlayer && (
                        <span className="rounded-full border border-sky-400/30 bg-sky-500/10 px-2 py-0.5 text-xs text-sky-300">
                          Key player
                        </span>
                      )}
                    </div>
                    
                    {expandedSections[`team-${idx}`] && item.featuredPlayer && (
                      <div className="mt-3 pt-3 border-t border-white/10">
                        <p className="text-sm text-slate-300">
                          <span className="text-emerald-400">★</span> {item.featuredPlayer.name} · {item.featuredPlayer.position}
                        </p>
                        {item.featuredPlayer.stats && (
                          <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                            <div>
                              <p className="text-slate-500">Form</p>
                              <p className="text-white">{item.featuredPlayer.stats.form || 'N/A'}</p>
                            </div>
                            <div>
                              <p className="text-slate-500">Goals</p>
                              <p className="text-white">{item.featuredPlayer.stats.goals || 0}</p>
                            </div>
                            <div>
                              <p className="text-slate-500">Assists</p>
                              <p className="text-white">{item.featuredPlayer.stats.assists || 0}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {expandedSections[`team-${idx}`] && !item.featuredPlayer && (
                      <p className="mt-3 text-xs text-slate-400">No detailed player data available for this fixture.</p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {!researchDigest?.summary && teamIntelData.length === 0 && (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center">
                <p className="text-sm text-slate-400">No prediction notes available</p>
                <p className="text-xs text-slate-500 mt-1">Check back when more matches are loaded</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}