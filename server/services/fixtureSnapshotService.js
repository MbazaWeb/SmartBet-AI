import fs from 'node:fs'
import path from 'node:path'

const SNAPSHOT_FILE_PATH = path.resolve(process.cwd(), 'server/data/fixture-snapshot.json')
const SNAPSHOT_BACKUP_FILE_PATH = path.resolve(process.cwd(), 'server/data/fixture-snapshot-backup.json')
const ACTIVE_RETENTION_DAYS = 7
const PLAYED_RETENTION_DAYS = 21

function ensureSnapshotDirectory() {
  fs.mkdirSync(path.dirname(SNAPSHOT_FILE_PATH), { recursive: true })
}

function defaultSnapshot() {
  return {
    fixtures: {},
  }
}

function readSnapshot() {
  ensureSnapshotDirectory()

  if (!fs.existsSync(SNAPSHOT_FILE_PATH)) {
    return defaultSnapshot()
  }

  try {
    const content = fs.readFileSync(SNAPSHOT_FILE_PATH, 'utf8')
    return content ? JSON.parse(content) : defaultSnapshot()
  } catch {
    return defaultSnapshot()
  }
}

function writeSnapshot(snapshot) {
  ensureSnapshotDirectory()
  fs.writeFileSync(SNAPSHOT_FILE_PATH, JSON.stringify(snapshot, null, 2), 'utf8')
}

function readBackupSnapshot() {
  ensureSnapshotDirectory()

  if (!fs.existsSync(SNAPSHOT_BACKUP_FILE_PATH)) {
    return defaultSnapshot()
  }

  try {
    const content = fs.readFileSync(SNAPSHOT_BACKUP_FILE_PATH, 'utf8')
    return content ? JSON.parse(content) : defaultSnapshot()
  } catch {
    return defaultSnapshot()
  }
}

function writeBackupSnapshot(snapshot) {
  ensureSnapshotDirectory()
  fs.writeFileSync(SNAPSHOT_BACKUP_FILE_PATH, JSON.stringify(snapshot, null, 2), 'utf8')
}

function dateToMs(value) {
  const parsed = new Date(value).getTime()
  return Number.isFinite(parsed) ? parsed : 0
}

function mergeFixture(existingFixture, incomingFixture) {
  if (!existingFixture) {
    return incomingFixture
  }

  return {
    ...existingFixture,
    ...incomingFixture,
    competition: incomingFixture.competition ?? existingFixture.competition,
    score: incomingFixture.score ?? existingFixture.score,
    homeTeam: incomingFixture.homeTeam ?? existingFixture.homeTeam,
    awayTeam: incomingFixture.awayTeam ?? existingFixture.awayTeam,
    homeStats: incomingFixture.homeStats ?? existingFixture.homeStats,
    awayStats: incomingFixture.awayStats ?? existingFixture.awayStats,
    model: existingFixture.model ?? incomingFixture.model ?? null,
    bookmakerOdds: existingFixture.bookmakerOdds ?? incomingFixture.bookmakerOdds ?? null,
  }
}

function shouldKeepFixture(entry, now) {
  const fixture = entry.fixture
  const referenceTime = Math.max(dateToMs(fixture.utcDate), dateToMs(entry.lastSeenAt))
  const ageDays = (now - referenceTime) / (1000 * 60 * 60 * 24)

  if (fixture.isPlayed || fixture.statusCategory === 'played') {
    return ageDays <= PLAYED_RETENTION_DAYS
  }

  return ageDays <= ACTIVE_RETENTION_DAYS
}

function sortAscending(left, right) {
  return dateToMs(left.utcDate) - dateToMs(right.utcDate)
}

function sortDescending(left, right) {
  return dateToMs(right.utcDate) - dateToMs(left.utcDate)
}

export function mergeDashboardFixtures({ matches = [], liveMatches = [], playedMatches = [] }) {
  let snapshot = readSnapshot()
  const nowIso = new Date().toISOString()
  const currentFixtures = [...matches, ...liveMatches, ...playedMatches]
  let restoredFromBackup = false

  if (!currentFixtures.length && !Object.keys(snapshot.fixtures).length) {
    const backupSnapshot = readBackupSnapshot()

    if (Object.keys(backupSnapshot.fixtures).length) {
      snapshot = backupSnapshot
      restoredFromBackup = true
      writeSnapshot(backupSnapshot)
    }
  }

  currentFixtures.forEach((fixture) => {
    if (!fixture?.id) {
      return
    }

    const existingEntry = snapshot.fixtures[fixture.id]

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

  writeSnapshot(snapshot)

  if (currentFixtures.length) {
    writeBackupSnapshot(snapshot)
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
  const lastSnapshotAt = snapshotEntries.length
    ? snapshotEntries.reduce((latest, entry) => (entry.lastSeenAt > latest ? entry.lastSeenAt : latest), snapshotEntries[0].lastSeenAt)
    : null
  const servingMode = currentFixtures.length ? 'fresh' : snapshotEntries.length ? 'snapshot' : 'empty'

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
      restoredFromBackup,
    },
  }
}