import axios from 'axios'

const statsBombClient = axios.create({
  baseURL: 'https://raw.githubusercontent.com/statsbomb/open-data/master/data',
})

export async function getTrainingSummary() {
  try {
    const competitionsResponse = await statsBombClient.get('/competitions.json')
    const competitions = competitionsResponse.data ?? []
    const targetCompetition = competitions.find(
      (competition) => competition.competition_id && competition.season_id,
    )

    if (!targetCompetition) {
      return null
    }

    const matchesResponse = await statsBombClient.get(
      `/matches/${targetCompetition.competition_id}/${targetCompetition.season_id}.json`,
    )
    const matches = matchesResponse.data ?? []

    if (!matches.length) {
      return null
    }

    const sampledMatches = matches.slice(0, 50)
    const totals = sampledMatches.reduce(
      (summary, match) => ({
        goals: summary.goals + match.home_score + match.away_score,
        homeWins: summary.homeWins + (match.home_score > match.away_score ? 1 : 0),
        draws: summary.draws + (match.home_score === match.away_score ? 1 : 0),
      }),
      { goals: 0, homeWins: 0, draws: 0 },
    )

    return {
      source: 'statsbomb',
      competitionName: targetCompetition.competition_name,
      seasonName: targetCompetition.season_name,
      sampledMatches: sampledMatches.length,
      averageGoals: Number((totals.goals / sampledMatches.length).toFixed(2)),
      homeWinRate: Number((totals.homeWins / sampledMatches.length).toFixed(2)),
      drawRate: Number((totals.draws / sampledMatches.length).toFixed(2)),
    }
  } catch {
    return null
  }
}