import { getLiveFixtures, getPlayedFixtures, getUpcomingFixtures } from './apiFootballService.js'
import { buildAiAnalysis } from './aiAnalysisService.js'
import { mergeDashboardFixtures } from './fixtureSnapshotService.js'
import { createProviderDiagnostics } from './providerDiagnosticsService.js'
import { getTeamIntel } from './sportsDbService.js'
import { getTrainingSummary } from './statsBombService.js'

export async function getDashboardData(options = {}) {
  const diagnostics = createProviderDiagnostics()
  const requestOptions = { ...options, diagnostics }
  const fetchedMatches = await Promise.resolve(getUpcomingFixtures(requestOptions)).catch(() => [])
  const fetchedLiveMatches = await Promise.resolve(getLiveFixtures(requestOptions)).catch(() => [])
  const fetchedPlayedMatches = await Promise.resolve(getPlayedFixtures(requestOptions)).catch(() => [])
  const { matches, liveMatches, playedMatches, nextMatch, dataStatus } = await mergeDashboardFixtures({
    matches: fetchedMatches,
    liveMatches: fetchedLiveMatches,
    playedMatches: fetchedPlayedMatches,
  })
  const trainingSummary = await Promise.resolve(getTrainingSummary()).catch(() => null)
  const teamIntel = await Promise.resolve(getTeamIntel(matches)).catch(() => [])
  const aiModel = buildAiAnalysis(matches, teamIntel, trainingSummary, liveMatches)

  return {
    matches,
    upcomingMatches: matches,
    nextMatch,
    liveMatches,
    playedMatches,
    teamIntel,
    trainingSummary,
    aiAnalysis: aiModel.analysisFeed,
    livePolls: aiModel.pollTopics,
    researchDigest: aiModel.researchDigest,
    dataStatus: {
      ...dataStatus,
      providerDiagnostics: diagnostics,
    },
    stack: {
      frontend: 'React + Tailwind',
      backend: 'Node.js + Express',
      providers: ['API-Football', 'TheSportsDB', 'StatsBomb'],
    },
  }
}