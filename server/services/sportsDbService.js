import axios from 'axios'

function getSportsDbClient() {
  const sportsDbKey = process.env.THE_SPORTS_DB_KEY

  return axios.create({
    baseURL: `https://www.thesportsdb.com/api/v1/json/${sportsDbKey}`,
  })
}

function buildNameCandidates(teamName) {
  const compact = teamName.replace(/\b(FC|CF|AFC|SC|AC|CFC)\b/gi, '').replace(/\s+/g, ' ').trim()
  return [...new Set([teamName, compact].filter(Boolean))]
}

async function findTeam(teamName) {
  const sportsDbClient = getSportsDbClient()

  for (const candidate of buildNameCandidates(teamName)) {
    try {
      const response = await sportsDbClient.get('/searchteams.php', {
        params: { t: candidate },
      })

      if (response.data.teams?.length) {
        return response.data.teams[0]
      }
    } catch {
      return null
    }
  }

  return null
}

async function findPlayers(teamName) {
  const sportsDbClient = getSportsDbClient()

  for (const candidate of buildNameCandidates(teamName)) {
    try {
      const response = await sportsDbClient.get('/searchplayers.php', {
        params: { t: candidate },
      })

      if (response.data.player?.length) {
        return response.data.player
      }
    } catch {
      return []
    }
  }

  return []
}

function pickFeaturedPlayer(players) {
  if (!players.length) {
    return null
  }

  return players.find((player) => player.strPosition && player.strPosition !== 'Manager') || players[0]
}

export async function getTeamIntel(fixtures) {
  if (!fixtures.length || !process.env.THE_SPORTS_DB_KEY) {
    return []
  }

  const intel = await Promise.all(
    fixtures.slice(0, 4).map(async (fixture) => {
      const [team, players] = await Promise.all([
        findTeam(fixture.homeTeam.name),
        findPlayers(fixture.homeTeam.name),
      ])
      const featuredPlayer = pickFeaturedPlayer(players)

      return {
        fixtureId: fixture.id,
        team: {
          name: team?.strTeam || fixture.homeTeam.name,
          league: team?.strLeague || fixture.competition.name,
          badge: team?.strBadge || fixture.homeTeam.logo || '',
          stadium: team?.strStadium || fixture.venue || '',
        },
        opponent: {
          name: fixture.awayTeam.name,
        },
        featuredPlayer: featuredPlayer
          ? {
              name: featuredPlayer.strPlayer || 'Player unavailable',
              position: featuredPlayer.strPosition || 'Squad',
              thumbnail: featuredPlayer.strThumb || featuredPlayer.strCutout || '',
            }
          : null,
        source: team || featuredPlayer ? 'thesportsdb' : 'unavailable',
      }
    }),
  )

  return intel.filter(Boolean)
}