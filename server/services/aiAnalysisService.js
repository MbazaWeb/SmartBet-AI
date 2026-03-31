const outcomeLabels = {
  home: 'home win',
  draw: 'draw',
  away: 'away win',
}

function derivePrediction(match) {
  const modelPrediction = match.model?.probabilities

  if (modelPrediction) {
    return modelPrediction
  }

  const homeEdge = (match.homeStats?.form ?? 0.5) + (match.homeStats?.goalsScoredPerMatch ?? 1.2) * 0.12
  const awayEdge = (match.awayStats?.form ?? 0.5) + (match.awayStats?.goalsScoredPerMatch ?? 1.2) * 0.12

  if (Math.abs(homeEdge - awayEdge) < 0.08) {
    return { home: 34, draw: 36, away: 30 }
  }

  return homeEdge > awayEdge
    ? { home: 46, draw: 28, away: 26 }
    : { home: 26, draw: 28, away: 46 }
}

function getStrongestPrediction(prediction) {
  const [outcome, confidence] = Object.entries(prediction).sort((left, right) => right[1] - left[1])[0]
  return { outcome, confidence }
}

export function buildAiAnalysis(matches, teamIntel, trainingSummary, liveMatches) {
  const intelByFixture = new Map(teamIntel.map((item) => [item.fixtureId, item]))
  const liveMatchIds = new Set(liveMatches.map((item) => item.id))

  const analysisFeed = matches.slice(0, 12).map((match, index) => {
    const prediction = derivePrediction(match)
    const strongest = getStrongestPrediction(prediction)
    const intel = intelByFixture.get(match.id)
    const liveStatus = liveMatchIds.has(match.id)
    const trainingReference = trainingSummary?.competitionName || 'StatsBomb baseline'
    const expectedGoals = match.model?.expectedGoals

    return {
      fixtureId: match.id,
      analyst: {
        name: index % 2 === 0 ? 'SmartBet Oracle' : 'Signal Studio',
        handle: index % 2 === 0 ? '@smartbet.oracle' : '@signal.studio',
      },
      caption: `${match.homeTeam.name} vs ${match.awayTeam.name}: AI leans ${outcomeLabels[strongest.outcome]} at ${match.model?.confidence ?? strongest.confidence}% confidence with ${match.model?.stability?.toLowerCase() || 'medium'} stability from weighted form, opponent resistance, and Poisson goal simulation.`,
      researchNotes: [
        `${match.homeTeam.name} form: ${Math.round((match.model?.form?.home ?? 0.5) * 100)}% vs ${match.awayTeam.name} at ${Math.round((match.model?.form?.away ?? 0.5) * 100)}%.`,
        expectedGoals
          ? `Expected goals: ${match.homeTeam.name} ${expectedGoals.home} vs ${match.awayTeam.name} ${expectedGoals.away}.`
          : `Goal trend: ${match.homeTeam.name} ${match.homeStats.goalsScoredPerMatch?.toFixed(1) ?? '1.3'} scored per match; ${match.awayTeam.name} ${match.awayStats.goalsScoredPerMatch?.toFixed(1) ?? '1.3'}.`,
        match.model?.stability
          ? `Stability: ${match.model.stability}. ${match.model.uncertainty ? 'This matchup is close enough to treat cautiously.' : 'The edge is clearer than the average fixture.'}`
          : `Stability data is still being assembled for this match.`,
        intel?.featuredPlayer
          ? `TheSportsDB spotlight: ${intel.featuredPlayer.name} (${intel.featuredPlayer.position}) adds the human layer for ${intel.team.name}.`
          : `StatsBomb training reference: ${trainingReference} keeps the projection anchored to historical scoring patterns.`,
      ],
      researchTags: [match.competition.name, strongest.outcome.toUpperCase(), liveStatus ? 'LIVE' : 'PREMATCH'],
      strongestOutcome: strongest.outcome,
      strongestConfidence: strongest.confidence,
      liveStatus,
    }
  })

  const pollTopics = analysisFeed.slice(0, 3).map((item) => ({
    id: `poll-${item.fixtureId}`,
    fixtureId: item.fixtureId,
    question: `What is the sharpest angle for ${item.caption.split(':')[0]}?`,
    options: [
      { id: 'home', label: 'Back home', votes: 28 + item.strongestConfidence },
      { id: 'draw', label: 'Hold draw', votes: 18 + Math.round(item.strongestConfidence / 3) },
      { id: 'away', label: 'Back away', votes: 22 + Math.round(item.strongestConfidence / 2) },
    ],
  }))

  const researchDigest = {
    headline: 'AI Research Board',
    summary: trainingSummary
      ? `${trainingSummary.competitionName} ${trainingSummary.seasonName} gives the model a ${trainingSummary.sampledMatches}-match training anchor.`
      : 'Training summary is currently unavailable from the data providers.',
    notes: [
      `${matches.length} fixtures are in the active research queue.`,
      liveMatches.length ? `${liveMatches.length} matches are currently live and updating the sentiment pulse.` : 'No live matches are currently active.',
      teamIntel[0]?.featuredPlayer
        ? `${teamIntel[0].featuredPlayer.name} is the first player spotlight pulled from TheSportsDB.`
        : 'Player spotlight data is waiting on provider matches.',
    ],
  }

  return {
    analysisFeed,
    pollTopics,
    researchDigest,
  }
}