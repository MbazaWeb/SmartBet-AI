import { calculatePrediction } from '../../utils/prediction'

export const INITIAL_VISIBLE_MATCHES = 6
export const LOAD_MORE_STEP = 6
export const REFRESH_INTERVAL_MS = 60000

export const outcomeLabels = {
  home: 'Home Win',
  draw: 'Draw',
  away: 'Away Win',
}

export const filterOptions = [
  { id: 'all', label: 'All' },
  { id: 'today', label: 'Today' },
  { id: 'tomorrow', label: 'Tomorrow' },
  { id: 'date', label: 'By date' },
]

export const sortOptions = [
  { id: 'date', label: 'Sort by date' },
  { id: 'league', label: 'Sort by league' },
]

export const feedTabs = [
  { id: 'all', label: 'All predictions' },
  { id: 'live', label: 'Live' },
  { id: 'upcoming', label: 'Upcoming' },
]

export function toDateKey(value) {
  const date = new Date(value)
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')

  return `${year}-${month}-${day}`
}

export function addDays(value, days) {
  const date = new Date(value)
  date.setDate(date.getDate() + days)
  return date
}

export function formatKickoff(value) {
  if (!value) {
    return 'Kickoff pending'
  }

  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

export function formatScore(score) {
  if (!score || score.home === null || score.home === undefined || score.away === null || score.away === undefined) {
    return 'vs'
  }

  return `${score.home} - ${score.away}`
}

export function getActualOutcome(score) {
  if (!score || score.home === null || score.home === undefined || score.away === null || score.away === undefined) {
    return null
  }

  if (score.home > score.away) {
    return 'home'
  }

  if (score.home < score.away) {
    return 'away'
  }

  return 'draw'
}

function getFeedPriority(match) {
  if (match.statusCategory === 'live') {
    return 0
  }

  if (match.statusCategory === 'upcoming') {
    return 1
  }

  return 2
}

export function compareByMatchDate(left, right) {
  if (left.statusCategory !== right.statusCategory) {
    return getFeedPriority(left) - getFeedPriority(right)
  }

  if (left.statusCategory === 'played') {
    return new Date(right.utcDate) - new Date(left.utcDate)
  }

  return new Date(left.utcDate) - new Date(right.utcDate)
}

export function buildMatchInsight(match, analysisByFixture, intelByFixture) {
  const prediction = match.model?.probabilities ?? calculatePrediction(match.homeStats, match.awayStats)
  const [predictedOutcome, predictedProbability] = Object.entries(prediction).sort(
    (left, right) => right[1] - left[1],
  )[0]
  const strongestOutcome = match.model?.strongestOutcome ?? predictedOutcome
  const strongestValue = match.model?.confidence ?? predictedProbability
  const analysis = analysisByFixture.get(match.id)
  const intel = intelByFixture.get(match.id)

  return {
    ...match,
    prediction,
    strongestOutcome,
    strongestValue,
    strongestProbability: predictedProbability,
    valueBet: match.model?.valueBet ?? null,
    analysis,
    intel,
  }
}

export function mergeUniqueMatches(groups) {
  const seen = new Set()

  return groups.flat().filter((match) => {
    if (seen.has(match.id)) {
      return false
    }

    seen.add(match.id)
    return true
  })
}
