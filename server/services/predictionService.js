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

function toPercent(value) {
  return round(value * 100, 1)
}

function roundPercentages(rawValues) {
  const base = Object.fromEntries(
    Object.entries(rawValues).map(([key, value]) => [key, Math.floor(value)]),
  )

  let remainder = 100 - Object.values(base).reduce((sum, value) => sum + value, 0)
  const rankedDecimals = Object.entries(rawValues)
    .map(([key, value]) => ({ key, decimal: value - Math.floor(value) }))
    .sort((left, right) => right.decimal - left.decimal)

  for (let index = 0; index < rankedDecimals.length && remainder > 0; index += 1) {
    base[rankedDecimals[index].key] += 1
    remainder -= 1
  }

  return base
}

function weightedAverage(values) {
  if (!values?.length) {
    return 0
  }

  const weighted = values.reduce(
    (state, value, index) => {
      const weight = Math.max(values.length - index, 1)

      return {
        total: state.total + value * weight,
        weight: state.weight + weight,
      }
    },
    { total: 0, weight: 0 },
  )

  return weighted.weight ? round(weighted.total / weighted.weight) : 0
}

function variance(values) {
  if (!values?.length) {
    return 0
  }

  const average = values.reduce((sum, value) => sum + value, 0) / values.length
  const squaredDiff = values.reduce((sum, value) => sum + (value - average) ** 2, 0)
  return round(squaredDiff / values.length)
}

function poissonProbability(lambda, goals) {
  const safeLambda = clamp(lambda, 0.05, 5)
  let factorial = 1

  for (let index = 2; index <= goals; index += 1) {
    factorial *= index
  }

  return (Math.exp(-safeLambda) * safeLambda ** goals) / factorial
}

function normalizeProbabilities(probabilities) {
  const total = Object.values(probabilities).reduce((sum, value) => sum + value, 0)

  if (!total) {
    return { home: 0.33, draw: 0.34, away: 0.33 }
  }

  return {
    home: probabilities.home / total,
    draw: probabilities.draw / total,
    away: probabilities.away / total,
  }
}

function classifyStability(homeProbability, awayProbability, homeVariance, awayVariance) {
  const edge = Math.abs(homeProbability - awayProbability)
  const volatility = (homeVariance + awayVariance) / 2

  if (edge < 0.1) {
    return { label: 'UNSTABLE', confidenceModifier: 0.86 }
  }

  if (volatility > 1.4) {
    return { label: 'MEDIUM', confidenceModifier: 0.92 }
  }

  if (edge > 0.22 && volatility < 0.9) {
    return { label: 'HIGH', confidenceModifier: 1 }
  }

  return { label: 'MEDIUM', confidenceModifier: 0.96 }
}

function selectVenueMatches(matches, venue) {
  const venueMatches = matches.filter((match) => match.venue === venue)
  return venueMatches.length >= 3 ? venueMatches : matches
}

export function formScore(matches) {
  if (!matches?.length) {
    return 0.5
  }

  const points = matches.reduce((total, match) => {
    if (match.result === 'W') {
      return total + 3
    }

    if (match.result === 'D') {
      return total + 1
    }

    return total
  }, 0)

  return round(points / (matches.length * 3))
}

function h2hScore(matches, targetTeamId) {
  if (!matches?.length || !targetTeamId) {
    return 0
  }

  const summary = matches.reduce(
    (state, match) => {
      if (match.winnerTeamId === null) {
        return { ...state, draws: state.draws + 1 }
      }

      if (match.winnerTeamId === targetTeamId) {
        return { ...state, wins: state.wins + 1 }
      }

      return { ...state, losses: state.losses + 1 }
    },
    { wins: 0, losses: 0, draws: 0 },
  )

  return round((summary.wins - summary.losses) / matches.length)
}

function buildHomeBoost(pointsPerMatch) {
  return round(clamp(0.98 + pointsPerMatch * 0.04, 0.98, 1.08))
}

function buildAwayPenalty(pointsPerMatch) {
  return round(clamp(0.94 + pointsPerMatch * 0.04, 0.94, 1.04))
}

function toProbabilityScores(expectedGoalsHome, expectedGoalsAway) {
  let homeWin = 0
  let draw = 0
  let awayWin = 0

  for (let homeGoals = 0; homeGoals <= 7; homeGoals += 1) {
    for (let awayGoals = 0; awayGoals <= 7; awayGoals += 1) {
      const probability = poissonProbability(expectedGoalsHome, homeGoals) * poissonProbability(expectedGoalsAway, awayGoals)

      if (homeGoals > awayGoals) {
        homeWin += probability
      } else if (homeGoals < awayGoals) {
        awayWin += probability
      } else {
        draw += probability
      }
    }
  }

  const corrected = normalizeProbabilities({
    home: homeWin,
    draw: draw * 1.15,
    away: awayWin,
  })

  return roundPercentages({
    home: corrected.home * 100,
    draw: corrected.draw * 100,
    away: corrected.away * 100,
  })
}

function buildPredictionLabel(homeProbability, awayProbability) {
  if (Math.abs(homeProbability - awayProbability) < 0.1) {
    return 'UNSTABLE'
  }

  if (homeProbability > awayProbability + 0.03) {
    return 'HOME WIN'
  }

  if (awayProbability > homeProbability + 0.03) {
    return 'AWAY WIN'
  }

  return 'DRAW'
}

function strongestOutcome(probabilities) {
  const [outcome, confidence] = Object.entries(probabilities).sort((left, right) => right[1] - left[1])[0]
  return { outcome, confidence }
}

function hasSparsePredictionInputs({
  homeRecentMatches,
  awayRecentMatches,
  h2hMatches,
  bookmakerOdds,
}) {
  return (
    !homeRecentMatches?.length &&
    !awayRecentMatches?.length &&
    !h2hMatches?.length &&
    !bookmakerOdds?.available
  )
}

function buildValueBet(probabilities, bookmakerOdds) {
  if (!bookmakerOdds?.available || !bookmakerOdds.consensus?.impliedProbabilities || !bookmakerOdds.bestOdds) {
    return {
      available: false,
      reason: 'Bookmaker odds are not available for this fixture.',
    }
  }

  const outcomes = ['home', 'draw', 'away'].reduce((summary, outcome) => {
    const modelProbability = clamp(parseNumber(probabilities[outcome], 0), 0, 1)
    const impliedProbability = clamp(parseNumber(bookmakerOdds.consensus.impliedProbabilities[outcome], 0), 0, 1)
    const bestOddsValue = parseNumber(bookmakerOdds.bestOdds[outcome]?.odds, 0)
    const expectedValue = bestOddsValue > 1 ? modelProbability * bestOddsValue - 1 : -1

    return {
      ...summary,
      [outcome]: {
        modelProbability: toPercent(modelProbability),
        impliedProbability: toPercent(impliedProbability),
        edge: toPercent(modelProbability - impliedProbability),
        expectedValue: toPercent(expectedValue),
        bestOdds: bestOddsValue ? round(bestOddsValue) : null,
        bookmaker: bookmakerOdds.bestOdds[outcome]?.bookmaker ?? null,
      },
    }
  }, {})

  const rankedOutcomes = Object.entries(outcomes)
    .map(([outcome, summary]) => ({ outcome, ...summary }))
    .sort((left, right) => {
      if (right.expectedValue !== left.expectedValue) {
        return right.expectedValue - left.expectedValue
      }

      return right.edge - left.edge
    })

  const bestOutcome = rankedOutcomes[0]
  const positiveValue = bestOutcome && bestOutcome.expectedValue > 0 && bestOutcome.edge > 0

  return {
    available: true,
    bookmakerCount: bookmakerOdds.bookmakerCount ?? 0,
    consensus: bookmakerOdds.consensus,
    bestOdds: bookmakerOdds.bestOdds,
    outcomes,
    bestOutcome: bestOutcome?.outcome ?? null,
    bestEdge: bestOutcome?.edge ?? 0,
    bestExpectedValue: bestOutcome?.expectedValue ?? 0,
    recommended: positiveValue ? bestOutcome.outcome : null,
    isPositiveEdge: Boolean(positiveValue),
  }
}

export function buildPredictionModel({
  homeTeam,
  awayTeam,
  leagueAverageGoals,
  homeRecentMatches,
  awayRecentMatches,
  h2hMatches,
  homeSeasonStats,
  awaySeasonStats,
  bookmakerOdds,
}) {
  const sparseInputs = hasSparsePredictionInputs({
    homeRecentMatches,
    awayRecentMatches,
    h2hMatches,
    bookmakerOdds,
  })
  const safeLeagueAverage = clamp(parseNumber(leagueAverageGoals, 1.35), 0.8, 2.4)
  const homeVenueMatches = selectVenueMatches(homeRecentMatches, 'home')
  const awayVenueMatches = selectVenueMatches(awayRecentMatches, 'away')
  const homeForm = formScore(homeVenueMatches)
  const awayForm = formScore(awayVenueMatches)
  const homeRecentGoalsFor = homeVenueMatches.map((match) => parseNumber(match.goalsFor, 0))
  const homeRecentGoalsAgainst = homeVenueMatches.map((match) => parseNumber(match.goalsAgainst, 0))
  const awayRecentGoalsFor = awayVenueMatches.map((match) => parseNumber(match.goalsFor, 0))
  const awayRecentGoalsAgainst = awayVenueMatches.map((match) => parseNumber(match.goalsAgainst, 0))
  const homeWeightedGoalsFor = weightedAverage(homeRecentGoalsFor) || parseNumber(homeSeasonStats.averageGoalsScored, 1.3)
  const homeWeightedGoalsAgainst = weightedAverage(homeRecentGoalsAgainst) || parseNumber(homeSeasonStats.averageGoalsConceded, 1.3)
  const awayWeightedGoalsFor = weightedAverage(awayRecentGoalsFor) || parseNumber(awaySeasonStats.averageGoalsScored, 1.3)
  const awayWeightedGoalsAgainst = weightedAverage(awayRecentGoalsAgainst) || parseNumber(awaySeasonStats.averageGoalsConceded, 1.3)
  const homeVariance = variance(homeRecentGoalsFor)
  const awayVariance = variance(awayRecentGoalsFor)
  const homeAttackStrength = round(homeWeightedGoalsFor / safeLeagueAverage)
  const awayAttackStrength = round(awayWeightedGoalsFor / safeLeagueAverage)
  const homeDefenseStrength = round(homeWeightedGoalsAgainst / safeLeagueAverage)
  const awayDefenseStrength = round(awayWeightedGoalsAgainst / safeLeagueAverage)
  const defensiveResistanceHome = round(1 / clamp(homeDefenseStrength, 0.45, 2.4))
  const defensiveResistanceAway = round(1 / clamp(awayDefenseStrength, 0.45, 2.4))
  const adjustedHomeAttack = round(homeAttackStrength * defensiveResistanceAway)
  const adjustedAwayAttack = round(awayAttackStrength * defensiveResistanceHome)
  const dynamicHomeAdvantage = round(
    clamp(
      homeWeightedGoalsFor / clamp(awayWeightedGoalsAgainst, 0.6, 3.5),
      0.9,
      1.2,
    ),
  )
  const homeBoost = round(
    clamp(dynamicHomeAdvantage * buildHomeBoost(parseNumber(homeSeasonStats.homePerformance?.pointsPerMatch, 1.3)), 0.94, 1.2),
  )
  const awayPenalty = buildAwayPenalty(parseNumber(awaySeasonStats.awayPerformance?.pointsPerMatch, 1.3))
  const homeH2hRaw = h2hScore(h2hMatches, homeTeam.id)
  const awayH2hRaw = h2hScore(h2hMatches, awayTeam.id)
  const homeH2h = round((homeH2hRaw + 1) / 2)
  const awayH2h = round((awayH2hRaw + 1) / 2)

  if (sparseInputs) {
    const neutralProbabilities = { home: 33, draw: 34, away: 33 }
    const neutralValueBet = buildValueBet(
      {
        home: neutralProbabilities.home / 100,
        draw: neutralProbabilities.draw / 100,
        away: neutralProbabilities.away / 100,
      },
      bookmakerOdds,
    )

    return {
      prediction: 'UNSTABLE',
      confidence: 34,
      strongestOutcome: 'draw',
      probabilities: neutralProbabilities,
      expectedGoals: {
        home: 1.1,
        away: 1.1,
      },
      exactScore: {
        home: 1,
        away: 1,
      },
      form: {
        home: 0.5,
        away: 0.5,
      },
      strengths: {
        attack: {
          home: 1,
          away: 1,
        },
        defense: {
          home: 1,
          away: 1,
        },
      },
      context: {
        homeBoost: 1,
        awayPenalty: 1,
        dynamicHomeAdvantage: 1,
        h2h: {
          home: 0,
          away: 0,
          matches: 0,
        },
        homePerformance: homeSeasonStats.homePerformance,
        awayPerformance: awaySeasonStats.awayPerformance,
        sparseInputs: true,
      },
      season: {
        leagueAverageGoals: safeLeagueAverage,
        home: homeSeasonStats,
        away: awaySeasonStats,
      },
      finalScores: {
        home: 1.1,
        away: 1.1,
      },
      recentMatches: {
        home: homeVenueMatches,
        away: awayVenueMatches,
      },
      weightedForm: {
        homeGoalsFor: 1.1,
        homeGoalsAgainst: 1.1,
        awayGoalsFor: 1.1,
        awayGoalsAgainst: 1.1,
      },
      venueForm: {
        home: 0.5,
        away: 0.5,
        homeSample: 0,
        awaySample: 0,
      },
      consistency: {
        homeVariance: 0,
        awayVariance: 0,
      },
      stability: 'UNSTABLE',
      uncertainty: true,
      valueBet: neutralValueBet,
    }
  }

  const expectedGoalsHome = round(
    clamp((adjustedHomeAttack * 0.52 + homeForm * 0.18 + homeH2h * 0.12 + homeBoost * 0.18) * safeLeagueAverage, 0.2, 4.2),
  )
  const expectedGoalsAway = round(
    clamp((adjustedAwayAttack * 0.56 + awayForm * 0.2 + awayH2h * 0.12 + awayPenalty * 0.12) * safeLeagueAverage, 0.2, 4.2),
  )
  const probabilities = toProbabilityScores(expectedGoalsHome, expectedGoalsAway)
  const strongest = strongestOutcome(probabilities)
  const normalized = normalizeProbabilities({
    home: probabilities.home / 100,
    draw: probabilities.draw / 100,
    away: probabilities.away / 100,
  })
  const stability = classifyStability(normalized.home, normalized.away, homeVariance, awayVariance)
  const adjustedConfidence = Math.max(1, Math.round(strongest.confidence * stability.confidenceModifier))
  const valueBet = buildValueBet(normalized, bookmakerOdds)

  return {
    prediction: buildPredictionLabel(normalized.home, normalized.away),
    confidence: adjustedConfidence,
    strongestOutcome: strongest.outcome,
    probabilities,
    expectedGoals: {
      home: expectedGoalsHome,
      away: expectedGoalsAway,
    },
    exactScore: {
      home: Math.max(0, Math.round(expectedGoalsHome)),
      away: Math.max(0, Math.round(expectedGoalsAway)),
    },
    form: {
      home: homeForm,
      away: awayForm,
    },
    strengths: {
      attack: {
        home: round(adjustedHomeAttack),
        away: round(adjustedAwayAttack),
      },
      defense: {
        home: round(defensiveResistanceHome),
        away: round(defensiveResistanceAway),
      },
    },
    context: {
      homeBoost,
      awayPenalty,
      dynamicHomeAdvantage,
      h2h: {
        home: homeH2hRaw,
        away: awayH2hRaw,
        matches: h2hMatches.length,
      },
      homePerformance: homeSeasonStats.homePerformance,
      awayPerformance: awaySeasonStats.awayPerformance,
    },
    season: {
      leagueAverageGoals: safeLeagueAverage,
      home: homeSeasonStats,
      away: awaySeasonStats,
    },
    finalScores: {
      home: expectedGoalsHome,
      away: expectedGoalsAway,
    },
    recentMatches: {
      home: homeVenueMatches,
      away: awayVenueMatches,
    },
    weightedForm: {
      homeGoalsFor: homeWeightedGoalsFor,
      homeGoalsAgainst: homeWeightedGoalsAgainst,
      awayGoalsFor: awayWeightedGoalsFor,
      awayGoalsAgainst: awayWeightedGoalsAgainst,
    },
    venueForm: {
      home: homeForm,
      away: awayForm,
      homeSample: homeVenueMatches.length,
      awaySample: awayVenueMatches.length,
    },
    consistency: {
      homeVariance,
      awayVariance,
    },
    stability: stability.label,
    uncertainty: Math.abs(normalized.home - normalized.away) < 0.1,
    valueBet,
  }
}