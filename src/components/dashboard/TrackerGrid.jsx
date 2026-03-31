import { formatKickoff, formatScore } from '../../features/dashboard/helpers'
import { useState } from 'react'

export default function TrackerGrid({ 
  liveMatches, 
  nextUpcomingMatch, 
  playedMatches, 
  matches, 
  liveTrackerMatches, 
  recentPlayedMatches, 
  upcomingTrackerMatches 
}) {
  const [selectedTracker, setSelectedTracker] = useState(null)

  const getLiveMatchCount = () => {
    if (liveTrackerMatches?.length) return liveTrackerMatches.length
    return liveMatches?.length || 0
  }

  const getUpcomingCount = () => {
    return matches?.length || 0
  }

  const trackers = [
    {
      id: 'live',
      title: 'Live badge',
      badge: 'LIVE',
      badgeColor: 'rose',
      count: getLiveMatchCount(),
      matches: liveTrackerMatches || liveMatches || [],
      emptyMessage: 'No live matches right now.',
      renderMatch: (match) => (
        <>
          <div className="flex items-center justify-between gap-3">
            <p className="font-medium text-white">{match.homeTeam?.name} vs {match.awayTeam?.name}</p>
            <span className="text-rose-200 text-xs animate-pulse">LIVE</span>
          </div>
          <p className="mt-2 text-slate-400">{formatScore(match.score)} · {match.competition?.name}</p>
        </>
      )
    },
    {
      id: 'next',
      title: 'Next match',
      badge: 'NEXT',
      badgeColor: 'sky',
      count: nextUpcomingMatch ? 1 : 0,
      matches: nextUpcomingMatch ? [nextUpcomingMatch] : [],
      emptyMessage: 'No next match is available.',
      renderMatch: (match) => (
        <>
          <p className="text-lg font-semibold text-white">{match.homeTeam?.name} vs {match.awayTeam?.name}</p>
          <p className="mt-2 text-sm text-slate-400">{match.competition?.name}</p>
          <p className="mt-2 text-sm text-slate-300 flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {formatKickoff(match.utcDate)}
          </p>
        </>
      )
    },
    {
      id: 'played',
      title: 'Match played',
      badge: 'PLAYED',
      badgeColor: 'amber',
      count: playedMatches?.length || 0,
      matches: recentPlayedMatches || playedMatches?.slice(0, 3) || [],
      emptyMessage: 'No completed matches have been returned yet.',
      renderMatch: (match) => (
        <>
          <p className="font-medium text-white">{match.homeTeam?.name} vs {match.awayTeam?.name}</p>
          <p className="mt-2 text-slate-400">{formatScore(match.score)} · {match.competition?.name}</p>
        </>
      )
    },
    {
      id: 'upcoming',
      title: 'Upcoming match',
      badge: 'UPCOMING',
      badgeColor: 'emerald',
      count: getUpcomingCount(),
      matches: upcomingTrackerMatches || matches?.slice(0, 3) || [],
      emptyMessage: 'No upcoming matches are available.',
      renderMatch: (match) => (
        <>
          <p className="font-medium text-white">{match.homeTeam?.name} vs {match.awayTeam?.name}</p>
          <p className="mt-2 text-slate-400 flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {formatKickoff(match.utcDate)}
          </p>
        </>
      )
    }
  ]

  const getBadgeStyles = (color) => {
    const styles = {
      rose: 'border-rose-400/30 bg-rose-500/15 text-rose-200',
      sky: 'border-sky-400/30 bg-sky-500/15 text-sky-200',
      amber: 'border-amber-400/30 bg-amber-500/15 text-amber-200',
      emerald: 'border-emerald-400/30 bg-emerald-500/15 text-emerald-200'
    }
    return styles[color] || styles.emerald
  }

  return (
    <section className="mt-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="data-label text-xs uppercase text-slate-400">Match tracker</p>
          <h2 className="mt-1 text-2xl font-semibold text-white">Live, next, played, and upcoming matches</h2>
        </div>
        <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300 flex items-center gap-1">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          Powered by API match status
        </span>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {trackers.map((tracker) => (
          <div 
            key={tracker.id} 
            className="glass-panel rounded-[28px] p-5 transition-all hover:bg-white/5 cursor-pointer"
            onClick={() => setSelectedTracker(selectedTracker === tracker.id ? null : tracker.id)}
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-white">{tracker.title}</p>
              <span className={['rounded-full border px-3 py-1 text-xs font-medium', getBadgeStyles(tracker.badgeColor)].join(' ')}>
                {tracker.badge}
              </span>
            </div>
            
            <p className="mt-3 text-3xl font-bold tracking-tight text-white">{tracker.count}</p>
            
            <div className={`mt-4 space-y-3 text-sm text-slate-300 transition-all ${selectedTracker === tracker.id ? '' : 'max-h-48 overflow-hidden'}`}>
              {tracker.matches.length ? (
                tracker.matches.slice(0, selectedTracker === tracker.id ? undefined : 2).map((match) => (
                  <div key={match.id} className="rounded-2xl border border-white/10 bg-white/5 p-3 hover:bg-white/10 transition">
                    {tracker.renderMatch(match)}
                  </div>
                ))
              ) : (
                <p className="rounded-2xl border border-white/10 bg-white/5 p-3 text-slate-400">{tracker.emptyMessage}</p>
              )}
            </div>
            
            {tracker.matches.length > 2 && (
              <button 
                className="mt-3 text-xs text-emerald-400 hover:text-emerald-300 transition flex items-center gap-1"
                onClick={(e) => {
                  e.stopPropagation()
                  setSelectedTracker(selectedTracker === tracker.id ? null : tracker.id)
                }}
              >
                {selectedTracker === tracker.id ? 'Show less' : `Show all (${tracker.matches.length})`}
                <svg className={`w-3 h-3 transition-transform ${selectedTracker === tracker.id ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}