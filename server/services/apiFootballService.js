import axios from 'axios'
import NodeCache from 'node-cache'
import { getUpcomingFixturesFromFootballData } from './footballDataService.js'
import { buildPredictionModel } from './predictionService.js'

const API_FOOTBALL_BASE_URL = 'https://v3.football.api-sports.io'
const MAX_FIXTURES = 30
const PLAYED_FIXTURE_LIMIT = 12
const RECENT_MATCH_LIMIT = 5
const UPCOMING_CACHE_TTL = 180
const LIVE_CACHE_TTL = 20
const PLAYED_CACHE_TTL = 60
const ODDS_CACHE_TTL = 600
const cache = new NodeCache({ stdTTL: 600, useClones: false })
const LIVE_STATUS_CODES = new Set(['1H', 'HT', '2H', 'ET', 'BT', 'P', 'INT', 'SUSP', 'LIVE'])
const PLAYED_STATUS_CODES = new Set(['FT', 'AET', 'PEN'])
const PREFERRED_BOOKMAKERS = ['Bet365', 'Betano', 'William Hill', '10Bet', 'Unibet', 'Marathonbet']

function getApiFootballKey() {
  return process.env.API_FOOTBALL_KEY
}

function isRateLimitError(error) {
  return error?.message?.toLowerCase().includes('request limit')
}

function getApiFootballClient() {
  const apiFootballKey = getApiFootballKey()

  return axios.create({
    baseURL: API_FOOTBALL_BASE_URL,
    headers: apiFootballKey ? { 'x-apisports-key': apiFootballKey } : undefined,
  })
}

function formatApiDate(value) {
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

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

function parseNumber(value, fallback = 0) {
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function round(value, precision = 2) {
  return Number(value.toFixed(precision))
}

function normalizeOutcomeLabel(value) {
  const label = String(value ?? '').trim().toLowerCase()

  if (['home', 'home win', '1'].includes(label)) {
    return 'home'
  }

  if (['draw', 'x'].includes(label)) {
    return 'draw'
  }

  if (['away', 'away win', '2'].includes(label)) {
    return 'away'
  }

  return null
}

function normalizeImpliedProbabilities(probabilities) {
  const total = Object.values(probabilities).reduce((sum, value) => sum + value, 0)

  if (!total) {
    return null
  }

  return {
    home: round(probabilities.home / total, 4),
    draw: round(probabilities.draw / total, 4),
    away: round(probabilities.away / total, 4),
  }
}

function buildImpliedProbabilities(odds) {
  if (!odds?.home || !odds?.draw || !odds?.away) {
    return null
  }

  return normalizeImpliedProbabilities({
    home: 1 / odds.home,
    draw: 1 / odds.draw,
    away: 1 / odds.away,
  })
}

function buildBookmakerPreferenceIndex(name) {
  const index = PREFERRED_BOOKMAKERS.indexOf(name)
  return index === -1 ? Number.MAX_SAFE_INTEGER : index
}

function extractMatchWinnerOdds(bookmaker) {
  const matchWinnerBet = bookmaker?.bets?.find((bet) => bet.name === 'Match Winner')

  if (!matchWinnerBet?.values?.length) {
    return null
  }

  const odds = matchWinnerBet.values.reduce(
    (summary, entry) => {
      const outcome = normalizeOutcomeLabel(entry.value)
      const odd = parseNumber(entry.odd, 0)

      if (!outcome || odd <= 1) {
        return summary
      }

      return {
        ...summary,
        [outcome]: odd,
      }
    },
    { home: 0, draw: 0, away: 0 },
  )

  if (!odds.home || !odds.draw || !odds.away) {
    return null
  }

  const impliedProbabilities = buildImpliedProbabilities(odds)

  if (!impliedProbabilities) {
    return null
  }

  return {
    bookmaker: bookmaker.name || 'Bookmaker',
    odds: {
      home: round(odds.home),
      draw: round(odds.draw),
      away: round(odds.away),
    },
    impliedProbabilities,
    overround: round((1 / odds.home + 1 / odds.draw + 1 / odds.away - 1) * 100, 1),
  }
}

function buildConsensusOdds(entries) {
  if (!entries.length) {
    return null
  }

  const totals = entries.reduce(
    (summary, entry) => ({
      home: summary.home + entry.odds.home,
      draw: summary.draw + entry.odds.draw,
      away: summary.away + entry.odds.away,
    }),
    { home: 0, draw: 0, away: 0 },
  )

  const odds = {
    home: round(totals.home / entries.length),
    draw: round(totals.draw / entries.length),
    away: round(totals.away / entries.length),
  }
  const impliedProbabilities = buildImpliedProbabilities(odds)

  if (!impliedProbabilities) {
    return null
  }

  return {
    odds,
    impliedProbabilities,
    overround: round((1 / odds.home + 1 / odds.draw + 1 / odds.away - 1) * 100, 1),
  }
}

function buildBestOdds(entries) {
  return ['home', 'draw', 'away'].reduce((summary, outcome) => {
    const bestEntry = entries.reduce((currentBest, entry) => {
      if (!currentBest || entry.odds[outcome] > currentBest.odds[outcome]) {
        return entry
      }

      return currentBest
    }, null)

    return {
      ...summary,
      [outcome]: bestEntry
        ? {
            odds: bestEntry.odds[outcome],
            bookmaker: bestEntry.bookmaker,
          }
        : null,
    }
  }, {})
}

async function fetchFixtureOdds(fixtureId, options = {}) {
  if (!fixtureId) {
    return null
  }

  const response = await cachedApiGet(
    '/odds',
    {
      fixture: fixtureId,
      timezone: 'UTC',
    },
    {
      ttl: ODDS_CACHE_TTL,
      forceFresh: options.fresh,
    },
  ).catch(() => [])

  const bookmakerEntries = response
    .flatMap((entry) => entry.bookmakers ?? [])
    .map(extractMatchWinnerOdds)
    .filter(Boolean)

  if (!bookmakerEntries.length) {
    return {
      available: false,
      reason: 'No bookmaker odds are available for this fixture.',
    }
  }

  const rankedBookmakers = [...bookmakerEntries].sort((left, right) => {
    const preferenceDelta = buildBookmakerPreferenceIndex(left.bookmaker) - buildBookmakerPreferenceIndex(right.bookmaker)

    if (preferenceDelta !== 0) {
      return preferenceDelta
    }

    return left.overround - right.overround
  })

  return {
    available: true,
    bookmakerCount: bookmakerEntries.length,
    selectedBookmaker: rankedBookmakers[0],
    consensus: buildConsensusOdds(bookmakerEntries),
    bestOdds: buildBestOdds(bookmakerEntries),
    bookmakers: rankedBookmakers.slice(0, 5),
  }
}

function getStatusMeta(shortStatus, elapsed = 0) {
  if (LIVE_STATUS_CODES.has(shortStatus)) {
    return {
      category: 'live',
      label: elapsed ? `Live ${elapsed}'` : 'Live',
      isLive: true,
      isPlayed: false,
      isUpcoming: false,
    }
  }

  if (PLAYED_STATUS_CODES.has(shortStatus)) {
    return {
      category: 'played',
      label: 'Played',
      isLive: false,
      isPlayed: true,
      isUpcoming: false,
    }
  }

  return {
    category: 'upcoming',
    label: 'Upcoming match',
    isLive: false,
    isPlayed: false,
    isUpcoming: true,
  }
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
      pointsPerMatch: 1.3,
    },
  }
}

function getCacheKey(prefix, params) {
  return `${prefix}:${JSON.stringify(params)}`
}

async function cachedAsync(key, factory, options = {}) {
  const { ttl, forceFresh = false } = options

  if (forceFresh) {
    cache.del(key)
  }

  const cachedValue = cache.get(key)
  if (cachedValue) {
    return cachedValue
  }

  const pending = Promise.resolve(factory()).catch((error) => {
    cache.del(key)
    throw error
  })

  cache.set(key, pending, ttl)
  return pending
}

async function cachedApiGet(path, params = {}, options = {}) {
  return cachedAsync(getCacheKey(path, params), async () => {
    const apiFootballClient = getApiFootballClient()
    const response = await apiFootballClient.get(path, { params })
    const apiErrors = Object.values(response.data.errors ?? {}).filter(Boolean)

    if (apiErrors.length) {
      throw new Error(apiErrors.join(' | '))
    }

    return response.data.response ?? []
  }, options)
}

async function fetchUpcomingFixturesByDateWindow(options = {}) {
  const daysToScan = 5
  const fixtures = []

  for (let index = 0; index < daysToScan && fixtures.length < MAX_FIXTURES; index += 1) {
    const date = formatApiDate(addDays(new Date(), index))
    const response = await cachedApiGet(
      '/fixtures',
      {
        date,
        timezone: 'UTC',
      },
      {
        ttl: UPCOMING_CACHE_TTL,
        forceFresh: options.fresh,
      },
    ).catch(() => [])

    const upcomingForDate = response.filter((fixture) => !PLAYED_STATUS_CODES.has(fixture.fixture?.status?.short))
    fixtures.push(...upcomingForDate)
  }

  const uniqueFixtures = new Map()

  fixtures.forEach((fixture) => {
    const fixtureId = fixture.fixture?.id

    if (!uniqueFixtures.has(fixtureId)) {
      uniqueFixtures.set(fixtureId, fixture)
    }
  })

  return Array.from(uniqueFixtures.values())
    .sort((left, right) => new Date(left.fixture?.date) - new Date(right.fixture?.date))
    .slice(0, MAX_FIXTURES)
}

function getFixtureWinnerTeamId(fixture) {
  const homeGoals = fixture.goals?.home
  const awayGoals = fixture.goals?.away

  if (!Number.isFinite(homeGoals) || !Number.isFinite(awayGoals) || homeGoals === awayGoals) {
    return null
  }

  return homeGoals > awayGoals ? fixture.teams?.home?.id : fixture.teams?.away?.id
}

function getTeamResult(fixture, teamId) {
  const homeGoals = fixture.goals?.home
  const awayGoals = fixture.goals?.away

  if (!Number.isFinite(homeGoals) || !Number.isFinite(awayGoals)) {
    return 'D'
  }

  if (homeGoals === awayGoals) {
    return 'D'
  }

  const isHome = fixture.teams?.home?.id === teamId
  const teamWon = (isHome && homeGoals > awayGoals) || (!isHome && awayGoals > homeGoals)
  return teamWon ? 'W' : 'L'
}

function normalizeRecentMatch(fixture, teamId) {
  const isHome = fixture.teams?.home?.id === teamId
  return {
    id: fixture.fixture?.id,
    utcDate: fixture.fixture?.date,
    venue: isHome ? 'home' : 'away',
    opponent: isHome ? fixture.teams?.away?.name || 'Opponent' : fixture.teams?.home?.name || 'Opponent',
    scoreline: `${fixture.goals?.home ?? 0}-${fixture.goals?.away ?? 0}`,
    goalsFor: isHome ? fixture.goals?.home ?? 0 : fixture.goals?.away ?? 0,
    goalsAgainst: isHome ? fixture.goals?.away ?? 0 : fixture.goals?.home ?? 0,
    result: getTeamResult(fixture, teamId),
    winnerTeamId: getFixtureWinnerTeamId(fixture),
  }
}

function normalizeHeadToHeadMatch(fixture) {
  return {
    id: fixture.fixture?.id,
    winnerTeamId: getFixtureWinnerTeamId(fixture),
  }
}

function buildVenuePerformance(stats, venue) {
  const played = Number(stats.fixtures?.played?.[venue] ?? 0)
  const wins = Number(stats.fixtures?.wins?.[venue] ?? 0)
  const draws = Number(stats.fixtures?.draws?.[venue] ?? 0)
  const losses = Number(stats.fixtures?.loses?.[venue] ?? 0)
  const points = wins * 3 + draws

  return {
    wins,
    draws,
    losses,
    pointsPerMatch: round(played ? points / played : venue === 'home' ? 1.5 : 1.1),
  }
}

function buildSeasonStats(stats) {
  if (!stats) {
    return defaultSeasonStats()
  }

  return {
    averageGoalsScored: round(parseNumber(stats.goals?.for?.average?.total, 1.3)),
    averageGoalsConceded: round(parseNumber(stats.goals?.against?.average?.total, 1.3)),
    homePerformance: buildVenuePerformance(stats, 'home'),
    awayPerformance: buildVenuePerformance(stats, 'away'),
  }
}

function buildLeagueAverageGoals(fixtures) {
  const completedFixtures = fixtures.filter(
    (fixture) => Number.isFinite(fixture.goals?.home) && Number.isFinite(fixture.goals?.away),
  )

  if (!completedFixtures.length) {
    return 1.35
  }

  const totalGoals = completedFixtures.reduce(
    (sum, fixture) => sum + (fixture.goals?.home ?? 0) + (fixture.goals?.away ?? 0),
    0,
  )

  return round(totalGoals / (completedFixtures.length * 2))
}

function deriveTeamStats(fixtures, teamId) {
  const completedFixtures = fixtures.filter(
    (fixture) => Number.isFinite(fixture.goals?.home) && Number.isFinite(fixture.goals?.away),
  )

  if (!completedFixtures.length) {
    return defaultStats()
  }

  const aggregate = completedFixtures.reduce(
    (summary, fixture) => {
      const isHome = fixture.teams?.home?.id === teamId
      const goalsFor = isHome ? fixture.goals.home : fixture.goals.away
      const goalsAgainst = isHome ? fixture.goals.away : fixture.goals.home

      let points = 0

      if (goalsFor > goalsAgainst) {
        points = 3
      } else if (goalsFor === goalsAgainst) {
        points = 1
      }

      return {
        goalsFor: summary.goalsFor + goalsFor,
        goalsAgainst: summary.goalsAgainst + goalsAgainst,
        points: summary.points + points,
      }
    },
    { goalsFor: 0, goalsAgainst: 0, points: 0 },
  )

  const matchesPlayed = completedFixtures.length

  return {
    form: clamp(aggregate.points / (matchesPlayed * 3), 0, 1),
    goalsScoredPerMatch: Number((aggregate.goalsFor / matchesPlayed).toFixed(2)),
    goalsConcededPerMatch: Number((aggregate.goalsAgainst / matchesPlayed).toFixed(2)),
  }
}

async function fetchTeamStats(teamId, statsCache) {
  if (!teamId) {
    return defaultStats()
  }

  if (!statsCache.has(teamId)) {
    const apiFootballClient = getApiFootballClient()
    const request = apiFootballClient
      .get('/fixtures', {
        params: {
          team: teamId,
          last: RECENT_MATCH_LIMIT,
          status: 'FT',
          timezone: 'UTC',
        },
      })
      .then((response) => deriveTeamStats(response.data.response ?? [], teamId))
      .catch(() => defaultStats())

    statsCache.set(teamId, request)
  }

  return statsCache.get(teamId)
}

async function fetchRecentMatches(teamId) {
  if (!teamId) {
    return []
  }

  const fixtures = await cachedApiGet('/fixtures', {
    team: teamId,
    last: RECENT_MATCH_LIMIT,
    status: 'FT',
    timezone: 'UTC',
  }).catch(() => [])

  return fixtures.map((fixture) => normalizeRecentMatch(fixture, teamId))
}

async function fetchSeasonStats(teamId, leagueId, season) {
  if (!teamId || !leagueId || !season) {
    return defaultSeasonStats()
  }

  const response = await cachedApiGet('/teams/statistics', {
    team: teamId,
    league: leagueId,
    season,
  }).catch(() => null)

  const stats = Array.isArray(response) ? response[0] : response
  return buildSeasonStats(stats)
}

async function fetchHeadToHead(homeTeamId, awayTeamId) {
  if (!homeTeamId || !awayTeamId) {
    return []
  }

  const fixtures = await cachedApiGet('/fixtures/headtohead', {
    h2h: `${homeTeamId}-${awayTeamId}`,
    last: RECENT_MATCH_LIMIT,
  }).catch(() => [])

  return fixtures.map(normalizeHeadToHeadMatch)
}

async function fetchLeagueAverageGoals(leagueId, season) {
  if (!leagueId || !season) {
    return 1.35
  }

  const fixtures = await cachedApiGet('/fixtures', {
    league: leagueId,
    season,
    last: 100,
    status: 'FT',
    timezone: 'UTC',
  }).catch(() => [])

  return buildLeagueAverageGoals(fixtures)
}

async function fetchFixtureById(fixtureId) {
  const fixtures = await cachedApiGet('/fixtures', {
    id: fixtureId,
    timezone: 'UTC',
  }).catch(() => [])

  return fixtures[0] ?? null
}

async function buildFixtureModel(fixture) {
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
  const leagueId = fixture.league?.id
  const season = fixture.league?.season
  const [homeRecentMatches, awayRecentMatches, homeSeasonStats, awaySeasonStats, h2hMatches, leagueAverageGoals, bookmakerOdds] = await Promise.all([
    fetchRecentMatches(homeTeam.id),
    fetchRecentMatches(awayTeam.id),
    fetchSeasonStats(homeTeam.id, leagueId, season),
    fetchSeasonStats(awayTeam.id, leagueId, season),
    fetchHeadToHead(homeTeam.id, awayTeam.id),
    fetchLeagueAverageGoals(leagueId, season),
    fetchFixtureOdds(fixture.fixture?.id),
  ])

  return buildPredictionModel({
    homeTeam,
    awayTeam,
    leagueAverageGoals,
    homeRecentMatches,
    awayRecentMatches,
    h2hMatches,
    homeSeasonStats,
    awaySeasonStats,
    bookmakerOdds,
  })
}

function normalizeFixture(fixture, homeStats, awayStats) {
  const model = fixture.model ?? null
  const shortStatus = fixture.fixture?.status?.short || 'NS'
  const elapsed = fixture.fixture?.status?.elapsed ?? 0
  const statusMeta = getStatusMeta(shortStatus, elapsed)

  return {
    id: fixture.fixture?.id,
    competition: {
      code: `${fixture.league?.id ?? ''}`,
      name: fixture.league?.name || 'League',
      country: fixture.league?.country || '',
      logo: fixture.league?.logo || '',
    },
    season: fixture.league?.season,
    utcDate: fixture.fixture?.date,
    status: shortStatus,
    statusLabel: statusMeta.label,
    statusCategory: statusMeta.category,
    isLive: statusMeta.isLive,
    isPlayed: statusMeta.isPlayed,
    isUpcoming: statusMeta.isUpcoming,
    elapsed,
    venue: fixture.fixture?.venue?.name || '',
    score: {
      home: fixture.goals?.home,
      away: fixture.goals?.away,
    },
    homeTeam: {
      id: fixture.teams?.home?.id,
      name: fixture.teams?.home?.name || 'Home Team',
      logo: fixture.teams?.home?.logo || '',
    },
    awayTeam: {
      id: fixture.teams?.away?.id,
      name: fixture.teams?.away?.name || 'Away Team',
      logo: fixture.teams?.away?.logo || '',
    },
    homeStats,
    awayStats,
    model,
    bookmakerOdds: model?.valueBet?.consensus ? {
      bookmakerCount: model.valueBet.bookmakerCount,
      consensus: model.valueBet.consensus,
      bestOdds: model.valueBet.bestOdds,
      recommended: model.valueBet.recommended,
      bestEdge: model.valueBet.bestEdge,
      bestExpectedValue: model.valueBet.bestExpectedValue,
      isPositiveEdge: model.valueBet.isPositiveEdge,
    } : null,
    source: 'api-football',
  }
}

function normalizeLiveFixture(fixture) {
  const shortStatus = fixture.fixture?.status?.short || 'LIVE'
  const elapsed = fixture.fixture?.status?.elapsed ?? 0
  const statusMeta = getStatusMeta(shortStatus, elapsed)

  return {
    id: fixture.fixture?.id,
    competition: {
      code: `${fixture.league?.id ?? ''}`,
      name: fixture.league?.name || 'League',
      country: fixture.league?.country || '',
      logo: fixture.league?.logo || '',
    },
    utcDate: fixture.fixture?.date,
    elapsed,
    status: shortStatus,
    statusLabel: statusMeta.label,
    statusCategory: statusMeta.category,
    isLive: statusMeta.isLive,
    isPlayed: statusMeta.isPlayed,
    isUpcoming: statusMeta.isUpcoming,
    venue: fixture.fixture?.venue?.name || '',
    homeTeam: {
      id: fixture.teams?.home?.id,
      name: fixture.teams?.home?.name || 'Home Team',
      logo: fixture.teams?.home?.logo || '',
    },
    awayTeam: {
      id: fixture.teams?.away?.id,
      name: fixture.teams?.away?.name || 'Away Team',
      logo: fixture.teams?.away?.logo || '',
    },
    score: {
      home: fixture.goals?.home ?? 0,
      away: fixture.goals?.away ?? 0,
    },
    source: 'api-football',
  }
}

export async function getUpcomingFixtures(options = {}) {
  const apiFootballKey = getApiFootballKey()

  if (!apiFootballKey) {
    return getUpcomingFixturesFromFootballData()
  }

  const response = await cachedApiGet(
    '/fixtures',
    {
      next: MAX_FIXTURES,
      timezone: 'UTC',
    },
    {
      ttl: UPCOMING_CACHE_TTL,
      forceFresh: options.fresh,
    },
  ).catch(async (error) => {
    if (error.message.includes('Next parameter')) {
      return fetchUpcomingFixturesByDateWindow(options)
    }

    if (isRateLimitError(error)) {
      return getUpcomingFixturesFromFootballData()
    }

    throw error
  })

  if (response[0]?.source === 'football-data') {
    return response
  }

  const fixtures = response.slice(0, MAX_FIXTURES)

  if (!fixtures.length) {
    return getUpcomingFixturesFromFootballData()
  }

  const statsCache = new Map()

  return Promise.all(
    fixtures.map(async (fixture) => {
      const [homeStats, awayStats] = await Promise.all([
        fetchTeamStats(fixture.teams?.home?.id, statsCache),
        fetchTeamStats(fixture.teams?.away?.id, statsCache),
      ])

      const model = await buildFixtureModel(fixture).catch(() => null)

      return normalizeFixture({ ...fixture, model }, homeStats, awayStats)
    }),
  )
}

export async function getLiveFixtures(options = {}) {
  const apiFootballKey = getApiFootballKey()

  if (!apiFootballKey) {
    return []
  }

  try {
    const response = await cachedApiGet(
      '/fixtures',
      {
        live: 'all',
        timezone: 'UTC',
      },
      {
        ttl: LIVE_CACHE_TTL,
        forceFresh: options.fresh,
      },
    )

    return response.map(normalizeLiveFixture)
  } catch {
    return []
  }
}

export async function getPlayedFixtures(options = {}) {
  const apiFootballKey = getApiFootballKey()

  if (!apiFootballKey) {
    return []
  }

  try {
    const fixtures = await cachedApiGet(
      '/fixtures',
      {
        last: PLAYED_FIXTURE_LIMIT,
        status: 'FT',
        timezone: 'UTC',
      },
      {
        ttl: PLAYED_CACHE_TTL,
        forceFresh: options.fresh,
      },
    )

    const statsCache = new Map()

    return Promise.all(
      fixtures.map(async (fixture) => {
        const [homeStats, awayStats] = await Promise.all([
          fetchTeamStats(fixture.teams?.home?.id, statsCache),
          fetchTeamStats(fixture.teams?.away?.id, statsCache),
        ])

        const model = await buildFixtureModel(fixture).catch(() => null)

        return normalizeFixture({ ...fixture, model }, homeStats, awayStats)
      }),
    )
  } catch {
    return []
  }
}

export async function getMatchDetails(fixtureId) {
  const apiFootballKey = getApiFootballKey()

  if (!apiFootballKey) {
    return null
  }

  const fixture = await fetchFixtureById(fixtureId)
  if (!fixture) {
    return null
  }

  const model = await buildFixtureModel(fixture)

  return {
    fixtureId: fixture.fixture?.id,
    homeTeam: {
      id: fixture.teams?.home?.id,
      name: fixture.teams?.home?.name || 'Home Team',
      logo: fixture.teams?.home?.logo || '',
    },
    awayTeam: {
      id: fixture.teams?.away?.id,
      name: fixture.teams?.away?.name || 'Away Team',
      logo: fixture.teams?.away?.logo || '',
    },
    league: {
      id: fixture.league?.id,
      name: fixture.league?.name || 'League',
      country: fixture.league?.country || '',
      season: fixture.league?.season,
      logo: fixture.league?.logo || '',
    },
    model,
  }
}