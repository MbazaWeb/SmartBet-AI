import { formatKickoff, formatScore } from '../../features/dashboard/helpers'

export default function TrackerGrid({ liveMatches, nextUpcomingMatch, playedMatches, matches, liveTrackerMatches, recentPlayedMatches, upcomingTrackerMatches }) {
  return (
    <section className="mt-8">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="data-label text-xs uppercase text-slate-400">Match tracker</p>
          <h3 className="mt-1 text-2xl font-semibold text-white">Live, next, played, and upcoming matches</h3>
        </div>
        <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300">
          Powered by API match status
        </span>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="glass-panel rounded-[28px] p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium text-white">Live badge</p>
            <span className="rounded-full border border-rose-400/30 bg-rose-500/15 px-3 py-1 text-xs font-medium text-rose-200">
              LIVE
            </span>
          </div>
          <p className="mt-3 text-3xl font-bold tracking-tight text-white">{liveMatches.length}</p>
          <div className="mt-4 space-y-3 text-sm text-slate-300">
            {liveTrackerMatches.length ? liveTrackerMatches.map((match) => (
              <div key={match.id} className="rounded-2xl border border-white/10 bg-white/5 p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium text-white">{match.homeTeam.name} vs {match.awayTeam.name}</p>
                  <span className="text-rose-200">{match.statusLabel}</span>
                </div>
                <p className="mt-2 text-slate-400">{formatScore(match.score)} · {match.competition.name}</p>
              </div>
            )) : <p className="rounded-2xl border border-white/10 bg-white/5 p-3 text-slate-400">No live matches right now.</p>}
          </div>
        </div>

        <div className="glass-panel rounded-[28px] p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium text-white">Next match</p>
            <span className="rounded-full border border-sky-400/30 bg-sky-500/15 px-3 py-1 text-xs font-medium text-sky-200">
              NEXT
            </span>
          </div>
          {nextUpcomingMatch ? (
            <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-lg font-semibold text-white">{nextUpcomingMatch.homeTeam.name} vs {nextUpcomingMatch.awayTeam.name}</p>
              <p className="mt-2 text-sm text-slate-400">{nextUpcomingMatch.competition.name}</p>
              <p className="mt-2 text-sm text-slate-300">{formatKickoff(nextUpcomingMatch.utcDate)}</p>
            </div>
          ) : (
            <p className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-400">No next match is available.</p>
          )}
        </div>

        <div className="glass-panel rounded-[28px] p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium text-white">Match played</p>
            <span className="rounded-full border border-amber-400/30 bg-amber-500/15 px-3 py-1 text-xs font-medium text-amber-200">
              PLAYED
            </span>
          </div>
          <p className="mt-3 text-3xl font-bold tracking-tight text-white">{playedMatches.length}</p>
          <div className="mt-4 space-y-3 text-sm text-slate-300">
            {recentPlayedMatches.length ? recentPlayedMatches.map((match) => (
              <div key={match.id} className="rounded-2xl border border-white/10 bg-white/5 p-3">
                <p className="font-medium text-white">{match.homeTeam.name} vs {match.awayTeam.name}</p>
                <p className="mt-2 text-slate-400">{formatScore(match.score)} · {match.competition.name}</p>
              </div>
            )) : <p className="rounded-2xl border border-white/10 bg-white/5 p-3 text-slate-400">No completed matches have been returned yet.</p>}
          </div>
        </div>

        <div className="glass-panel rounded-[28px] p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium text-white">Upcoming match</p>
            <span className="rounded-full border border-emerald-400/30 bg-emerald-500/15 px-3 py-1 text-xs font-medium text-emerald-200">
              UPCOMING
            </span>
          </div>
          <p className="mt-3 text-3xl font-bold tracking-tight text-white">{matches.length}</p>
          <div className="mt-4 space-y-3 text-sm text-slate-300">
            {upcomingTrackerMatches.length ? upcomingTrackerMatches.map((match) => (
              <div key={match.id} className="rounded-2xl border border-white/10 bg-white/5 p-3">
                <p className="font-medium text-white">{match.homeTeam.name} vs {match.awayTeam.name}</p>
                <p className="mt-2 text-slate-400">{formatKickoff(match.utcDate)}</p>
              </div>
            )) : <p className="rounded-2xl border border-white/10 bg-white/5 p-3 text-slate-400">No upcoming matches are available.</p>}
          </div>
        </div>
      </div>
    </section>
  )
}
