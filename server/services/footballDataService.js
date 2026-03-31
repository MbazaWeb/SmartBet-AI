import axios from 'axios'
import { buildPredictionModel } from './predictionService.js'
import { markProviderConfigured, updateProviderPhase } from './providerDiagnosticsService.js'

const FOOTBALL_DATA_BASE_URL = 'https://api.football-data.org/v4'
const API_FOOTBALL_BASE_URL = 'https://v3.football.api-sports.io'
const MAX_FALLBACK_FIXTURES = 30
const MAX_PLAYED_FALLBACK_FIXTURES = 12
const DATE_WINDOW_DAYS = 5
const PLAYED_LOOKBACK_DAYS = 7
const REQUEST_TIMEOUT_MS = 15000
const PROVIDER_RETRY_LIMIT = 2
const PROVIDER_COOLDOWN_MS = 5 * 60 * 1000

const PROVIDERS = {
  apiFootball: {
    label: 'API-Football',
    getKey: () => process.env.API_FOOTBALL_KEY || '',
    createClient: () =>
      axios.create({
        baseURL: API_FOOTBALL_BASE_URL,
        timeout: REQUEST_TIMEOUT_MS,
        headers: process.env.API_FOOTBALL_KEY ? { 'x-apisports-key': process.env.API_FOOTBALL_KEY } : undefined,
      }),
    priority: {
      upcoming: 90,
      live: 100,
      played: 95,
      details: 100,
    },
  },
  footballData: {
    label: 'Football-Data',
    getKey: () => process.env.FOOTBALL_DATA_API_KEY || process.env.VITE_FOOTBALL_DATA_API_KEY || '',
    createClient: () =>
      axios.create({
        baseURL: FOOTBALL_DATA_BASE_URL,
        timeout: REQUEST_TIMEOUT_MS,
        headers:
          process.env.FOOTBALL_DATA_API_KEY || process.env.VITE_FOOTBALL_DATA_API_KEY
            ? { 'X-Auth-Token': process.env.FOOTBALL_DATA_API_KEY || process.env.VITE_FOOTBALL_DATA_API_KEY }
            : undefined,
      }),
    priority: {
      upcoming: 75,
      live: 60,
      played: 70,
      details: 65,
    },
  },
}

const providerHealth = {
  apiFootball: createProviderHealth(),
  footballData: createProviderHealth(),
}

function createProviderHealth() {
  return {
    cooldownUntil: 0,
    consecutiveFailures: 0,
    lastError: '',
    lastRateLimitAt: 0,
    lastSuccessAt: 0,
  }
}

function getFootballDataKey() {
  return PROVIDERS.footballData.getKey()
}

function getFootballDataClient() {
  return PROVIDERS.footballData.createClient()
}

function getApiFootballKey() {
  return PROVIDERS.apiFootball.getKey()
}

function getApiFootballClient() {
  return PROVIDERS.apiFootball.createClient()
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

function subtractDays(value, days) {
  return addDays(value, -days)
}

function getProviderKey(provider) {
  return PROVIDERS[provider]?.getKey?.() || ''
}

function getProviderLabel(provider) {
  return PROVIDERS[provider]?.label || provider
}

function isProviderConfigured(provider) {
  return Boolean(getProviderKey(provider))
}

function nowMs() {
  return Date.now()
}

function getProviderHealth(provider) {
  return providerHealth[provider] || createProviderHealth()
}

function recordProviderSuccess(provider) {
  const health = getProviderHealth(provider)
  health.consecutiveFailures = 0
  health.lastError = ''
  health.lastSuccessAt = nowMs()
  health.cooldownUntil = 0
}

function recordProviderFailure(provider, error) {
  const health = getProviderHealth(provider)
  health.consecutiveFailures += 1
  health.lastError = getErrorMessage(error)

  if (isRateLimitError(provider, error)) {
    health.lastRateLimitAt = nowMs()
    health.cooldownUntil = nowMs() + PROVIDER_COOLDOWN_MS
  }
}

function providerInCooldown(provider) {
  return getProviderHealth(provider).cooldownUntil > nowMs()
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

function mapApiFootballStatus(status) {
  if (['1H', 'HT', '2H', 'ET', 'BT', 'P', 'INT', 'LIVE'].includes(status)) {
    return {
      status: 'LIVE',
      statusLabel: 'Live',
      statusCategory: 'live',
      isLive: true,
      isPlayed: false,
      isUpcoming: false,
    }
  }

  if (['FT', 'AET', 'PEN'].includes(status)) {
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

function buildFallbackModel(homeTeam, awayTeam) {
  return buildPredictionModel({
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
  const model = buildFallbackModel(homeTeam, awayTeam)

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

function normalizeApiFootballFixture(fixture) {
  const statusMeta = mapApiFootballStatus(fixture.fixture?.status?.short)
  const homeTeam = {
    id: fixture.teams?.home?.id,
    name: fixture.teams?.home?.name || 'Home Team',
    logo: fixture.teams?.home?.logo || '',
  }
  const awayTeam = {
    id: fixture.teams?.away?.id,
    name: fixture.teams?.away?.name || 'Away Team',
    logo: fixture.teams?.away?.logo || '',
  }
  const model = buildFallbackModel(homeTeam, awayTeam)

  return {
    id: fixture.fixture?.id,
    competition: {
      code: fixture.league?.round || `${fixture.league?.id ?? ''}`,
      name: fixture.league?.name || 'Competition',
      country: fixture.league?.country || '',
      logo: fixture.league?.logo || '',
    },
    season: fixture.league?.season ?? null,
    utcDate: fixture.fixture?.date,
    status: statusMeta.status,
    statusLabel: statusMeta.statusLabel,
    statusCategory: statusMeta.statusCategory,
    isLive: statusMeta.isLive,
    isPlayed: statusMeta.isPlayed,
    isUpcoming: statusMeta.isUpcoming,
    elapsed: fixture.fixture?.status?.elapsed ?? 0,
    venue: fixture.fixture?.venue?.name || '',
    score: {
      home: fixture.goals?.home ?? null,
      away: fixture.goals?.away ?? null,
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
  }
}

function buildApiFootballDetail(fixture) {
  const normalizedFixture = normalizeApiFootballFixture(fixture)

  return {
    fixtureId: normalizedFixture.id,
    homeTeam: normalizedFixture.homeTeam,
    awayTeam: normalizedFixture.awayTeam,
    league: {
      id: fixture.league?.id,
      name: normalizedFixture.competition.name,
      country: normalizedFixture.competition.country,
      season: normalizedFixture.season,
      logo: normalizedFixture.competition.logo,
    },
    model: normalizedFixture.model,
  }
}

function getErrorMessage(error) {
  return error?.response?.data?.message || error?.message || 'Provider request failed.'
}

function isRateLimitError(provider, error) {
  if (error?.response?.status === 429) {
    return true
  }

  const message = getErrorMessage(error).toLowerCase()

  if (provider === 'apiFootball') {
    return message.includes('request limit') || message.includes('too many requests')
  }

  return message.includes('rate limit') || message.includes('too many requests')
}

function isTransientError(error) {
  const status = error?.response?.status

  if (!status && error?.code) {
    return ['ECONNABORTED', 'ENOTFOUND', 'ECONNRESET', 'ETIMEDOUT'].includes(error.code)
  }

  return status >= 500
}

async function executeWithRetry(provider, operation) {
  let attempt = 0
  let lastError = null

  while (attempt < PROVIDER_RETRY_LIMIT) {
    try {
      return await operation()
    } catch (error) {
      lastError = error
      attempt += 1

      if (isRateLimitError(provider, error) || !isTransientError(error) || attempt >= PROVIDER_RETRY_LIMIT) {
        throw error
      }
    }
  }

  throw lastError
}

function getProviderCandidates(phase, options = {}) {
  const excludedProviders = new Set(options.excludeProviders || [])
  const preferredProvider = options.preferredProvider || null

  return Object.keys(PROVIDERS)
    .filter((provider) => !excludedProviders.has(provider))
    .map((provider) => {
      const health = getProviderHealth(provider)
      const providerPriority = PROVIDERS[provider].priority[phase] || 0
      const configured = isProviderConfigured(provider)
      const cooldownPenalty = providerInCooldown(provider) ? 1000 : 0
      const failurePenalty = health.consecutiveFailures * 20
      const preferredBoost = preferredProvider === provider ? 200 : 0

      return {
        provider,
        configured,
        score: preferredBoost + providerPriority - failurePenalty - cooldownPenalty,
      }
    })
    .sort((left, right) => right.score - left.score)
}

function markProviderAvailability(diagnostics) {
  markProviderConfigured(diagnostics, 'apiFootball', Boolean(getApiFootballKey()))
  markProviderConfigured(diagnostics, 'footballData', Boolean(getFootballDataKey()))
}

function updateProviderAttempt(diagnostics, provider, phase, patch) {
  if (phase === 'details') {
    return
  }

  updateProviderPhase(diagnostics, provider, phase, patch)
}

function buildProviderMessage(provider, phase, outcome, count = 0) {
  const label = getProviderLabel(provider)

  if (outcome === 'success') {
    if (phase === 'upcoming') {
      return `${label} returned ${count} upcoming fixtures.`
    }
    if (phase === 'live') {
      return `${label} returned ${count} live fixtures.`
    }
    if (phase === 'played') {
      return `${label} returned ${count} recently played fixtures.`
    }
    return `${label} returned match details.`
  }

  if (outcome === 'empty') {
    if (phase === 'upcoming') {
      return `${label} returned no upcoming fixtures for the current date window.`
    }
    if (phase === 'live') {
      return `${label} returned no live fixtures.`
    }
    if (phase === 'played') {
      return `${label} returned no recently played fixtures.`
    }
    return `${label} returned no match details.`
  }

  return `${label} was skipped.`
}

async function fetchMatchesFromFootballData(params) {
  const client = getFootballDataClient()
  const response = await client.get('/matches', { params })
  return response?.data?.matches ?? []
}

async function fetchUpcomingFromFootballDataProvider() {
  const dateFrom = formatDate(new Date())
  const dateTo = formatDate(addDays(new Date(), DATE_WINDOW_DAYS))
  return fetchMatchesFromFootballData({ dateFrom, dateTo })
}

async function fetchLiveFromFootballDataProvider() {
  return fetchMatchesFromFootballData({ status: 'LIVE' })
}

async function fetchPlayedFromFootballDataProvider() {
  const dateFrom = formatDate(subtractDays(new Date(), PLAYED_LOOKBACK_DAYS))
  const dateTo = formatDate(new Date())
  return fetchMatchesFromFootballData({ dateFrom, dateTo, status: 'FINISHED' })
}

async function fetchDetailsFromFootballDataProvider(fixtureId) {
  const client = getFootballDataClient()
  const response = await client.get(`/matches/${fixtureId}`)
  return response?.data ?? null
}

async function fetchApiFootballFixtures(params) {
  const client = getApiFootballClient()
  const response = await client.get('/fixtures', { params })
  return response?.data?.response ?? []
}

async function fetchUpcomingFromApiFootballProvider() {
  try {
    return await fetchApiFootballFixtures({ next: MAX_FALLBACK_FIXTURES, timezone: 'UTC' })
  } catch (error) {
    if (!getErrorMessage(error).includes('Next parameter')) {
      throw error
    }

    const from = formatDate(new Date())
    const to = formatDate(addDays(new Date(), DATE_WINDOW_DAYS))
    return fetchApiFootballFixtures({ from, to, timezone: 'UTC' })
  }
}

async function fetchLiveFromApiFootballProvider() {
  return fetchApiFootballFixtures({ live: 'all', timezone: 'UTC' })
}

async function fetchPlayedFromApiFootballProvider() {
  const from = formatDate(subtractDays(new Date(), PLAYED_LOOKBACK_DAYS))
  const to = formatDate(new Date())
  return fetchApiFootballFixtures({ from, to, status: 'FT', timezone: 'UTC' })
}

async function fetchDetailsFromApiFootballProvider(fixtureId) {
  const fixtures = await fetchApiFootballFixtures({ id: fixtureId, timezone: 'UTC' })
  return fixtures[0] ?? null
}

async function resolveProviderCollection(phase, options = {}) {
  const diagnostics = options.diagnostics
  markProviderAvailability(diagnostics)

  for (const candidate of getProviderCandidates(phase, options)) {
    const { provider, configured } = candidate

    if (!configured) {
      updateProviderAttempt(diagnostics, provider, phase, {
        status: 'skipped',
        count: 0,
        message: `Missing ${getProviderLabel(provider)} API key.`,
      })
      continue
    }

    if (providerInCooldown(provider)) {
      updateProviderAttempt(diagnostics, provider, phase, {
        status: 'skipped',
        count: 0,
        message: `${getProviderLabel(provider)} is temporarily cooling down after rate limiting.`,
      })
      continue
    }

    try {
      const rawMatches = await executeWithRetry(provider, async () => {
        if (provider === 'footballData') {
          if (phase === 'upcoming') return fetchUpcomingFromFootballDataProvider()
          if (phase === 'live') return fetchLiveFromFootballDataProvider()
          return fetchPlayedFromFootballDataProvider()
        }

        if (phase === 'upcoming') return fetchUpcomingFromApiFootballProvider()
        if (phase === 'live') return fetchLiveFromApiFootballProvider()
        return fetchPlayedFromApiFootballProvider()
      })

      const normalizedMatches = rawMatches
        .map((match) => (provider === 'footballData' ? normalizeFootballDataFixture(match) : normalizeApiFootballFixture(match)))
        .filter((match) => {
          if (phase === 'upcoming') {
            return !match.isPlayed
          }
          if (phase === 'live') {
            return match.isLive
          }
          return match.isPlayed
        })
        .sort((left, right) => new Date(left.utcDate) - new Date(right.utcDate))

      const trimmedMatches = phase === 'played'
        ? normalizedMatches.sort((left, right) => new Date(right.utcDate) - new Date(left.utcDate)).slice(0, MAX_PLAYED_FALLBACK_FIXTURES)
        : normalizedMatches.slice(0, MAX_FALLBACK_FIXTURES)

      recordProviderSuccess(provider)
      updateProviderAttempt(diagnostics, provider, phase, {
        status: trimmedMatches.length ? 'success' : 'empty',
        count: trimmedMatches.length,
        message: buildProviderMessage(provider, phase, trimmedMatches.length ? 'success' : 'empty', trimmedMatches.length),
      })

      if (trimmedMatches.length) {
        return trimmedMatches
      }
    } catch (error) {
      recordProviderFailure(provider, error)
      updateProviderAttempt(diagnostics, provider, phase, {
        status: 'fallback',
        count: 0,
        message: `${getErrorMessage(error)} Falling back to the next available provider.`,
      })
    }
  }

  return []
}

async function resolveProviderDetail(fixtureId, options = {}) {
  const diagnostics = options.diagnostics
  markProviderAvailability(diagnostics)

  for (const candidate of getProviderCandidates('details', options)) {
    const { provider, configured } = candidate

    if (!configured || providerInCooldown(provider)) {
      continue
    }

    try {
      const detail = await executeWithRetry(provider, async () => {
        if (provider === 'footballData') {
          const match = await fetchDetailsFromFootballDataProvider(fixtureId)
          return match?.id ? buildFootballDataDetail(match) : null
        }

        const fixture = await fetchDetailsFromApiFootballProvider(fixtureId)
        return fixture?.fixture?.id ? buildApiFootballDetail(fixture) : null
      })

      if (detail) {
        recordProviderSuccess(provider)
        return detail
      }
    } catch (error) {
      recordProviderFailure(provider, error)
    }
  }

  return null
}

async function fetchFootballDataMatches(params, phase, options = {}) {
  if (phase === 'upcoming') {
    return resolveProviderCollection('upcoming', options)
  }

  if (phase === 'live') {
    return resolveProviderCollection('live', options)
  }

  if (phase === 'played') {
    return resolveProviderCollection('played', options)
  }

  return []
}

export async function getUpcomingFixturesFromFootballData(options = {}) {
  return fetchFootballDataMatches({}, 'upcoming', options)
}

export async function getLiveFixturesFromFootballData(options = {}) {
  return fetchFootballDataMatches({}, 'live', options)
}

export async function getPlayedFixturesFromFootballData(options = {}) {
  return fetchFootballDataMatches({}, 'played', options)
}

export async function getMatchDetailsFromFootballData(fixtureId) {
  return resolveProviderDetail(fixtureId)
}