import { useEffect, useMemo, useState, useCallback, useRef } from 'react'
import { getDashboardData, isApiHealthy } from '../api/footballApi'
import {
  INITIAL_VISIBLE_MATCHES,
  LOAD_MORE_STEP,
  REFRESH_INTERVAL_MS,
  addDays,
  buildMatchInsight,
  compareByMatchDate,
  compareByConfidence,
  feedTabs,
  getActualOutcome,
  mergeUniqueMatches,
  outcomeLabels,
  toDateKey,
  calculateHitRate,
  calculateCalibrationError,
} from '../features/dashboard/helpers'

const CALIBRATION_BANDS = [
  { id: '50-59', min: 50, max: 59 },
  { id: '60-69', min: 60, max: 69 },
  { id: '70-79', min: 70, max: 79 },
  { id: '80+', min: 80, max: 100 },
]

// Cache for dashboard data
let dashboardCache = null
let cacheTimestamp = null
const CACHE_DURATION = 30 * 1000 // 30 seconds

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
  const [apiHealthy, setApiHealthy] = useState(true)
  
  const refreshIntervalRef = useRef(null)
  const mountedRef = useRef(true)

  // Check API health on mount
  useEffect(() => {
    const checkHealth = async () => {
      const healthy = await isApiHealthy()
      if (mountedRef.current) {
        setApiHealthy(healthy)
      }
    }
    checkHealth()
  }, [])

  const updateDashboardState = useCallback((dashboard) => {
    setMatches(
      [...(dashboard.matches ?? [])].sort(
        (left, right) => new Date(left.utcDate) - new Date(right.utcDate)
      )
    )
    setLiveMatches(dashboard.liveMatches ?? [])
    setPlayedMatches(
      [...(dashboard.playedMatches ?? [])].sort(
        (left, right) => new Date(right.utcDate) - new Date(left.utcDate)
      )
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
  }, [])

  const loadDashboard = useCallback(async (options = {}) => {
    const { showLoading = false, forceFresh = false } = options

    if (showLoading) {
      setLoading(true)
    } else {
      setRefreshing(true)
    }

    if (!forceFresh && dashboardCache && cacheTimestamp) {
      const cacheAge = Date.now() - cacheTimestamp
      if (cacheAge < CACHE_DURATION) {
        const cached = dashboardCache
        if (mountedRef.current) {
          updateDashboardState(cached)
          if (showLoading) setLoading(false)
          setRefreshing(false)
        }
        return
      }
    }

    try {
      const dashboard = await getDashboardData({ fresh: !showLoading })

      if (mountedRef.current) {
        updateDashboardState(dashboard)
        dashboardCache = dashboard
        cacheTimestamp = Date.now()
        setError('')
        setLastUpdated(new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
      }
    } catch (requestError) {
      if (mountedRef.current) {
        setError(requestError.message || 'Unable to fetch dashboard data. Please check your connection.')

        if (dashboardCache) {
          updateDashboardState(dashboardCache)
          setError(`${requestError.message || 'Network error'} - Showing cached data`)
        }
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false)
        setRefreshing(false)
      }
    }
  }, [updateDashboardState])

  // Memoized data transformations
  const intelByFixture = useMemo(() => new Map(teamIntel.map((item) => [item.fixtureId, item])), [teamIntel])
  const analysisByFixture = useMemo(() => new Map(aiAnalysis.map((item) => [item.fixtureId, item])), [aiAnalysis])

  const upcomingMatchInsights = useMemo(
    () => matches.map((match) => buildMatchInsight(match, analysisByFixture, intelByFixture)),
    [analysisByFixture, intelByFixture, matches]
  )
  
  const liveMatchInsights = useMemo(
    () => liveMatches.map((match) => buildMatchInsight(match, analysisByFixture, intelByFixture)),
    [analysisByFixture, intelByFixture, liveMatches]
  )
  
  const playedMatchInsights = useMemo(
    () => playedMatches.map((match) => buildMatchInsight(match, analysisByFixture, intelByFixture)),
    [analysisByFixture, intelByFixture, playedMatches]
  )

  const predictionFeedInsights = useMemo(
    () => mergeUniqueMatches([liveMatchInsights, upcomingMatchInsights]),
    [liveMatchInsights, upcomingMatchInsights]
  )

  const playedResultInsights = useMemo(
    () =>
      playedMatchInsights.map((match) => {
        const actualOutcome = getActualOutcome(match.score)
        const isCorrect = Boolean(actualOutcome) && actualOutcome === match.strongestOutcome
        return { ...match, actualOutcome, isCorrect }
      }),
    [playedMatchInsights]
  )

  const feedSourceInsights = useMemo(
    () => ({
      all: predictionFeedInsights,
      live: liveMatchInsights,
      upcoming: upcomingMatchInsights,
    }),
    [liveMatchInsights, predictionFeedInsights, upcomingMatchInsights]
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
    [activeFilter, selectedDate, selectedFeedInsights]
  )

  const sortedFilteredInsights = useMemo(() => {
    return [...filteredFeedInsights].sort((left, right) => {
      if (sortMode === 'league') {
        const competitionOrder = (left.competition?.name || '').localeCompare(right.competition?.name || '')
        if (competitionOrder !== 0) return competitionOrder
      }
      if (sortMode === 'confidence') {
        return compareByConfidence(left, right)
      }
      return compareByMatchDate(left, right)
    })
  }, [filteredFeedInsights, sortMode])

  const visibleMatches = sortedFilteredInsights.slice(0, visibleCount)
  const sortedPredictionFeedInsights = useMemo(
    () => [...predictionFeedInsights].sort(compareByConfidence),
    [predictionFeedInsights]
  )
  const predictionOfTheDayMatches = useMemo(() => {
    const highConfidenceMatches = sortedPredictionFeedInsights.filter((match) => (match.strongestValue || 0) >= 80)

    if (highConfidenceMatches.length >= 5) {
      return highConfidenceMatches.slice(0, 5)
    }

    const usedIds = new Set(highConfidenceMatches.map((match) => match.id))
    const fallbackMatches = sortedPredictionFeedInsights.filter((match) => !usedIds.has(match.id))

    return [...highConfidenceMatches, ...fallbackMatches].slice(0, 5)
  }, [sortedPredictionFeedInsights])
  const topPredictions = predictionOfTheDayMatches
  const nextUpcomingMatch = nextMatch ?? matches[0] ?? null
  const recentPlayedMatches = playedMatches.slice(0, 3)
  const liveTrackerMatches = liveMatches.slice(0, 3)
  const upcomingTrackerMatches = matches.slice(0, 3)
  
  const correctPredictionCount = playedResultInsights.filter((match) => match.isCorrect).length
  const predictionAccuracy = calculateHitRate(correctPredictionCount, playedResultInsights.length)
  const positiveEdgeCount = predictionFeedInsights.filter((match) => match.valueBet?.isPositiveEdge).length
  
  const averageConfidence = useMemo(() => {
    if (!sortedFilteredInsights.length) return 0
    const total = sortedFilteredInsights.reduce((sum, match) => sum + (match.strongestValue || 0), 0)
    return Math.round(total / sortedFilteredInsights.length)
  }, [sortedFilteredInsights])

  const calibrationBands = useMemo(
    () =>
      CALIBRATION_BANDS.map((band) => {
        const matchesInBand = playedResultInsights.filter(
          (match) => match.strongestValue >= band.min && match.strongestValue <= band.max
        )
        const actualHitRate = matchesInBand.length
          ? Math.round((matchesInBand.filter((match) => match.isCorrect).length / matchesInBand.length) * 100)
          : null
        const expectedHitRate = matchesInBand.length
          ? Math.round(matchesInBand.reduce((sum, match) => sum + match.strongestValue, 0) / matchesInBand.length)
          : null
        return {
          ...band,
          sampleSize: matchesInBand.length,
          expectedHitRate,
          actualHitRate,
          calibrationGap: matchesInBand.length && expectedHitRate !== null && actualHitRate !== null
            ? actualHitRate - expectedHitRate
            : null,
        }
      }),
    [playedResultInsights]
  )

  const weightedCalibrationError = calculateCalibrationError(calibrationBands)

  const resultsCards = useMemo(
    () => [
      {
        label: 'Feed confidence',
        value: `${averageConfidence}%`,
        detail: 'Average top-outcome confidence across the filtered feed.',
        trend: averageConfidence > 65 ? 'up' : averageConfidence > 50 ? 'stable' : 'down',
      },
      {
        label: 'Live matches',
        value: `${liveMatches.length}`,
        detail: liveMatches.length ? 'Matches currently in progress.' : 'No matches are live right now.',
        trend: liveMatches.length > 0 ? 'up' : 'none',
      },
      {
        label: 'Prediction hits',
        value: `${correctPredictionCount}`,
        detail: playedResultInsights.length 
          ? 'Finished matches where the predicted winner matched the real result.' 
          : 'Waiting for completed matches to score the model.',
      },
      {
        label: 'Accuracy rate',
        value: `${predictionAccuracy}%`,
        detail: playedResultInsights.length 
          ? 'Based on the latest completed matches.' 
          : 'Accuracy appears once finished matches are available.',
        trend: predictionAccuracy > 60 ? 'up' : predictionAccuracy > 50 ? 'stable' : 'down',
      },
      {
        label: 'Positive edges',
        value: `${positiveEdgeCount}`,
        detail: positiveEdgeCount 
          ? 'Matches where model probability beats the market.' 
          : 'No positive value edge showing.',
      },
      {
        label: 'Calibration error',
        value: `${weightedCalibrationError} pts`,
        detail: playedResultInsights.length 
          ? 'Average gap between predicted confidence and actual hit rate.' 
          : 'Calibration appears after completed matches build enough sample.',
        trend: weightedCalibrationError <= 5 ? 'good' : weightedCalibrationError <= 10 ? 'ok' : 'bad',
      },
    ],
    [averageConfidence, correctPredictionCount, liveMatches.length, playedResultInsights.length, positiveEdgeCount, predictionAccuracy, weightedCalibrationError]
  )

  const activeFeedLabel = feedTabs.find((tab) => tab.id === activeFeedTab)?.label || 'All predictions'

  // Debounced filter handlers
  const handleFilterChange = useCallback((nextFilter) => {
    setActiveFilter(nextFilter)
    setVisibleCount(INITIAL_VISIBLE_MATCHES)
    if (nextFilter !== 'date') {
      setSelectedDate('')
    }
  }, [])

  const handleDateChange = useCallback((event) => {
    setSelectedDate(event.target.value)
    setActiveFilter('date')
    setVisibleCount(INITIAL_VISIBLE_MATCHES)
  }, [])

  const handleFeedTabChange = useCallback((nextTab) => {
    setActiveFeedTab(nextTab)
    setVisibleCount(INITIAL_VISIBLE_MATCHES)
  }, [])

  const handleLoadMore = useCallback(() => {
    setVisibleCount((current) => Math.min(current + LOAD_MORE_STEP, filteredFeedInsights.length))
  }, [filteredFeedInsights.length])

  const handleVote = useCallback((pollId, optionId) => {
    setLivePolls((current) =>
      current.map((poll) => {
        if (poll.id !== pollId || poll.selectedOptionId) return poll
        return {
          ...poll,
          selectedOptionId: optionId,
          options: poll.options.map((option) =>
            option.id === optionId ? { ...option, votes: option.votes + 1 } : option
          ),
        }
      })
    )
  }, [])

  const handleManualRefresh = useCallback(async () => {
    if (refreshing) return
    await loadDashboard({ showLoading: false, forceFresh: true })
  }, [loadDashboard, refreshing])

  // Initial load and refresh interval
  useEffect(() => {
    mountedRef.current = true
    
    loadDashboard({ showLoading: true })
    
    refreshIntervalRef.current = setInterval(() => {
      if (mountedRef.current && !refreshing) {
        loadDashboard({ showLoading: false })
      }
    }, REFRESH_INTERVAL_MS)
    
    return () => {
      mountedRef.current = false
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current)
      }
    }
  }, [loadDashboard, refreshing])

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
    apiHealthy,
    activeFilter,
    selectedDate,
    sortMode,
    activeFeedTab,
    visibleMatches,
    filteredFeedInsights,
    selectedFeedInsights,
    feedSourceInsights,
    topPredictions,
    predictionOfTheDayMatches,
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