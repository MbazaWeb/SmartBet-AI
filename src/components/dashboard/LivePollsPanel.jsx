import { SkeletonBlock, SkeletonText } from '../ui/Skeleton'
import { useState } from 'react'

export default function LivePollsPanel({ loading, livePolls, handleVote }) {
  const [votingPolls, setVotingPolls] = useState({})
  const [voteSuccess, setVoteSuccess] = useState({})

  const handleVoteWithFeedback = async (pollId, optionId) => {
    if (votingPolls[pollId]) return

    setVotingPolls(prev => ({ ...prev, [pollId]: true }))
    
    try {
      await handleVote(pollId, optionId)
      setVoteSuccess(prev => ({ ...prev, [pollId]: true }))
      setTimeout(() => {
        setVoteSuccess(prev => ({ ...prev, [pollId]: false }))
      }, 2000)
    } catch (error) {
      console.error('Vote failed:', error)
    } finally {
      setVotingPolls(prev => ({ ...prev, [pollId]: false }))
    }
  }

  if (!loading && (!livePolls || livePolls.length === 0)) {
    return (
      <div className="glass-panel rounded-[28px] p-5">
        <p className="data-label text-xs uppercase text-slate-400">Live polls</p>
        <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-6 text-center">
          <p className="text-sm text-slate-400">No active polls available</p>
          <p className="text-xs text-slate-500 mt-1">Check back later for new community polls</p>
        </div>
      </div>
    )
  }

  return (
    <div className="glass-panel rounded-[28px] p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="data-label text-xs uppercase text-slate-400">Live polls</p>
        <span className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-300">
          {livePolls?.length || 0} active
        </span>
      </div>
      
      <div className="mt-4 space-y-4">
        {(loading ? Array.from({ length: 2 }, (_, index) => ({ id: index, loading: true })) : livePolls).map((poll) => {
          if (poll.loading) {
            return (
              <div key={poll.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <SkeletonText className="h-4 w-4/5" />
                <div className="mt-3 space-y-2">
                  {[0, 1, 2].map((option) => (
                    <div key={option} className="rounded-2xl border border-white/10 bg-slate-950/50 px-3 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <SkeletonText className="h-4 w-24" />
                        <SkeletonText className="h-4 w-8" />
                      </div>
                      <SkeletonBlock className="mt-2 h-2 rounded-full" />
                    </div>
                  ))}
                </div>
              </div>
            )
          }

          const totalVotes = poll.options.reduce((total, option) => total + (option.votes || 0), 0)
          const isVoting = votingPolls[poll.id]
          const hasVoted = voteSuccess[poll.id] || poll.selectedOptionId

          return (
            <div key={poll.id} className={`rounded-2xl border border-white/10 bg-white/5 p-4 transition-all ${hasVoted ? 'border-emerald-400/30' : ''}`}>
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-medium text-white">{poll.question}</p>
                {hasVoted && (
                  <span className="animate-pulse text-xs text-emerald-400">✓ Voted</span>
                )}
              </div>
              
              <p className="text-xs text-slate-500 mt-1">
                {totalVotes} {totalVotes === 1 ? 'vote' : 'votes'} · {poll.expiresAt ? `Ends ${new Date(poll.expiresAt).toLocaleDateString()}` : 'Vote now'}
              </p>
              
              <div className="mt-3 space-y-2">
                {poll.options.map((option) => {
                  const percentage = totalVotes ? Math.round((option.votes / totalVotes) * 100) : 0
                  const isSelected = poll.selectedOptionId === option.id

                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => handleVoteWithFeedback(poll.id, option.id)}
                      disabled={isVoting || hasVoted}
                      className={[
                        'block w-full rounded-2xl border px-3 py-3 text-left transition-all duration-200 relative overflow-hidden',
                        isSelected
                          ? 'border-emerald-400/35 bg-emerald-500/12'
                          : 'border-white/10 bg-slate-950/50 hover:bg-white/5',
                        (isVoting || hasVoted) ? 'cursor-not-allowed opacity-75' : 'cursor-pointer',
                      ].join(' ')}
                    >
                      <div className="relative z-10 flex items-center justify-between gap-3 text-sm text-slate-200">
                        <span className="flex items-center gap-2">
                          {isSelected && (
                            <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                          {option.label}
                        </span>
                        <span className="font-mono">{option.votes}</span>
                      </div>
                      <div 
                        className="absolute inset-0 bg-emerald-400/10 transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      />
                      <div className="relative z-10 mt-1 flex items-center justify-between text-xs">
                        <span className="text-slate-400">{percentage}%</span>
                      </div>
                    </button>
                  )
                })}
              </div>

              {isVoting && (
                <div className="mt-3 flex items-center justify-center gap-2 text-xs text-emerald-400">
                  <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Recording your vote...
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}