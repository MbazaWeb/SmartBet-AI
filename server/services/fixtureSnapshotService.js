import { getSupabaseServerClient, isSupabaseServerConfigured } from './supabaseServerService.js'

const SNAPSHOT_TABLE = 'fixture_snapshots'
const ACTIVE_RETENTION_DAYS = 14
const LIVE_RETENTION_DAYS = 2
const PLAYED_RETENTION_DAYS = 21

function defaultSnapshot() {
  return {
    fixtures: {},
  }
}

function isSupabaseSnapshotRow(value) {
  return value && typeof value === 'object' && value.fixture_id && value.fixture
}

function toSnapshotRows(snapshot) {
  return Object.entries(snapshot.fixtures).map(([fixtureId, entry]) => ({
    fixture_id: String(fixtureId),
    first_seen_at: entry.firstSeenAt,
    last_seen_at: entry.lastSeenAt,
    utc_date: entry.fixture?.utcDate ?? null,
    status_category: entry.fixture?.statusCategory ?? null,
    is_played: Boolean(entry.fixture?.isPlayed || entry.fixture?.statusCategory === 'played'),
    source: entry.fixture?.source ?? null,
    fixture: entry.fixture,
  }))
}

function fromSnapshotRows(rows) {
  return {
    fixtures: Object.fromEntries(
      rows
        .filter(isSupabaseSnapshotRow)
        .map((row) => [
          String(row.fixture_id),
          {
            firstSeenAt: row.first_seen_at,
            lastSeenAt: row.last_seen_at,
            fixture: row.fixture,
          },
        ]),
    ),
  }
}

async function readSnapshot() {
  if (!isSupabaseServerConfigured()) {
    return defaultSnapshot()
  }

  try {
    const client = getSupabaseServerClient()
    const { data, error } = await client
      .from(SNAPSHOT_TABLE)
      .select('fixture_id, first_seen_at, last_seen_at, fixture')

    if (error) {
      return defaultSnapshot()
    }

    return fromSnapshotRows(data ?? [])
  } catch {
    return defaultSnapshot()
  }
}

async function writeSnapshot(snapshot) {
  if (!isSupabaseServerConfigured()) {
    return false
  }

  try {
    const client = getSupabaseServerClient()
    const rows = toSnapshotRows(snapshot)

    if (!rows.length) {
      const { error } = await client.from(SNAPSHOT_TABLE).delete().neq('fixture_id', '')
      return !error
    }

    const { error } = await client.from(SNAPSHOT_TABLE).upsert(rows, { onConflict: 'fixture_id' })
    if (error) {
      return false
    }

    const retainedFixtureIds = rows.map((row) => row.fixture_id)
    const { data: existingRows, error: existingError } = await client.from(SNAPSHOT_TABLE).select('fixture_id')

    if (existingError) {
      return false
    }

    const staleFixtureIds = (existingRows ?? [])
      .map((row) => String(row.fixture_id))
      .filter((fixtureId) => !retainedFixtureIds.includes(fixtureId))

    if (staleFixtureIds.length) {
      const { error: deleteError } = await client.from(SNAPSHOT_TABLE).delete().in('fixture_id', staleFixtureIds)

      if (deleteError) {
        return false
      }
    }

    return true
  } catch {
    return false
  }
}

function dateToMs(value) {
  const parsed = new Date(value).getTime()
  return Number.isFinite(parsed) ? parsed : 0
}

function hasValue(value) {
  if (value === null || value === undefined) {
    return false
  }

  if (typeof value === 'string') {
    return value.trim().length > 0
  }

  if (Array.isArray(value)) {
    return value.length > 0
  }

  if (typeof value === 'object') {
    return Object.keys(value).length > 0
  }

  return true
}

function preferIncoming(incomingValue, existingValue) {
  return hasValue(incomingValue) ? incomingValue : existingValue
}

function mergeFixture(existingFixture, incomingFixture) {
  if (!existingFixture) {
    return incomingFixture
  }

  return {
    ...existingFixture,
    ...incomingFixture,
    competition: preferIncoming(incomingFixture.competition, existingFixture.competition),
    venue: preferIncoming(incomingFixture.venue, existingFixture.venue),
    score: preferIncoming(incomingFixture.score, existingFixture.score),
    homeTeam: preferIncoming(incomingFixture.homeTeam, existingFixture.homeTeam),
    awayTeam: preferIncoming(incomingFixture.awayTeam, existingFixture.awayTeam),
    homeStats: preferIncoming(incomingFixture.homeStats, existingFixture.homeStats),
    awayStats: preferIncoming(incomingFixture.awayStats, existingFixture.awayStats),
    model: preferIncoming(incomingFixture.model, existingFixture.model) ?? null,
    bookmakerOdds: preferIncoming(incomingFixture.bookmakerOdds, existingFixture.bookmakerOdds) ?? null,
  }
}

function shouldKeepFixture(entry, now) {
  const fixture = entry.fixture
  const fixtureTime = dateToMs(fixture.utcDate)
  const lastSeenTime = dateToMs(entry.lastSeenAt)
  const referenceTime = Math.max(fixtureTime, lastSeenTime)
  const ageDays = (now - referenceTime) / (1000 * 60 * 60 * 24)

  if (fixture.isPlayed || fixture.statusCategory === 'played') {
    return ageDays <= PLAYED_RETENTION_DAYS
  }

  if (fixture.isLive || fixture.statusCategory === 'live') {
    return ageDays <= LIVE_RETENTION_DAYS
  }

  if (fixtureTime && fixtureTime >= now - ACTIVE_RETENTION_DAYS * 24 * 60 * 60 * 1000) {
    return true
  }

  return ageDays <= ACTIVE_RETENTION_DAYS
}

function sortAscending(left, right) {
  return dateToMs(left.utcDate) - dateToMs(right.utcDate)
}

function sortDescending(left, right) {
  return dateToMs(right.utcDate) - dateToMs(left.utcDate)
}

export async function mergeDashboardFixtures({ matches = [], liveMatches = [], playedMatches = [] }) {
  let snapshot = await readSnapshot()
  const nowIso = new Date().toISOString()
  const currentFixtures = [...matches, ...liveMatches, ...playedMatches]
  let persistenceEnabled = isSupabaseServerConfigured()
  const importedFixtureIds = new Set()

  currentFixtures.forEach((fixture) => {
    if (!fixture?.id) {
      return
    }

    const existingEntry = snapshot.fixtures[fixture.id]
    importedFixtureIds.add(String(fixture.id))

    snapshot.fixtures[fixture.id] = {
      firstSeenAt: existingEntry?.firstSeenAt ?? nowIso,
      lastSeenAt: nowIso,
      fixture: mergeFixture(existingEntry?.fixture, fixture),
    }
  })

  const now = Date.now()
  snapshot.fixtures = Object.fromEntries(
    Object.entries(snapshot.fixtures).filter(([, entry]) => shouldKeepFixture(entry, now)),
  )

  if (persistenceEnabled) {
    persistenceEnabled = await writeSnapshot(snapshot)
  }

  const allFixtures = Object.values(snapshot.fixtures).map((entry) => entry.fixture)
  const mergedPlayedMatches = allFixtures
    .filter((fixture) => fixture.isPlayed || fixture.statusCategory === 'played')
    .sort(sortDescending)
  const mergedLiveMatches = allFixtures
    .filter((fixture) => fixture.isLive || fixture.statusCategory === 'live')
    .sort(sortAscending)
  const mergedMatches = allFixtures
    .filter((fixture) => !(fixture.isPlayed || fixture.statusCategory === 'played'))
    .sort(sortAscending)
  const providerSources = [...new Set(currentFixtures.map((fixture) => fixture.source).filter(Boolean))]
  const snapshotEntries = Object.values(snapshot.fixtures)
  const databaseOnlyCount = snapshotEntries.filter((entry) => !importedFixtureIds.has(String(entry.fixture.id))).length
  const lastSnapshotAt = snapshotEntries.length
    ? snapshotEntries.reduce((latest, entry) => (entry.lastSeenAt > latest ? entry.lastSeenAt : latest), snapshotEntries[0].lastSeenAt)
    : null
  const servingMode = snapshotEntries.length ? 'database' : 'empty'

  return {
    matches: mergedMatches,
    liveMatches: mergedLiveMatches,
    playedMatches: mergedPlayedMatches,
    nextMatch: mergedMatches[0] ?? null,
    dataStatus: {
      servingMode,
      snapshotCount: snapshotEntries.length,
      lastSnapshotAt,
      providerSources,
      importedCount: importedFixtureIds.size,
      databaseOnlyCount,
      persistenceEnabled,
      persistenceMode: persistenceEnabled ? 'supabase' : 'disabled',
    },
  }
}