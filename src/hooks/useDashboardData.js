import { useEffect, useMemo, useState } from 'react'
import { getDashboardData } from '../api/footballApi'
import {
  INITIAL_VISIBLE_MATCHES,
  LOAD_MORE_STEP,
  REFRESH_INTERVAL_MS,
  addDays,
  buildMatchInsight,
  compareByMatchDate,
  feedTabs,
  getActualOutcome,
  mergeUniqueMatches,
  outcomeLabels,
  toDateKey,
} from '../features/dashboard/helpers'

const CALIBRATION_BANDS = [
  { id: '50-59', min: 50, max: 59 },
  { id: '60-69', min: 60, max: 69 },
  { id: '70-79', min: 70, max: 79 },
  { id: '80+', min: 80, max: 100 },
]

export default function useDashboardData() {
  const [matches, setMatches] = useState([])
  const [liveMatches, setLiveMatches] = useState([])
  const [playedMatches, setPlayedMatches] = useState([])
  const [nextMatch, setNextMatch] = useState(null)
  const [teamIntel, setTeamIntel] = useState([])
  const [trainingSummary, setTrainingSummary] = useState(null)
  const [aiAnalysis, setAiAnalysis] = useState([])
  const [researchDigest, setResearchDigest] = useState(null)
  const [livePolls, setLivePolls] = useState([])
  const [dataStatus, setDataStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState('')
  const [error, setError] = useState('')
  const [activeFilter, setActiveFilter] = useState('all')
  const [activeFeedTab, setActiveFeedTab] = useState('all')
  const [selectedDate, setSelectedDate] = useState('')
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_MATCHES)
  const [sortMode, setSortMode] = useState('date')

  async function loadDashboard(options = { showLoading: false }) {
    if (options.showLoading) {
      setLoading(true)
    } else {
      setRefreshing(true)
    }

    try {
      const dashboard = await getDashboardData({ fresh: !options.showLoading })

      setError('')
      setMatches(
        [...(dashboard.matches ?? [])].sort(
          (left, right) => new Date(left.utcDate) - new Date(right.utcDate),
        ),
      )
      setLiveMatches(dashboard.liveMatches ?? [])
      setPlayedMatches(
        [...(dashboard.playedMatches ?? [])].sort(
          (left, right) => new Date(right.utcDate) - new Date(left.utcDate),
        ),
      )
      setNextMatch(dashboard.nextMatch ?? dashboard.matches?.[0] ?? null)
      setTeamIntel(dashboard.teamIntel ?? [])
      setTrainingSummary(dashboard.trainingSummary ?? null)
      setAiAnalysis(dashboard.aiAnalysis ?? [])
      setResearchDigest(dashboard.researchDigest ?? null)
      setDataStatus(dashboard.dataStatus ?? null)
      setLivePolls((current) => {
        const selectedOptions = new Map(current.map((poll) => [poll.id, poll.selectedOptionId]))

        return (dashboard.livePolls ?? []).map((poll) => ({
          ...poll,
          selectedOptionId: selectedOptions.get(poll.id) ?? null,
        }))
      })
      setLastUpdated(new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }))
    } catch (requestError) {
      setError(requestError.message || 'Unable to fetch dashboard data.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const intelByFixture = useMemo(() => new Map(teamIntel.map((item) => [item.fixtureId, item])), [teamIntel])
  const analysisByFixture = useMemo(() => new Map(aiAnalysis.map((item) => [item.fixtureId, item])), [aiAnalysis])

  const upcomingMatchInsights = useMemo(
    () => matches.map((match) => buildMatchInsight(match, analysisByFixture, intelByFixture)),
    [analysisByFixture, intelByFixture, matches],
  )
  const liveMatchInsights = useMemo(
    () => liveMatches.map((match) => buildMatchInsight(match, analysisByFixture, intelByFixture)),
    [analysisByFixture, intelByFixture, liveMatches],
  )
  const playedMatchInsights = useMemo(
    () => playedMatches.map((match) => buildMatchInsight(match, analysisByFixture, intelByFixture)),
    [analysisByFixture, intelByFixture, playedMatches],
  )

  const predictionFeedInsights = useMemo(
    () => mergeUniqueMatches([liveMatchInsights, upcomingMatchInsights]),
    [liveMatchInsights, upcomingMatchInsights],
  )

  const playedResultInsights = useMemo(
    () =>
      playedMatchInsights.map((match) => {
        const actualOutcome = getActualOutcome(match.score)
        const isCorrect = Boolean(actualOutcome) && actualOutcome === match.strongestOutcome

        return {
          ...match,
          actualOutcome,
          isCorrect,
        }
      }),
    [playedMatchInsights],
  )

  const feedSourceInsights = useMemo(
    () => ({
      all: predictionFeedInsights,
      live: liveMatchInsights,
      upcoming: upcomingMatchInsights,
    }),
    [liveMatchInsights, predictionFeedInsights, upcomingMatchInsights],
  )

  const selectedFeedInsights = feedSourceInsights[activeFeedTab] ?? predictionFeedInsights

  const filteredFeedInsights = useMemo(
    () =>
      selectedFeedInsights.filter((match) => {
        if (activeFilter === 'today') {
          return toDateKey(match.utcDate) === toDateKey(new Date())
        }

        if (activeFilter === 'tomorrow') {
          return toDateKey(match.utcDate) === toDateKey(addDays(new Date(), 1))
        }

        if (activeFilter === 'date') {
          return selectedDate ? toDateKey(match.utcDate) === selectedDate : true
        }

        return true
      }),
    [activeFilter, selectedDate, selectedFeedInsights],
  )

  const rankedPredictionInsights = useMemo(
    () => [...predictionFeedInsights].sort((left, right) => right.strongestValue - left.strongestValue),
    [predictionFeedInsights],
  )
  const rankedFilteredInsights = useMemo(
    () => [...filteredFeedInsights].sort((left, right) => right.strongestValue - left.strongestValue),
    [filteredFeedInsights],
  )
  const sortedFilteredInsights = useMemo(() => {
    return [...filteredFeedInsights].sort((left, right) => {
      if (sortMode === 'league') {
        const competitionOrder = left.competition.name.localeCompare(right.competition.name)

        if (competitionOrder !== 0) {
          return competitionOrder
        }
      }

      return compareByMatchDate(left, right)
    })
  }, [filteredFeedInsights, sortMode])

  const visibleMatches = sortedFilteredInsights.slice(0, visibleCount)
  const topPredictions = rankedPredictionInsights.slice(0, 2)
  const nextUpcomingMatch = nextMatch ?? matches[0] ?? null
  const recentPlayedMatches = playedMatches.slice(0, 3)
  const liveTrackerMatches = liveMatches.slice(0, 3)
  const upcomingTrackerMatches = matches.slice(0, 3)
  const correctPredictionCount = playedResultInsights.filter((match) => match.isCorrect).length
  const predictionAccuracy = playedResultInsights.length
    ? Math.round((correctPredictionCount / playedResultInsights.length) * 100)
    : 0
  const positiveEdgeCount = predictionFeedInsights.filter((match) => match.valueBet?.isPositiveEdge).length
  const averageConfidence = rankedFilteredInsights.length
    ? Math.round(
        rankedFilteredInsights.reduce((total, match) => total + match.strongestValue, 0) /
          rankedFilteredInsights.length,
      )
    : 0
  const calibrationBands = useMemo(
    () =>
      CALIBRATION_BANDS.map((band) => {
        const matchesInBand = playedResultInsights.filter(
          (match) => match.strongestValue >= band.min && match.strongestValue <= band.max,
        )
        const actualHitRate = matchesInBand.length
          ? Math.round((matchesInBand.filter((match) => match.isCorrect).length / matchesInBand.length) * 100)
          : null
        const expectedHitRate = matchesInBand.length
          ? Math.round(
              matchesInBand.reduce((total, match) => total + match.strongestValue, 0) / matchesInBand.length,
            )
          : null

        return {
          ...band,
          sampleSize: matchesInBand.length,
          expectedHitRate,
          actualHitRate,
          calibrationGap:
            matchesInBand.length && expectedHitRate !== null && actualHitRate !== null
              ? actualHitRate - expectedHitRate
              : null,
        }
      }),
    [playedResultInsights],
  )
  const calibrationGap = calibrationBands.reduce((total, band) => {
    if (!band.sampleSize || band.calibrationGap === null) {
      return total
    }

    return total + Math.abs(band.calibrationGap) * band.sampleSize
  }, 0)
  const weightedCalibrationError = playedResultInsights.length
    ? Math.round(calibrationGap / playedResultInsights.length)
    : 0

  const resultsCards = useMemo(
    () => [
      {
        label: 'Feed confidence',
        value: `${averageConfidence}%`,
        detail: 'Average top-outcome confidence across the filtered feed.',
      },
      {
        label: 'Live matches',
        value: `${liveMatches.length}`,
        detail: liveMatches.length ? 'Matches are currently moving in the live tracker.' : 'No matches are live right now.',
      },
      {
        label: 'Prediction hits',
        value: `${correctPredictionCount}`,
        detail: playedResultInsights.length ? 'Finished matches where the predicted winner matched the real result.' : 'Waiting for completed matches to score the model.',
      },
      {
        label: 'Accuracy rate',
        value: `${predictionAccuracy}%`,
        detail: playedResultInsights.length ? 'Based on the latest completed matches in the results panel.' : 'Accuracy appears once finished matches are available.',
      },
      {
        label: 'Positive edges',
        value: `${positiveEdgeCount}`,
        detail: positiveEdgeCount ? 'Upcoming or live matches where model probability still beats the market after bookmaker normalization.' : 'No positive value edge is showing in the current feed.',
      },
      {
        label: 'Calibration error',
        value: `${weightedCalibrationError} pts`,
        detail: playedResultInsights.length ? 'Average absolute gap between predicted confidence bands and actual hit rate.' : 'Calibration appears after completed matches build enough sample.',
      },
    ],
    [averageConfidence, correctPredictionCount, liveMatches.length, playedResultInsights.length, positiveEdgeCount, predictionAccuracy, weightedCalibrationError],
  )

  const activeFeedLabel = feedTabs.find((tab) => tab.id === activeFeedTab)?.label || 'All predictions'

  useEffect(() => {
    let active = true

    async function syncDashboard(options) {
      try {
        await loadDashboard(options)
      } catch {
        if (!active) {
          return
        }
      }
    }

    syncDashboard({ showLoading: true })
    const intervalId = window.setInterval(() => {
      syncDashboard({ showLoading: false })
    }, REFRESH_INTERVAL_MS)

    return () => {
      active = false
      window.clearInterval(intervalId)
    }
  }, [])

  function handleFilterChange(nextFilter) {
    setActiveFilter(nextFilter)
    setVisibleCount(INITIAL_VISIBLE_MATCHES)

    if (nextFilter !== 'date') {
      setSelectedDate('')
    }
  }

  function handleDateChange(event) {
    setSelectedDate(event.target.value)
    setActiveFilter('date')
    setVisibleCount(INITIAL_VISIBLE_MATCHES)
  }

  function handleFeedTabChange(nextTab) {
    setActiveFeedTab(nextTab)
    setVisibleCount(INITIAL_VISIBLE_MATCHES)
  }

  function handleLoadMore() {
    setVisibleCount((current) => Math.min(current + LOAD_MORE_STEP, filteredFeedInsights.length))
  }

  function handleVote(pollId, optionId) {
    setLivePolls((current) =>
      current.map((poll) => {
        if (poll.id !== pollId || poll.selectedOptionId) {
          return poll
        }

        return {
          ...poll,
          selectedOptionId: optionId,
          options: poll.options.map((option) =>
            option.id === optionId ? { ...option, votes: option.votes + 1 } : option,
          ),
        }
      }),
    )
  }

  async function handleManualRefresh() {
    await loadDashboard({ showLoading: false })
  }

  return {
    matches,
    liveMatches,
    playedMatches,
    teamIntel,
    trainingSummary,
    researchDigest,
    livePolls,
    dataStatus,
    loading,
    refreshing,
    lastUpdated,
    error,
    activeFilter,
    selectedDate,
    sortMode,
    activeFeedTab,
    visibleMatches,
    filteredFeedInsights,
    selectedFeedInsights,
    feedSourceInsights,
    topPredictions,
    nextUpcomingMatch,
    recentPlayedMatches,
    liveTrackerMatches,
    upcomingTrackerMatches,
    resultsCards,
    playedResultInsights,
    calibrationBands,
    activeFeedLabel,
    handleFilterChange,
    handleDateChange,
    handleFeedTabChange,
    handleLoadMore,
    handleManualRefresh,
    handleVote,
    setSortMode,
    outcomeLabels,
  }
}
