import { useEffect, useState } from 'react'
import useAuth from '../context/useAuth'
import { addMatchComment, fetchMatchThread, toggleMatchLike } from '../lib/matchSocial'

const outcomeLabels = {
  home: 'Home Win',
  draw: 'Draw',
  away: 'Away Win',
}

function formatKickoff(value) {
  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function formatPercent(value) {
  return `${value}%`
}

function formatForm(value) {
  return `${Math.round(value * 100)}%`
}

function formatGoals(value) {
  return value.toFixed(1)
}

function getStatusBadge(match, isNextMatch) {
  if (match.statusCategory === 'live') {
    return {
      label: match.statusLabel || 'Live',
      className: 'border-rose-400/30 bg-rose-500/15 text-rose-200',
    }
  }

  if (isNextMatch) {
    return {
      label: 'Next match',
      className: 'border-sky-400/30 bg-sky-500/15 text-sky-200',
    }
  }

  if (match.statusCategory === 'played') {
    return {
      label: 'Played',
      className: 'border-amber-400/30 bg-amber-500/15 text-amber-200',
    }
  }

  return {
    label: 'Upcoming match',
    className: 'border-emerald-400/30 bg-emerald-500/15 text-emerald-200',
  }
}

function MatchCard({ match, prediction, analysis, intel, isNextMatch = false }) {
  const strongestOutcome = Object.entries(prediction).sort((left, right) => right[1] - left[1])[0][0]
  const statusBadge = getStatusBadge(match, isNextMatch)
  const { user, openAuth, isConfigured } = useAuth()
  const [isLiked, setIsLiked] = useState(false)
  const [isSaved, setIsSaved] = useState(false)
  const [likes, setLikes] = useState(0)
  const [shares, setShares] = useState(0)
  const [comments, setComments] = useState([])
  const [commentDraft, setCommentDraft] = useState('')
  const [replyDrafts, setReplyDrafts] = useState({})
  const [replyingTo, setReplyingTo] = useState(null)
  const [interactionError, setInteractionError] = useState('')
  const [interactionLoading, setInteractionLoading] = useState(false)

  useEffect(() => {
    let active = true

    async function loadThread() {
      if (!isConfigured) {
        return
      }

      setInteractionLoading(true)

      try {
        const thread = await fetchMatchThread(match.id, user?.id)

        if (active) {
          setLikes(thread.likesCount)
          setComments(thread.comments)
          setIsLiked(thread.isLiked)
          setInteractionError('')
        }
      } catch (error) {
        if (active) {
          setInteractionError(error.message || 'Unable to sync match interactions.')
        }
      } finally {
        if (active) {
          setInteractionLoading(false)
        }
      }
    }

    loadThread()

    return () => {
      active = false
    }
  }, [isConfigured, match.id, user?.id])

  function getDisplayName() {
    return user?.email?.split('@')[0] || 'You'
  }

  async function handleToggleLike() {
    if (!isConfigured) {
      setInteractionError('Supabase is not configured for likes yet.')
      return
    }

    if (!user) {
      openAuth('signin')
      return
    }

    const nextLiked = !isLiked

    setInteractionError('')
    setIsLiked(nextLiked)
    setLikes((current) => current + (nextLiked ? 1 : -1))

    try {
      const thread = await toggleMatchLike(match.id, user.id, nextLiked)
      setLikes(thread.likesCount)
      setComments(thread.comments)
      setIsLiked(thread.isLiked)
    } catch (error) {
      setIsLiked(!nextLiked)
      setLikes((current) => current + (nextLiked ? -1 : 1))
      setInteractionError(error.message || 'Unable to update like.')
    }
  }

  function handleShare() {
    setShares((current) => current + 1)
  }

  async function handleAddComment(event) {
    event.preventDefault()

    if (!commentDraft.trim()) {
      return
    }

    if (!isConfigured) {
      setInteractionError('Supabase is not configured for comments yet.')
      return
    }

    if (!user) {
      openAuth('signin')
      return
    }

    setInteractionError('')

    try {
      const thread = await addMatchComment({
        fixtureId: match.id,
        authorId: user.id,
        authorName: getDisplayName(),
        body: commentDraft,
      })
      setComments(thread.comments)
      setLikes(thread.likesCount)
      setIsLiked(thread.isLiked)
      setCommentDraft('')
    } catch (error) {
      setInteractionError(error.message || 'Unable to post comment.')
    }
  }

  async function handleAddReply(commentId) {
    const nextReply = replyDrafts[commentId]?.trim()

    if (!nextReply) {
      return
    }

    if (!isConfigured) {
      setInteractionError('Supabase is not configured for replies yet.')
      return
    }

    if (!user) {
      openAuth('signin')
      return
    }

    setInteractionError('')

    try {
      const thread = await addMatchComment({
        fixtureId: match.id,
        parentId: commentId,
        authorId: user.id,
        authorName: getDisplayName(),
        body: nextReply,
      })
      setComments(thread.comments)
      setLikes(thread.likesCount)
      setIsLiked(thread.isLiked)
      setReplyDrafts((current) => ({ ...current, [commentId]: '' }))
      setReplyingTo(null)
    } catch (error) {
      setInteractionError(error.message || 'Unable to post reply.')
    }
  }

  const commentCount = comments.reduce((total, comment) => total + 1 + (comment.replies?.length ?? 0), 0)

  return (
    <article className="glass-panel overflow-hidden rounded-[30px] border-white/10">
      <div className="flex items-center justify-between gap-3 px-5 py-4 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-gradient-to-br from-emerald-400 to-sky-400 text-sm font-bold text-slate-950 shadow-[0_8px_30px_rgba(16,185,129,0.25)]">
            {(analysis?.analyst?.name || 'AI').slice(0, 2).toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-semibold text-white">{analysis?.analyst?.name || 'SmartBet AI'}</p>
            <p className="text-xs text-slate-400">{analysis?.analyst?.handle || '@smartbet.ai'} · {formatKickoff(match.utcDate)}</p>
          </div>
        </div>

        <button type="button" className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-slate-200 transition hover:bg-white/10">
          Following
        </button>
      </div>

      <div className="border-y border-white/10 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.22),_transparent_32%),linear-gradient(180deg,rgba(15,23,42,0.98),rgba(2,6,23,0.95))] px-5 py-6 sm:px-6">
        <div className="flex items-center justify-between gap-3 text-xs uppercase tracking-[0.2em] text-slate-400">
          <span>{match.competition.name}</span>
          <div className="flex items-center gap-2">
            <span>{analysis?.liveStatus ? 'Live research' : 'Prematch research'}</span>
            <span className={["rounded-full border px-3 py-1 text-[10px] font-semibold tracking-[0.18em]", statusBadge.className].join(' ')}>
              {statusBadge.label}
            </span>
          </div>
        </div>

        <div className="mt-5 flex items-center justify-between gap-4">
          <div className="max-w-[40%]">
            <div className="flex items-center gap-3">
              {match.homeTeam.logo ? <img src={match.homeTeam.logo} alt="" className="h-10 w-10 rounded-full bg-white/10 p-1" /> : null}
              <div>
                <p className="text-lg font-semibold text-white sm:text-2xl">{match.homeTeam.name}</p>
                <p className="text-xs text-slate-400">Home</p>
              </div>
            </div>
          </div>

          <div className="rounded-[28px] border border-emerald-400/25 bg-emerald-500/12 px-4 py-5 text-center shadow-[0_0_40px_rgba(34,197,94,0.08)]">
            <p className="data-label text-[11px] uppercase text-emerald-200">Prediction style</p>
            <p className="mt-2 text-4xl font-bold tracking-tight text-emerald-300">{prediction[strongestOutcome]}%</p>
            <p className="mt-1 text-sm text-emerald-100">{outcomeLabels[strongestOutcome]}</p>
            {match.model?.stability ? (
              <p className="mt-2 text-[11px] uppercase tracking-[0.18em] text-emerald-50/80">
                Stability {match.model.stability}
              </p>
            ) : null}
          </div>

          <div className="max-w-[40%] text-right">
            <div className="flex items-center justify-end gap-3">
              <div>
                <p className="text-lg font-semibold text-white sm:text-2xl">{match.awayTeam.name}</p>
                <p className="text-xs text-slate-400">Away</p>
              </div>
              {match.awayTeam.logo ? <img src={match.awayTeam.logo} alt="" className="h-10 w-10 rounded-full bg-white/10 p-1" /> : null}
            </div>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {Object.entries(prediction).map(([key, value]) => {
            const isStrongest = key === strongestOutcome

            return (
              <div
                key={key}
                className={[
                  'rounded-2xl border px-4 py-3',
                  isStrongest ? 'border-emerald-400/30 bg-emerald-500/12' : 'border-white/10 bg-white/5',
                ].join(' ')}
              >
                <p className="data-label text-[11px] uppercase text-slate-400">{outcomeLabels[key]}</p>
                <p className="mt-2 text-2xl font-bold text-white">{formatPercent(value)}</p>
              </div>
            )
          })}
        </div>
      </div>

      <div className="px-5 py-4 sm:px-6">
        <div className="flex items-center justify-between gap-3 text-sm text-slate-200">
          <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleToggleLike}
            className={[
              'rounded-full border px-3 py-2 transition',
              isLiked ? 'border-rose-400/40 bg-rose-500/15 text-rose-200' : 'border-white/10 bg-white/5 hover:bg-white/10',
            ].join(' ')}
          >
            Heart
          </button>
          <button type="button" className="rounded-full border border-white/10 bg-white/5 px-3 py-2 hover:bg-white/10">
            Comment
          </button>
          <button type="button" onClick={handleShare} className="rounded-full border border-white/10 bg-white/5 px-3 py-2 hover:bg-white/10">
            Send
          </button>
          </div>

          <button
            type="button"
            onClick={() => setIsSaved((current) => !current)}
            className={[
              'rounded-full border px-3 py-2 transition',
              isSaved ? 'border-sky-400/40 bg-sky-500/15 text-sky-100' : 'border-white/10 bg-white/5 hover:bg-white/10',
            ].join(' ')}
          >
            Save
          </button>
        </div>

        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-300">
          <span className="font-medium text-white">{likes} likes</span>
          <span>{commentCount} comments</span>
          <span>{shares} shares</span>
          {interactionLoading ? <span className="text-sky-200">Syncing...</span> : null}
        </div>

        <div className="mt-4 space-y-3">
          {commentCount ? <p className="text-sm font-medium text-slate-100">View all {commentCount} comments</p> : null}
          {interactionError ? (
            <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
              {interactionError}
            </div>
          ) : null}
          <p className="text-sm leading-6 text-slate-200">
            <span className="font-semibold text-white">{analysis?.analyst?.handle || '@smartbet.ai'}</span>{' '}
            {analysis?.caption || `${match.homeTeam.name} vs ${match.awayTeam.name} is leaning ${outcomeLabels[strongestOutcome].toLowerCase()}.`}
          </p>

          <div className="rounded-2xl border border-white/10 bg-slate-950/45 p-4">
            <p className="data-label text-[11px] uppercase text-slate-400">AI research</p>
            <div className="mt-3 space-y-2 text-sm leading-6 text-slate-300">
              {(analysis?.researchNotes || []).map((note) => (
                <p key={note}>{note}</p>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {(analysis?.researchTags || []).map((tag) => (
                <span key={tag} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] uppercase text-slate-300">
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {intel ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
              <p className="font-medium text-white">{intel.team.name}</p>
              <p className="mt-1 text-slate-400">{intel.team.league} · {intel.team.stadium || 'Venue pending'}</p>
              {intel.featuredPlayer ? (
                <p className="mt-3">
                  Featured player: <span className="font-medium text-slate-100">{intel.featuredPlayer.name}</span> · {intel.featuredPlayer.position}
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="grid gap-3 rounded-2xl border border-white/10 bg-slate-950/40 p-4 sm:grid-cols-3">
            <div>
              <p className="data-label text-[11px] uppercase text-slate-500">Home form</p>
              <p className="mt-2 text-lg font-medium text-slate-100">{formatForm(match.homeStats.form)}</p>
            </div>
            <div>
              <p className="data-label text-[11px] uppercase text-slate-500">Expected goals</p>
              <p className="mt-2 text-lg font-medium text-slate-100">
                {match.model?.expectedGoals
                  ? `${formatGoals(match.model.expectedGoals.home)} / ${formatGoals(match.model.expectedGoals.away)}`
                  : `${formatGoals(match.homeStats.goalsScoredPerMatch)} / ${formatGoals(match.homeStats.goalsConcededPerMatch)}`}
              </p>
            </div>
            <div>
              <p className="data-label text-[11px] uppercase text-slate-500">Away form</p>
              <p className="mt-2 text-lg font-medium text-slate-100">{formatForm(match.awayStats.form)}</p>
            </div>
          </div>

          <form onSubmit={handleAddComment} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3">
            <input
              value={commentDraft}
              onChange={(event) => setCommentDraft(event.target.value)}
              placeholder="Add a comment about this prediction"
              className="flex-1 bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-500"
            />
            <button type="submit" className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-200">
              Post
            </button>
          </form>

          <div className="space-y-4">
            {comments.map((comment) => (
              <div key={comment.id} className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-white">{comment.author}</p>
                    <p className="mt-1 text-sm leading-6 text-slate-300">{comment.text}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setReplyingTo((current) => (current === comment.id ? null : comment.id))}
                    className="text-xs uppercase tracking-[0.15em] text-emerald-300"
                  >
                    Reply
                  </button>
                </div>

                {(comment.replies ?? []).length ? (
                  <div className="mt-3 space-y-3 border-l border-white/10 pl-4">
                    {comment.replies.map((reply) => (
                      <div key={reply.id}>
                        <p className="text-sm font-medium text-slate-100">{reply.author}</p>
                        <p className="mt-1 text-sm leading-6 text-slate-400">{reply.text}</p>
                      </div>
                    ))}
                  </div>
                ) : null}

                {replyingTo === comment.id ? (
                  <div className="mt-3 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3">
                    <input
                      value={replyDrafts[comment.id] || ''}
                      onChange={(event) =>
                        setReplyDrafts((current) => ({ ...current, [comment.id]: event.target.value }))
                      }
                      placeholder="Reply to comment"
                      className="flex-1 bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-500"
                    />
                    <button
                      type="button"
                      onClick={() => handleAddReply(comment.id)}
                      className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-200"
                    >
                      Reply
                    </button>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </div>
    </article>
  )
}

export default MatchCard