import { useEffect, useState, useRef } from 'react'
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
      label: match.statusLabel || 'LIVE',
      className: 'border-rose-400/30 bg-rose-500/15 text-rose-200 animate-pulse',
      icon: '🔴',
    }
  }
  if (isNextMatch) {
    return {
      label: 'NEXT',
      className: 'border-sky-400/30 bg-sky-500/15 text-sky-200',
      icon: '⏰',
    }
  }
  if (match.statusCategory === 'played') {
    return {
      label: 'PLAYED',
      className: 'border-amber-400/30 bg-amber-500/15 text-amber-200',
      icon: '✓',
    }
  }
  return {
    label: 'UPCOMING',
    className: 'border-emerald-400/30 bg-emerald-500/15 text-emerald-200',
    icon: '📅',
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
  const [showComments, setShowComments] = useState(false)
  const [imageLoaded, setImageLoaded] = useState({ home: false, away: false })
  const commentInputRef = useRef(null)

  // Load thread data
  useEffect(() => {
    let active = true

    async function loadThread() {
      if (!isConfigured) return

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
        if (active) setInteractionLoading(false)
      }
    }

    loadThread()
    return () => { active = false }
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
    // Copy to clipboard
    const url = `${window.location.origin}/prediction?match=${match.id}`
    navigator.clipboard?.writeText(url)
  }

  async function handleAddComment(event) {
    event.preventDefault()
    if (!commentDraft.trim()) return
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
    if (!nextReply) return
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
    <article className="glass-panel min-w-0 overflow-hidden rounded-[30px] border-white/10 transition-all duration-300 hover:shadow-xl hover:shadow-emerald-500/5">
      {/* Header */}
      <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-gradient-to-br from-emerald-400 to-sky-400 text-sm font-bold text-slate-950 shadow-[0_8px_30px_rgba(16,185,129,0.25)]">
            {(analysis?.analyst?.name || 'AI').slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white">{analysis?.analyst?.name || 'SmartBet AI'}</p>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span>{analysis?.analyst?.handle || '@smartbet.ai'}</span>
              <span>•</span>
              <span>{formatKickoff(match.utcDate)}</span>
            </div>
          </div>
        </div>
        <button 
          type="button" 
          className="self-start rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-slate-200 transition hover:bg-white/10 sm:self-auto"
        >
          Following
        </button>
      </div>

      {/* Main Content */}
      <div className="border-y border-white/10 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.22),_transparent_32%),linear-gradient(180deg,rgba(15,23,42,0.98),rgba(2,6,23,0.95))] px-4 py-5 sm:px-6 sm:py-6">
        <div className="flex flex-col gap-3 text-xs uppercase tracking-[0.2em] text-slate-400 sm:flex-row sm:items-center sm:justify-between">
          <span className="break-words">{match.competition.name}</span>
          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            <span>{analysis?.liveStatus ? 'Live research' : 'Prematch research'}</span>
            <span className={["flex items-center gap-1 rounded-full border px-3 py-1 text-[10px] font-semibold tracking-[0.18em]", statusBadge.className].join(' ')}>
              <span>{statusBadge.icon}</span>
              <span>{statusBadge.label}</span>
            </span>
          </div>
        </div>

        {/* Teams */}
        <div className="mt-5 grid gap-4 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] md:items-center">
          {/* Home Team */}
          <div className="order-2 min-w-0 rounded-2xl border border-white/10 bg-white/5 p-3 text-center md:border-0 md:bg-transparent md:p-0 md:text-left">
            <div className="flex items-center justify-center gap-3 md:justify-start">
              {match.homeTeam.logo && (
                <div className="relative h-10 w-10 shrink-0">
                  {!imageLoaded.home && (
                    <div className="absolute inset-0 animate-pulse rounded-full bg-white/10"></div>
                  )}
                  <img 
                    src={match.homeTeam.logo} 
                    alt={match.homeTeam.name}
                    className={`h-10 w-10 rounded-full bg-white/10 p-1 object-contain ${imageLoaded.home ? 'opacity-100' : 'opacity-0'}`}
                    onLoad={() => setImageLoaded(prev => ({ ...prev, home: true }))}
                  />
                </div>
              )}
              <div className="min-w-0">
                <p className="break-words text-base font-semibold text-white sm:text-2xl">{match.homeTeam.name}</p>
                <p className="text-xs text-slate-400">Home</p>
              </div>
            </div>
          </div>

          {/* Prediction Card */}
          <div className="order-1 mx-auto w-full max-w-sm rounded-[28px] border border-emerald-400/25 bg-emerald-500/12 px-4 py-5 text-center shadow-[0_0_40px_rgba(34,197,94,0.08)] md:order-2 md:max-w-none">
            <p className="data-label text-[11px] uppercase text-emerald-200">Prediction style</p>
            <p className="mt-2 text-4xl font-bold tracking-tight text-emerald-300">{prediction[strongestOutcome]}%</p>
            <p className="mt-1 text-sm text-emerald-100">{outcomeLabels[strongestOutcome]}</p>
            {match.model?.stability && (
              <p className="mt-2 text-[11px] uppercase tracking-[0.18em] text-emerald-50/80">
                Stability {match.model.stability}
              </p>
            )}
          </div>

          {/* Away Team */}
          <div className="order-3 min-w-0 rounded-2xl border border-white/10 bg-white/5 p-3 text-center md:border-0 md:bg-transparent md:p-0 md:text-right">
            <div className="flex items-center justify-center gap-3 md:justify-end">
              <div className="min-w-0 md:order-1">
                <p className="break-words text-base font-semibold text-white sm:text-2xl">{match.awayTeam.name}</p>
                <p className="text-xs text-slate-400">Away</p>
              </div>
              {match.awayTeam.logo && (
                <div className="relative h-10 w-10 shrink-0 md:order-2">
                  {!imageLoaded.away && (
                    <div className="absolute inset-0 animate-pulse rounded-full bg-white/10"></div>
                  )}
                  <img 
                    src={match.awayTeam.logo} 
                    alt={match.awayTeam.name}
                    className={`h-10 w-10 rounded-full bg-white/10 p-1 object-contain ${imageLoaded.away ? 'opacity-100' : 'opacity-0'}`}
                    onLoad={() => setImageLoaded(prev => ({ ...prev, away: true }))}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Prediction Percentages */}
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {Object.entries(prediction).map(([key, value]) => {
            const isStrongest = key === strongestOutcome
            return (
              <div
                key={key}
                className={[
                  'rounded-2xl border px-4 py-3 transition-all hover:scale-[1.02]',
                  isStrongest ? 'border-emerald-400/30 bg-emerald-500/12' : 'border-white/10 bg-white/5',
                ].join(' ')}
              >
                <p className="data-label text-[11px] uppercase text-slate-400">{outcomeLabels[key]}</p>
                <p className="mt-2 text-2xl font-bold text-white">{formatPercent(value)}</p>
                <div className="mt-2 h-1 rounded-full bg-white/10">
                  <div className="h-1 rounded-full bg-emerald-400" style={{ width: `${value}%` }} />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Interaction Section */}
      <div className="px-4 py-4 sm:px-6">
        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-200">
          <div className="grid w-full grid-cols-2 gap-3 sm:flex sm:w-auto sm:flex-wrap sm:items-center">
            <button
              type="button"
              onClick={handleToggleLike}
              className={[
                'flex items-center justify-center gap-2 rounded-full border px-4 py-2 transition-all hover:scale-105',
                isLiked ? 'border-rose-400/40 bg-rose-500/15 text-rose-200' : 'border-white/10 bg-white/5 hover:bg-white/10',
              ].join(' ')}
            >
              <svg className="h-4 w-4" fill={isLiked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              Like
            </button>
            <button 
              type="button" 
              onClick={() => {
                setShowComments(!showComments)
                setTimeout(() => commentInputRef.current?.focus(), 100)
              }}
              className="flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 transition hover:bg-white/10"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              Comment
            </button>
            <button 
              type="button" 
              onClick={handleShare} 
              className="flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 transition hover:bg-white/10"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
              Share
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIsSaved((current) => !current)}
            className={[
              'flex w-full items-center justify-center gap-2 rounded-full border px-4 py-2 transition sm:w-auto',
              isSaved ? 'border-sky-400/40 bg-sky-500/15 text-sky-100' : 'border-white/10 bg-white/5 hover:bg-white/10',
            ].join(' ')}
          >
            <svg className="h-4 w-4" fill={isSaved ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
            {isSaved ? 'Saved' : 'Save'}
          </button>
        </div>

        {/* Stats */}
        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-300">
          <span className="font-medium text-white">{likes.toLocaleString()} likes</span>
          <span>{commentCount.toLocaleString()} comments</span>
          <span>{shares.toLocaleString()} shares</span>
          {interactionLoading && (
            <span className="flex items-center gap-1 text-sky-200">
              <svg className="h-3 w-3 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Syncing...
            </span>
          )}
        </div>

        {/* Comments Section */}
        <div className="mt-4 space-y-3">
          {interactionError && (
            <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
              {interactionError}
            </div>
          )}

          {/* Caption */}
          <p className="text-sm leading-6 text-slate-200">
            <span className="font-semibold text-white">{analysis?.analyst?.handle || '@smartbet.ai'}</span>{' '}
            {analysis?.caption || `${match.homeTeam.name} vs ${match.awayTeam.name} is leaning ${outcomeLabels[strongestOutcome].toLowerCase()}.`}
          </p>

          {/* AI Research */}
          {analysis?.researchNotes && analysis.researchNotes.length > 0 && (
            <div className="rounded-2xl border border-white/10 bg-slate-950/45 p-4">
              <div className="flex items-center gap-2">
                <svg className="h-4 w-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                <p className="data-label text-[11px] uppercase text-slate-400">AI Research</p>
              </div>
              <div className="mt-3 space-y-2 text-sm leading-6 text-slate-300">
                {analysis.researchNotes.map((note, idx) => (
                  <p key={idx}>{note}</p>
                ))}
              </div>
              {analysis.researchTags?.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {analysis.researchTags.map((tag) => (
                    <span key={tag} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] uppercase text-slate-300">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Team Intel */}
          {intel && (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
              <div className="flex items-center gap-2">
                <svg className="h-4 w-4 text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <p className="font-medium text-white">{intel.team.name}</p>
              </div>
              <p className="mt-1 text-slate-400">{intel.team.league} · {intel.team.stadium || 'Venue pending'}</p>
              {intel.featuredPlayer && (
                <div className="mt-3 rounded-xl border border-white/10 bg-slate-950/50 p-3">
                  <p className="text-xs text-slate-400">Featured Player</p>
                  <p className="font-medium text-slate-100">{intel.featuredPlayer.name}</p>
                  <p className="text-xs text-slate-400">{intel.featuredPlayer.position}</p>
                </div>
              )}
            </div>
          )}

          {/* Stats Grid */}
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

          {/* Comment Input */}
          <form onSubmit={handleAddComment} className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 p-3 transition-all focus-within:border-emerald-400/30 sm:flex-row sm:items-center">
            <input
              ref={commentInputRef}
              value={commentDraft}
              onChange={(event) => setCommentDraft(event.target.value)}
              placeholder="Add a comment about this prediction..."
              className="min-w-0 flex-1 bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-500"
            />
            <button 
              type="submit" 
              disabled={!commentDraft.trim()}
              className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-200 transition hover:bg-emerald-500/15 disabled:opacity-50 disabled:cursor-not-allowed sm:self-auto"
            >
              Post
            </button>
          </form>

          {/* Comments List */}
          {showComments && comments.length > 0 && (
            <div className="space-y-4">
              {comments.map((comment) => (
                <div key={comment.id} className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-sky-400 text-xs font-bold text-slate-950">
                          {comment.author?.slice(0, 2).toUpperCase()}
                        </div>
                        <p className="text-sm font-medium text-white">{comment.author}</p>
                        <span className="text-xs text-slate-500">{new Date(comment.createdAt).toLocaleDateString()}</span>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-slate-300">{comment.text}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setReplyingTo((current) => (current === comment.id ? null : comment.id))}
                      className="text-xs uppercase tracking-[0.15em] text-emerald-300 hover:text-emerald-200"
                    >
                      Reply
                    </button>
                  </div>

                  {/* Replies */}
                  {comment.replies?.length > 0 && (
                    <div className="mt-3 space-y-3 border-l-2 border-emerald-400/30 pl-4">
                      {comment.replies.map((reply) => (
                        <div key={reply.id}>
                          <div className="flex items-center gap-2">
                            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-xs font-medium text-slate-300">
                              {reply.author?.slice(0, 2).toUpperCase()}
                            </div>
                            <p className="text-sm font-medium text-slate-100">{reply.author}</p>
                          </div>
                          <p className="mt-1 text-sm leading-6 text-slate-400">{reply.text}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Reply Input */}
                  {replyingTo === comment.id && (
                    <div className="mt-3 flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 p-3 sm:flex-row sm:items-center">
                      <input
                        value={replyDrafts[comment.id] || ''}
                        onChange={(event) =>
                          setReplyDrafts((current) => ({ ...current, [comment.id]: event.target.value }))
                        }
                        placeholder={`Reply to ${comment.author}...`}
                        className="min-w-0 flex-1 bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-500"
                      />
                      <button
                        type="button"
                        onClick={() => handleAddReply(comment.id)}
                        disabled={!replyDrafts[comment.id]?.trim()}
                        className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-200 transition hover:bg-emerald-500/15 disabled:opacity-50"
                      >
                        Reply
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </article>
  )
}

export default MatchCard