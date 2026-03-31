function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

function normalize(value, maxValue) {
  return clamp(value / maxValue, 0, 1)
}

function roundPercentages(rawValues) {
  const base = Object.fromEntries(
    Object.entries(rawValues).map(([key, value]) => [key, Math.floor(value)]),
  )

  let remainder = 100 - Object.values(base).reduce((sum, value) => sum + value, 0)

  const decimalOrder = Object.entries(rawValues)
    .map(([key, value]) => ({ key, decimal: value - Math.floor(value) }))
    .sort((left, right) => right.decimal - left.decimal)

  for (let index = 0; index < decimalOrder.length && remainder > 0; index += 1) {
    base[decimalOrder[index].key] += 1
    remainder -= 1
  }

  return base
}

export function calculatePrediction(homeStats, awayStats) {
  const safeHome = homeStats ?? {}
  const safeAway = awayStats ?? {}

  const homeForm = clamp(safeHome.form ?? 0.5, 0, 1)
  const awayForm = clamp(safeAway.form ?? 0.5, 0, 1)
  const homeAttack = normalize(safeHome.goalsScoredPerMatch ?? 1.3, 3.5)
  const awayAttack = normalize(safeAway.goalsScoredPerMatch ?? 1.3, 3.5)
  const homeDefence = 1 - normalize(safeHome.goalsConcededPerMatch ?? 1.3, 3.5)
  const awayDefence = 1 - normalize(safeAway.goalsConcededPerMatch ?? 1.3, 3.5)

  const homeStrength = homeForm * 0.44 + homeAttack * 0.31 + homeDefence * 0.25
  const awayStrength = awayForm * 0.44 + awayAttack * 0.31 + awayDefence * 0.25
  const totalStrength = Math.max(homeStrength + awayStrength, 0.01)

  const strengthGap = Math.abs(homeStrength - awayStrength)
  const scoringProfile = (homeAttack + awayAttack) / 2
  const drawShare = clamp(0.24 + (1 - normalize(strengthGap, 0.55)) * 0.14 + (1 - scoringProfile) * 0.08, 0.2, 0.36)

  const remainingShare = 1 - drawShare
  const homeShare = remainingShare * (homeStrength / totalStrength)
  const awayShare = remainingShare * (awayStrength / totalStrength)

  return roundPercentages({
    home: homeShare * 100,
    draw: drawShare * 100,
    away: awayShare * 100,
  })
}