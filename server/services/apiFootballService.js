import axios from 'axios'
import { buildPredictionModel } from './predictionService.js'
import { markProviderConfigured, updateProviderPhase } from './providerDiagnosticsService.js'

const FOOTBALL_DATA_BASE_URL = 'https://api.football-data.org/v4'
const API_FOOTBALL_BASE_URL = 'https://v3.football.api-sports.io'
const MAX_FALLBACK_FIXTURES = 30
const MAX_PLAYED_FALLBACK_FIXTURES = 12
const DATE_WINDOW_DAYS = 5
const PLAYED_LOOKBACK_DAYS = 7

// Provider configuration
const PROVIDERS = {
  FOOTBALL_DATA: 'footballData',
  API_FOOTBALL: 'apiFootball'
}

// Provider priority order (can be configured)
let PROVIDER_PRIORITY = [PROVIDERS.API_FOOTBALL, PROVIDERS.FOOTBALL_DATA]

// API key getters
function getFootballDataKey() {
  return process.env.FOOTBALL_DATA_API_KEY || process.env.VITE_FOOTBALL_DATA_API_KEY || ''
}

function getApiFootballKey() {
  return process.env.API_FOOTBALL_KEY || process.env.VITE_API_FOOTBALL_KEY || ''
}

// Provider configuration check
function isProviderConfigured(provider) {
  switch (provider) {
    case PROVIDERS.FOOTBALL_DATA:
      return Boolean(getFootballDataKey())
    case PROVIDERS.API_FOOTBALL:
      return Boolean(getApiFootballKey())
    default:
      return false
  }
}

// Provider clients
function getFootballDataClient() {
  const footballDataKey = getFootballDataKey()
  return axios.create({
    baseURL: FOOTBALL_DATA_BASE_URL,
    headers: footballDataKey ? { 'X-Auth-Token': footballDataKey } : undefined,
  })
}

function getApiFootballClient() {
  const apiFootballKey = getApiFootballKey()
  return axios.create({
    baseURL: API_FOOTBALL_BASE_URL,
    headers: apiFootballKey ? {
      'x-rapidapi-key': apiFootballKey,
      'x-rapidapi-host': 'v3.football.api-sports.io'
    } : undefined,
  })
}

// Utility functions
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

function subtractDays(value, days) {
  return addDays(value, -days)
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

function mapStatus(status, provider) {
  if (provider === PROVIDERS.API_FOOTBALL) {
    if (['1ST_HALF', '2ND_HALF', 'HALF_TIME', 'EXTRA_TIME', 'PENALTY_SHOOTOUT'].includes(status)) {
      return {
        status: 'LIVE',
        statusLabel: 'Live',
        statusCategory: 'live',
        isLive: true,
        isPlayed: false,
        isUpcoming: false,
      }
    }
    if (status === 'FT' || status === 'AET' || status === 'PEN') {
      return {
        status: 'FT',
        statusLabel: 'Played',
        statusCategory: 'played',
        isLive: false,
        isPlayed: true,
        isUpcoming: false,
      }
    }
    if (status === 'NS' || status === 'TBD' || status === 'POSTPONED' || status === 'CANCELLED') {
      return {
        status: 'NS',
        statusLabel: 'Upcoming match',
        statusCategory: 'upcoming',
        isLive: false,
        isPlayed: false,
        isUpcoming: true,
      }
    }
  }

  // Default mapping for football-data.org
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

// Provider-specific normalization functions
function normalizeFootballDataFixture(match) {
  const statusMeta = mapStatus(match.status, PROVIDERS.FOOTBALL_DATA)
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

function normalizeApiFootballFixture(match) {
  const statusMeta = mapStatus(match.fixture.status.short, PROVIDERS.API_FOOTBALL)
  const homeTeam = {
    id: match.teams.home.id,
    name: match.teams.home.name,
    logo: match.teams.home.logo,
  }
  const awayTeam = {
    id: match.teams.away.id,
    name: match.teams.away.name,
    logo: match.teams.away.logo,
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
    id: match.fixture.id,
    competition: {
      code: match.league.code || '',
      name: match.league.name,
      country: match.league.country || '',
      logo: match.league.logo,
    },
    season: match.league.season,
    utcDate: match.fixture.date,
    status: statusMeta.status,
    statusLabel: statusMeta.statusLabel,
    statusCategory: statusMeta.statusCategory,
    isLive: statusMeta.isLive,
    isPlayed: statusMeta.isPlayed,
    isUpcoming: statusMeta.isUpcoming,
    elapsed: match.fixture.status.elapsed || 0,
    venue: match.fixture.venue?.name || '',
    score: {
      home: match.goals.home,
      away: match.goals.away,
    },
    homeTeam,
    awayTeam,
    homeStats: defaultStats(),
    awayStats: defaultStats(),
    model,
    bookmakerOdds: null,
    source: 'api-football',
  }
}

function buildFootballDataDetail(match) {
  const normalizedMatch = normalizeFootballDataFixture(match)

  return {
    fixtureId: normalizedMatch.id,
    homeTeam: normalizedMatch.homeTeam,
    awayTeam: normalizedMatch.awayTeam,
    league: {
      id: match.competition?.id,
      name: normalizedMatch.competition.name,
      country: normalizedMatch.competition.country,
      season: normalizedMatch.season,
      logo: normalizedMatch.competition.logo,
    },
    model: normalizedMatch.model,
    provider: PROVIDERS.FOOTBALL_DATA,
  }
}

function buildApiFootballDetail(match) {
  const normalizedMatch = normalizeApiFootballFixture(match)

  return {
    fixtureId: normalizedMatch.id,
    homeTeam: normalizedMatch.homeTeam,
    awayTeam: normalizedMatch.awayTeam,
    league: {
      id: match.league.id,
      name: normalizedMatch.competition.name,
      country: normalizedMatch.competition.country,
      season: normalizedMatch.season,
      logo: normalizedMatch.competition.logo,
    },
    model: normalizedMatch.model,
    provider: PROVIDERS.API_FOOTBALL,
  }
}

// Provider-specific fetch functions
async function fetchFootballDataMatches(params, phase, options = {}) {
  const diagnostics = options.diagnostics
  const footballDataKey = getFootballDataKey()
  markProviderConfigured(diagnostics, 'footballData', Boolean(footballDataKey))

  if (!footballDataKey) {
    updateProviderPhase(diagnostics, 'footballData', phase, {
      status: 'skipped',
      count: 0,
      message: 'Missing FOOTBALL_DATA_API_KEY or VITE_FOOTBALL_DATA_API_KEY.',
    })
    return []
  }

  const client = getFootballDataClient()
  const response = await client.get('/matches', { params }).catch((error) => {
    updateProviderPhase(diagnostics, 'footballData', phase, {
      status: 'error',
      count: 0,
      message: error.response?.data?.message || error.message || 'Football-Data request failed.',
    })
    return null
  })

  return response?.data?.matches ?? []
}

async function fetchApiFootballMatches(params, phase, options = {}) {
  const diagnostics = options.diagnostics
  const apiFootballKey = getApiFootballKey()
  markProviderConfigured(diagnostics, 'apiFootball', Boolean(apiFootballKey))

  if (!apiFootballKey) {
    updateProviderPhase(diagnostics, 'apiFootball', phase, {
      status: 'skipped',
      count: 0,
      message: 'Missing API_FOOTBALL_KEY or VITE_API_FOOTBALL_KEY.',
    })
    return []
  }

  const client = getApiFootballClient()
  const response = await client.get('/fixtures', { params }).catch((error) => {
    updateProviderPhase(diagnostics, 'apiFootball', phase, {
      status: 'error',
      count: 0,
      message: error.response?.data?.message || error.message || 'API-Football request failed.',
    })
    return null
  })

  return response?.data?.response ?? []
}

// Generic fetch function that tries providers in priority order
async function fetchFromProviders(fetchFunctions, phase, options = {}) {
  const results = []
  const errors = []

  for (const { provider, fetchFn, params, normalizeFn } of fetchFunctions) {
    if (!isProviderConfigured(provider)) {
      continue
    }

    try {
      const data = await fetchFn(params, phase, options)
      if (data && data.length > 0) {
        const normalized = data.map(normalizeFn)
        results.push({
          provider,
          data: normalized,
          count: normalized.length
        })
        // If we have data and we're not requiring all providers, return first successful
        if (!options.useAllProviders) {
          return normalized
        }
      }
    } catch (error) {
      errors.push({ provider, error: error.message })
      updateProviderPhase(options.diagnostics, provider, phase, {
        status: 'error',
        count: 0,
        message: error.message,
      })
    }
  }

  if (options.useAllProviders) {
    // Combine all results
    const combined = results.flatMap(r => r.data)
    // Remove duplicates by fixture ID
    const unique = combined.filter((fixture, index, self) =>
      index === self.findIndex(f => f.id === fixture.id)
    )
    return unique
  }

  // Return first successful or empty array
  return results.length > 0 ? results[0].data : []
}

// Public functions that use multiple providers
export async function getUpcomingFixturesFromFootballData(options = {}) {
  const diagnostics = options.diagnostics
  const dateFrom = formatDate(new Date())
  const dateTo = formatDate(addDays(new Date(), DATE_WINDOW_DAYS))

  const fetchFunctions = []

  if (PROVIDER_PRIORITY.includes(PROVIDERS.API_FOOTBALL)) {
    fetchFunctions.push({
      provider: PROVIDERS.API_FOOTBALL,
      fetchFn: fetchApiFootballMatches,
      params: {
        date: `${dateFrom}-${dateTo}`,
        status: 'NS',
      },
      normalizeFn: normalizeApiFootballFixture,
    })
  }

  if (PROVIDER_PRIORITY.includes(PROVIDERS.FOOTBALL_DATA)) {
    fetchFunctions.push({
      provider: PROVIDERS.FOOTBALL_DATA,
      fetchFn: fetchFootballDataMatches,
      params: {
        dateFrom,
        dateTo,
      },
      normalizeFn: normalizeFootballDataFixture,
    })
  }

  const matches = await fetchFromProviders(fetchFunctions, 'upcoming', options)

  const filteredMatches = matches
    .filter((match) => match.isUpcoming)
    .sort((left, right) => new Date(left.utcDate) - new Date(right.utcDate))
    .slice(0, MAX_FALLBACK_FIXTURES)

  const providerUsed = matches.length > 0 ? matches[0].source : 'none'
  updateProviderPhase(diagnostics, providerUsed, 'upcoming', {
    status: filteredMatches.length ? 'success' : 'empty',
    count: filteredMatches.length,
    message: filteredMatches.length
      ? `${providerUsed} returned upcoming fixtures.`
      : `No upcoming fixtures found from any provider.`,
  })

  return filteredMatches
}

export async function getLiveFixturesFromFootballData(options = {}) {
  const fetchFunctions = []

  if (PROVIDER_PRIORITY.includes(PROVIDERS.API_FOOTBALL)) {
    fetchFunctions.push({
      provider: PROVIDERS.API_FOOTBALL,
      fetchFn: fetchApiFootballMatches,
      params: {
        live: 'all',
      },
      normalizeFn: normalizeApiFootballFixture,
    })
  }

  if (PROVIDER_PRIORITY.includes(PROVIDERS.FOOTBALL_DATA)) {
    fetchFunctions.push({
      provider: PROVIDERS.FOOTBALL_DATA,
      fetchFn: fetchFootballDataMatches,
      params: {
        status: 'LIVE',
      },
      normalizeFn: normalizeFootballDataFixture,
    })
  }

  const matches = await fetchFromProviders(fetchFunctions, 'live', options)

  const filteredMatches = matches
    .filter((match) => match.isLive)
    .sort((left, right) => new Date(left.utcDate) - new Date(right.utcDate))
    .slice(0, MAX_FALLBACK_FIXTURES)

  const providerUsed = matches.length > 0 ? matches[0].source : 'none'
  updateProviderPhase(options.diagnostics, providerUsed, 'live', {
    status: filteredMatches.length ? 'success' : 'empty',
    count: filteredMatches.length,
    message: filteredMatches.length
      ? `${providerUsed} returned live fixtures.`
      : 'No live fixtures found from any provider.',
  })

  return filteredMatches
}

export async function getPlayedFixturesFromFootballData(options = {}) {
  const dateFrom = formatDate(subtractDays(new Date(), PLAYED_LOOKBACK_DAYS))
  const dateTo = formatDate(new Date())

  const fetchFunctions = []

  if (PROVIDER_PRIORITY.includes(PROVIDERS.API_FOOTBALL)) {
    fetchFunctions.push({
      provider: PROVIDERS.API_FOOTBALL,
      fetchFn: fetchApiFootballMatches,
      params: {
        date: `${dateFrom}-${dateTo}`,
        status: 'FT',
      },
      normalizeFn: normalizeApiFootballFixture,
    })
  }

  if (PROVIDER_PRIORITY.includes(PROVIDERS.FOOTBALL_DATA)) {
    fetchFunctions.push({
      provider: PROVIDERS.FOOTBALL_DATA,
      fetchFn: fetchFootballDataMatches,
      params: {
        dateFrom,
        dateTo,
        status: 'FINISHED',
      },
      normalizeFn: normalizeFootballDataFixture,
    })
  }

  const matches = await fetchFromProviders(fetchFunctions, 'played', options)

  const filteredMatches = matches
    .filter((match) => match.isPlayed)
    .sort((left, right) => new Date(right.utcDate) - new Date(left.utcDate))
    .slice(0, MAX_PLAYED_FALLBACK_FIXTURES)

  const providerUsed = matches.length > 0 ? matches[0].source : 'none'
  updateProviderPhase(options.diagnostics, providerUsed, 'played', {
    status: filteredMatches.length ? 'success' : 'empty',
    count: filteredMatches.length,
    message: filteredMatches.length
      ? `${providerUsed} returned recently played fixtures.`
      : 'No recently played fixtures found from any provider.',
  })

  return filteredMatches
}

export async function getMatchDetailsFromFootballData(fixtureId) {
  // Try providers in priority order
  for (const provider of PROVIDER_PRIORITY) {
    if (!isProviderConfigured(provider)) {
      continue
    }

    try {
      if (provider === PROVIDERS.API_FOOTBALL) {
        const client = getApiFootballClient()
        const response = await client.get('/fixtures', {
          params: { id: fixtureId }
        }).catch(() => null)
        
        const match = response?.data?.response?.[0]
        if (match?.fixture?.id) {
          return buildApiFootballDetail(match)
        }
      } else if (provider === PROVIDERS.FOOTBALL_DATA) {
        const client = getFootballDataClient()
        const response = await client.get(`/matches/${fixtureId}`).catch(() => null)
        const match = response?.data
        
        if (match?.id) {
          return buildFootballDataDetail(match)
        }
      }
    } catch (error) {
      console.error(`Error fetching from ${provider}:`, error.message)
      continue
    }
  }

  return null
}

export async function getUpcomingFixtures(options = {}) {
  return getUpcomingFixturesFromFootballData(options)
}

export async function getLiveFixtures(options = {}) {
  return getLiveFixturesFromFootballData(options)
}

export async function getPlayedFixtures(options = {}) {
  return getPlayedFixturesFromFootballData(options)
}

export async function getMatchDetails(fixtureId) {
  return getMatchDetailsFromFootballData(fixtureId)
}

// Configuration function to set provider priority
export function setProviderPriority(priority) {
  if (Array.isArray(priority) && priority.every(p => Object.values(PROVIDERS).includes(p))) {
    PROVIDER_PRIORITY = priority
  }
}

// Function to get current provider status
export function getProviderStatus() {
  return {
    providers: {
      [PROVIDERS.FOOTBALL_DATA]: {
        configured: isProviderConfigured(PROVIDERS.FOOTBALL_DATA),
        key: getFootballDataKey() ? '***' : null
      },
      [PROVIDERS.API_FOOTBALL]: {
        configured: isProviderConfigured(PROVIDERS.API_FOOTBALL),
        key: getApiFootballKey() ? '***' : null
      }
    },
    priority: PROVIDER_PRIORITY
  }
}