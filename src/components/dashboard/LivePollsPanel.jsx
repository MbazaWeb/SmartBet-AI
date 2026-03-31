export default function LivePollsPanel({ livePolls, handleVote }) {
  return (
    <div className="glass-panel rounded-[28px] p-5">
      <p className="data-label text-xs uppercase text-slate-400">Live polls</p>
      <div className="mt-4 space-y-4">
        {livePolls.map((poll) => {
          const totalVotes = poll.options.reduce((total, option) => total + option.votes, 0)

          return (
            <div key={poll.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-sm font-medium text-white">{poll.question}</p>
              <div className="mt-3 space-y-2">
                {poll.options.map((option) => {
                  const width = totalVotes ? `${Math.round((option.votes / totalVotes) * 100)}%` : '0%'
                  const isSelected = poll.selectedOptionId === option.id

                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => handleVote(poll.id, option.id)}
                      className={[
                        'block w-full rounded-2xl border px-3 py-3 text-left transition',
                        isSelected
                          ? 'border-emerald-400/35 bg-emerald-500/12'
                          : 'border-white/10 bg-slate-950/50 hover:bg-white/5',
                      ].join(' ')}
                    >
                      <div className="flex items-center justify-between gap-3 text-sm text-slate-200">
                        <span>{option.label}</span>
                        <span>{option.votes}</span>
                      </div>
                      <div className="mt-2 h-2 rounded-full bg-white/5">
                        <div className="h-2 rounded-full bg-emerald-400" style={{ width }} />
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
