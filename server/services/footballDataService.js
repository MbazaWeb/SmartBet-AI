import axios from 'axios'
import { buildPredictionModel } from './predictionService.js'
import { markProviderConfigured, updateProviderPhase } from './providerDiagnosticsService.js'

const FOOTBALL_DATA_BASE_URL = 'https://api.football-data.org/v4'
const MAX_FALLBACK_FIXTURES = 30
const DATE_WINDOW_DAYS = 5

function getFootballDataKey() {
  return process.env.FOOTBALL_DATA_API_KEY || process.env.VITE_FOOTBALL_DATA_API_KEY || ''
}

function getFootballDataClient() {
  const footballDataKey = getFootballDataKey()

  return axios.create({
    baseURL: FOOTBALL_DATA_BASE_URL,
    headers: footballDataKey ? { 'X-Auth-Token': footballDataKey } : undefined,
  })
}

function formatDate(value) {
  const date = new Date(value)
  const year = date.getUTCFullYear()
  const month = `${date.getUTCMonth() + 1}`.padStart(2, '0')
  const day = `${date.getUTCDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

function addDays(value, days) {
  const date = new Date(value)
  date.setUTCDate(date.getUTCDate() + days)
  return date
}

function defaultStats() {
  return {
    form: 0.5,
    goalsScoredPerMatch: 1.3,
    goalsConcededPerMatch: 1.3,
  }
}

function defaultSeasonStats() {
  return {
    averageGoalsScored: 1.3,
    averageGoalsConceded: 1.3,
    homePerformance: {
      wins: 0,
      draws: 0,
      losses: 0,
      pointsPerMatch: 1.3,
    },
    awayPerformance: {
      wins: 0,
      draws: 0,
      losses: 0,
      pointsPerMatch: 1.1,
    },
  }
}

function mapStatus(status) {
  if (['IN_PLAY', 'PAUSED'].includes(status)) {
    return {
      status: 'LIVE',
      statusLabel: 'Live',
      statusCategory: 'live',
      isLive: true,
      isPlayed: false,
      isUpcoming: false,
    }
  }

  if (['FINISHED'].includes(status)) {
    return {
      status: 'FT',
      statusLabel: 'Played',
      statusCategory: 'played',
      isLive: false,
      isPlayed: true,
      isUpcoming: false,
    }
  }

  return {
    status: 'NS',
    statusLabel: 'Upcoming match',
    statusCategory: 'upcoming',
    isLive: false,
    isPlayed: false,
    isUpcoming: true,
  }
}

function normalizeFootballDataFixture(match) {
  const statusMeta = mapStatus(match.status)
  const homeTeam = {
    id: match.homeTeam?.id,
    name: match.homeTeam?.name || 'Home Team',
    logo: match.homeTeam?.crest || '',
  }
  const awayTeam = {
    id: match.awayTeam?.id,
    name: match.awayTeam?.name || 'Away Team',
    logo: match.awayTeam?.crest || '',
  }
  const model = buildPredictionModel({
    homeTeam,
    awayTeam,
    leagueAverageGoals: 1.35,
    homeRecentMatches: [],
    awayRecentMatches: [],
    h2hMatches: [],
    homeSeasonStats: defaultSeasonStats(),
    awaySeasonStats: defaultSeasonStats(),
    bookmakerOdds: null,
  })

  return {
    id: match.id,
    competition: {
      code: match.competition?.code || `${match.competition?.id ?? ''}`,
      name: match.competition?.name || 'Competition',
      country: match.area?.name || '',
      logo: match.competition?.emblem || '',
    },
    season: match.season?.startDate ? Number.parseInt(match.season.startDate.slice(0, 4), 10) : null,
    utcDate: match.utcDate,
    status: statusMeta.status,
    statusLabel: statusMeta.statusLabel,
    statusCategory: statusMeta.statusCategory,
    isLive: statusMeta.isLive,
    isPlayed: statusMeta.isPlayed,
    isUpcoming: statusMeta.isUpcoming,
    elapsed: 0,
    venue: '',
    score: {
      home: match.score?.fullTime?.home ?? null,
      away: match.score?.fullTime?.away ?? null,
    },
    homeTeam,
    awayTeam,
    homeStats: defaultStats(),
    awayStats: defaultStats(),
    model,
    bookmakerOdds: null,
    source: 'football-data',
  }
}

export async function getUpcomingFixturesFromFootballData(options = {}) {
  const diagnostics = options.diagnostics
  const footballDataKey = getFootballDataKey()
  markProviderConfigured(diagnostics, 'footballData', Boolean(footballDataKey))

  if (!footballDataKey) {
    updateProviderPhase(diagnostics, 'footballData', 'upcoming', {
      status: 'skipped',
      count: 0,
      message: 'Missing FOOTBALL_DATA_API_KEY or VITE_FOOTBALL_DATA_API_KEY.',
    })
    return []
  }

  const client = getFootballDataClient()
  const dateFrom = formatDate(new Date())
  const dateTo = formatDate(addDays(new Date(), DATE_WINDOW_DAYS))
  const response = await client.get('/matches', {
    params: {
      dateFrom,
      dateTo,
    },
  }).catch((error) => {
    updateProviderPhase(diagnostics, 'footballData', 'upcoming', {
      status: 'error',
      count: 0,
      message: error.response?.data?.message || error.message || 'Football-Data request failed.',
    })
    return null
  })

  const matches = response?.data?.matches ?? []
  const normalizedMatches = matches
    .filter((match) => !['FINISHED', 'CANCELLED', 'POSTPONED', 'SUSPENDED'].includes(match.status))
    .sort((left, right) => new Date(left.utcDate) - new Date(right.utcDate))
    .slice(0, MAX_FALLBACK_FIXTURES)
    .map(normalizeFootballDataFixture)

  updateProviderPhase(diagnostics, 'footballData', 'upcoming', {
    status: normalizedMatches.length ? 'success' : 'empty',
    count: normalizedMatches.length,
    message: normalizedMatches.length
      ? 'Football-Data returned fallback upcoming fixtures.'
      : 'Football-Data returned no upcoming fixtures for the current date window.',
  })

  return normalizedMatches
}