import { useEffect, useMemo, useState } from 'react'

const QUICK_PROMPTS = [
  'Why is this match the top pick?',
  'What is the safest prediction today?',
  'Show me the 80%+ confidence matches',
  'What should I watch out for before kickoff?',
]

function getConfidenceBand(value) {
  if (value >= 85) return 'very strong'
  if (value >= 75) return 'strong'
  if (value >= 65) return 'solid'
  return 'moderate'
}

function getTopOutcomes(match) {
  const entries = Object.entries(match?.prediction || {}).sort((left, right) => right[1] - left[1])
  const [topOutcome, topValue] = entries[0] || [match?.strongestOutcome, match?.strongestValue || 0]
  const [secondOutcome, secondValue] = entries[1] || [null, 0]

  return {
    topOutcome,
    topValue: Math.round(topValue || 0),
    secondOutcome,
    secondValue: Math.round(secondValue || 0),
    separation: Math.max(0, Math.round((topValue || 0) - (secondValue || 0))),
  }
}

function buildMatchSummary(match, outcomeLabels) {
  if (!match) {
    return 'Pick a match and I will explain the strongest angle, confidence split, and the main pre-kickoff risk.'
  }

  const { topOutcome, topValue, secondOutcome, secondValue, separation } = getTopOutcomes(match)
  const caption = match.analysis?.caption || `${match.homeTeam?.name} vs ${match.awayTeam?.name} is leaning ${outcomeLabels?.[topOutcome]?.toLowerCase() || 'toward one side'}.`
  const valueEdge = match.valueBet?.outcomes?.[topOutcome]?.edge
  const expectedValue = match.valueBet?.outcomes?.[topOutcome]?.expectedValue
  const homeForm = match.homeStats?.form ? Math.round(match.homeStats.form * 100) : null
  const awayForm = match.awayStats?.form ? Math.round(match.awayStats.form * 100) : null

  const details = [
    `${match.homeTeam?.name} vs ${match.awayTeam?.name} is rated as a ${getConfidenceBand(topValue)} call for ${outcomeLabels?.[topOutcome] || topOutcome} at ${topValue}%.`,
    separation > 0
      ? `The model gives this outcome a ${separation}-point cushion over the next best path${secondOutcome ? ` (${outcomeLabels?.[secondOutcome] || secondOutcome} at ${secondValue}%)` : ''}.`
      : 'The outcome split is tight, so this should be treated as a volatile call.',
    caption,
  ]

  if (homeForm !== null && awayForm !== null) {
    details.push(`Recent form leans ${match.homeTeam?.name} ${homeForm}% versus ${match.awayTeam?.name} ${awayForm}%.`)
  }

  if (typeof valueEdge === 'number') {
    const valueLabel = valueEdge > 0 ? `a positive edge of +${valueEdge} pts` : `${valueEdge} pts edge`
    details.push(`Market comparison shows ${valueLabel}${typeof expectedValue === 'number' ? ` with expected value at ${expectedValue > 0 ? '+' : ''}${expectedValue}%` : ''}.`)
  }

  return details.join(' ')
}

function buildRiskSummary(match, outcomeLabels) {
  if (!match) {
    return 'Select a match first. I will flag the biggest confidence gap, form swing, and any market warning I can see.'
  }

  const { secondOutcome, secondValue, separation } = getTopOutcomes(match)
  const notes = match.analysis?.researchNotes || []
  const riskPoints = []

  if (separation <= 10) {
    riskPoints.push(`The confidence gap is only ${separation} points, so ${outcomeLabels?.[secondOutcome] || secondOutcome || 'the alternative outcome'} is still live.`)
  }

  if (match.valueBet?.available && !match.valueBet?.isPositiveEdge) {
    riskPoints.push('The market does not show a positive edge on the strongest outcome, so price support is limited.')
  }

  if (notes.length > 0) {
    riskPoints.push(`Research note: ${notes[0]}`)
  }

  if (riskPoints.length === 0) {
    riskPoints.push(`Main risk is late context change before kickoff. The model still leans ${outcomeLabels?.[match.strongestOutcome] || match.strongestOutcome} with ${match.strongestValue}% confidence.`)
  }

  return riskPoints.join(' ')
}

function buildPortfolioSummary(matches, outcomeLabels) {
  if (!matches.length) {
    return 'No live or upcoming matches are available yet, so I do not have a prediction slate to explain.'
  }

  const highConfidence = matches.filter((match) => (match.strongestValue || 0) >= 80)
  const safest = matches[0]
  const safestOutcome = outcomeLabels?.[safest?.strongestOutcome] || safest?.strongestOutcome || 'the current top outcome'

  return `${highConfidence.length} match${highConfidence.length === 1 ? '' : 'es'} currently clear the 80% confidence line. The safest call right now is ${safest?.homeTeam?.name} vs ${safest?.awayTeam?.name} for ${safestOutcome} at ${safest?.strongestValue || 0}%.`
}

function getAssistantResponse(prompt, selectedMatch, matches, outcomeLabels) {
  const normalized = prompt.trim().toLowerCase()

  if (!normalized) {
    return buildMatchSummary(selectedMatch, outcomeLabels)
  }

  if (normalized.includes('80') || normalized.includes('high confidence')) {
    const highConfidenceMatches = matches.filter((match) => (match.strongestValue || 0) >= 80)
    if (!highConfidenceMatches.length) {
      return 'There are no 80%+ matches in the current feed. I would wait for a stronger board or use the top-ranked five with more caution.'
    }

    return highConfidenceMatches
      .slice(0, 5)
      .map((match, index) => `${index + 1}. ${match.homeTeam?.name} vs ${match.awayTeam?.name}: ${outcomeLabels?.[match.strongestOutcome] || match.strongestOutcome} at ${match.strongestValue}%.`)
      .join(' ')
  }

  if (normalized.includes('safe') || normalized.includes('safest')) {
    return buildPortfolioSummary(matches, outcomeLabels)
  }

  if (normalized.includes('risk') || normalized.includes('watch out') || normalized.includes('watch')) {
    return buildRiskSummary(selectedMatch, outcomeLabels)
  }

  if (normalized.includes('why') || normalized.includes('explain') || normalized.includes('top pick')) {
    return buildMatchSummary(selectedMatch, outcomeLabels)
  }

  return `${buildMatchSummary(selectedMatch, outcomeLabels)} ${buildRiskSummary(selectedMatch, outcomeLabels)}`
}

export default function PredictionExplainerAssistant({
  loading,
  matches,
  outcomeLabels,
  activeFeedLabel,
  lastUpdated,
}) {
  const [selectedMatchId, setSelectedMatchId] = useState('')
  const [prompt, setPrompt] = useState('')
  const availableMatches = useMemo(() => matches.slice(0, 8), [matches])

  useEffect(() => {
    if (!availableMatches.length) {
      setSelectedMatchId('')
      return
    }

    setSelectedMatchId((current) => {
      const hasCurrent = availableMatches.some((match) => String(match.id) === current)
      return hasCurrent ? current : String(availableMatches[0].id)
    })
  }, [availableMatches])

  const selectedMatch = useMemo(
    () => availableMatches.find((match) => String(match.id) === selectedMatchId) || availableMatches[0] || null,
    [availableMatches, selectedMatchId]
  )

  const assistantResponse = useMemo(
    () => getAssistantResponse(prompt, selectedMatch, availableMatches, outcomeLabels),
    [availableMatches, outcomeLabels, prompt, selectedMatch]
  )

  return (
    <section className="mt-8">
      <div className="glass-panel rounded-[32px] p-6 sm:p-8">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="data-label text-xs uppercase text-sky-300/80">Prediction explainer assistant</p>
            <h2 className="mt-3 text-2xl font-semibold text-white sm:text-3xl">Ask why a pick is showing</h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
              This assistant only reads the current prediction feed. It explains confidence, alternatives, and visible risks without changing matches, odds, or user data.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="rounded-full border border-sky-400/20 bg-sky-500/10 px-3 py-2 text-sky-100">Read-only assistant</span>
            {lastUpdated && (
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-slate-300">Feed updated {lastUpdated}</span>
            )}
          </div>
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-4 rounded-[28px] border border-white/10 bg-white/5 p-5">
            <div>
              <p className="data-label text-[11px] uppercase text-slate-500">Context</p>
              <p className="mt-2 text-sm text-slate-300">Current feed: {activeFeedLabel || 'All predictions'}</p>
            </div>

            <label className="block">
              <span className="data-label text-[11px] uppercase text-slate-500">Match to explain</span>
              <select
                value={selectedMatchId}
                onChange={(event) => setSelectedMatchId(event.target.value)}
                disabled={loading || !availableMatches.length}
                className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-sm text-slate-100 outline-none"
              >
                {availableMatches.length === 0 ? (
                  <option value="">No matches available</option>
                ) : (
                  availableMatches.map((match) => (
                    <option key={match.id} value={String(match.id)}>
                      {match.homeTeam?.name} vs {match.awayTeam?.name}
                    </option>
                  ))
                )}
              </select>
            </label>

            <div>
              <p className="data-label text-[11px] uppercase text-slate-500">Quick prompts</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {QUICK_PROMPTS.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setPrompt(item)}
                    className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 transition hover:bg-white/10"
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>

            <label className="block">
              <span className="data-label text-[11px] uppercase text-slate-500">Your question</span>
              <textarea
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                placeholder="Ask why this match is a pick, where the risk is, or which calls are above 80%."
                className="mt-2 min-h-28 w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-sm text-slate-100 outline-none placeholder:text-slate-500"
              />
            </label>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-slate-950/35 p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="data-label text-[11px] uppercase text-slate-500">Assistant response</p>
                <p className="mt-2 text-lg font-semibold text-white">
                  {selectedMatch ? `${selectedMatch.homeTeam?.name} vs ${selectedMatch.awayTeam?.name}` : 'Waiting for a match selection'}
                </p>
              </div>
              {selectedMatch && (
                <span className={`rounded-full px-3 py-2 text-xs font-medium ${(selectedMatch.strongestValue || 0) >= 80 ? 'border border-emerald-400/20 bg-emerald-500/10 text-emerald-200' : 'border border-amber-400/20 bg-amber-500/10 text-amber-100'}`}>
                  {selectedMatch.strongestValue}% confidence
                </span>
              )}
            </div>

            <div className="mt-5 rounded-3xl border border-white/10 bg-white/5 p-5">
              {loading ? (
                <div className="space-y-3 animate-pulse">
                  <div className="h-4 w-40 rounded bg-white/10"></div>
                  <div className="h-4 w-full rounded bg-white/10"></div>
                  <div className="h-4 w-11/12 rounded bg-white/10"></div>
                  <div className="h-4 w-4/5 rounded bg-white/10"></div>
                </div>
              ) : (
                <p className="text-sm leading-7 text-slate-200">{assistantResponse}</p>
              )}
            </div>

            {selectedMatch && !loading && (
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="data-label text-[11px] uppercase text-slate-500">Strongest angle</p>
                  <p className="mt-2 text-sm font-medium text-emerald-300">{outcomeLabels?.[selectedMatch.strongestOutcome] || selectedMatch.strongestOutcome}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="data-label text-[11px] uppercase text-slate-500">Competition</p>
                  <p className="mt-2 text-sm font-medium text-white">{selectedMatch.competition?.name || 'Competition pending'}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="data-label text-[11px] uppercase text-slate-500">Kickoff</p>
                  <p className="mt-2 text-sm font-medium text-white">{new Date(selectedMatch.utcDate).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}