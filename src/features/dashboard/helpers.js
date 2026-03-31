import { calculatePrediction } from '../../utils/prediction'

// Constants
export const INITIAL_VISIBLE_MATCHES = 6
export const LOAD_MORE_STEP = 6
export const REFRESH_INTERVAL_MS = 60000
export const MAX_RETRY_ATTEMPTS = 3
export const CACHE_DURATION_MS = 5 * 60 * 1000 // 5 minutes

// Outcome labels mapping
export const outcomeLabels = {
  home: 'Home Win',
  draw: 'Draw',
  away: 'Away Win',
}

// Filter options
export const filterOptions = [
  { id: 'all', label: 'All', icon: '🎯' },
  { id: 'today', label: 'Today', icon: '📅' },
  { id: 'tomorrow', label: 'Tomorrow', icon: '⏰' },
  { id: 'date', label: 'By date', icon: '📆' },
]

// Sort options
export const sortOptions = [
  { id: 'date', label: 'Sort by date', icon: '📅' },
  { id: 'league', label: 'Sort by league', icon: '🏆' },
  { id: 'confidence', label: 'Sort by confidence', icon: '📊' },
]

// Feed tabs
export const feedTabs = [
  { id: 'all', label: 'All predictions', icon: '🎯' },
  { id: 'live', label: 'Live', icon: '🔴' },
  { id: 'upcoming', label: 'Upcoming', icon: '📅' },
]

/**
 * Convert date to ISO date string (YYYY-MM-DD)
 * @param {Date|string} value - Date to convert
 * @returns {string} ISO date string
 */
export function toDateKey(value) {
  if (!value) return ''
  
  const date = new Date(value)
  if (isNaN(date.getTime())) return ''
  
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  
  return `${year}-${month}-${day}`
}

/**
 * Add days to a date
 * @param {Date|string} value - Starting date
 * @param {number} days - Number of days to add
 * @returns {Date} New date
 */
export function addDays(value, days) {
  const date = new Date(value)
  if (isNaN(date.getTime())) return new Date()
  
  date.setDate(date.getDate() + days)
  return date
}

/**
 * Format kickoff time with locale support
 * @param {string} value - ISO date string
 * @param {Object} options - Intl.DateTimeFormat options
 * @returns {string} Formatted date string
 */
export function formatKickoff(value, options = {}) {
  if (!value) return 'Kickoff pending'
  
  const date = new Date(value)
  if (isNaN(date.getTime())) return 'Invalid date'
  
  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
    ...options,
  }).format(date)
}

/**
 * Format score string
 * @param {Object} score - Score object with home and away properties
 * @param {number} score.home - Home team score
 * @param {number} score.away - Away team score
 * @returns {string} Formatted score
 */
export function formatScore(score) {
  if (!score || score.home === null || score.home === undefined || score.away === null || score.away === undefined) {
    return 'vs'
  }
  return `${score.home} - ${score.away}`
}

/**
 * Get actual outcome from score
 * @param {Object} score - Score object
 * @returns {string|null} Outcome: 'home', 'away', 'draw', or null
 */
export function getActualOutcome(score) {
  if (!score || score.home === null || score.home === undefined || score.away === null || score.away === undefined) {
    return null
  }
  
  if (score.home > score.away) return 'home'
  if (score.home < score.away) return 'away'
  return 'draw'
}

/**
 * Get feed priority for sorting
 * @param {Object} match - Match object
 * @returns {number} Priority (0=highest)
 */
function getFeedPriority(match) {
  if (match.statusCategory === 'live') return 0
  if (match.statusCategory === 'upcoming') return 1
  return 2
}

/**
 * Compare matches by date and status
 * @param {Object} left - First match
 * @param {Object} right - Second match
 * @returns {number} Sort order
 */
export function compareByMatchDate(left, right) {
  if (left.statusCategory !== right.statusCategory) {
    return getFeedPriority(left) - getFeedPriority(right)
  }
  
  if (left.statusCategory === 'played') {
    return new Date(right.utcDate) - new Date(left.utcDate)
  }
  
  return new Date(left.utcDate) - new Date(right.utcDate)
}

/**
 * Compare matches by confidence
 * @param {Object} left - First match
 * @param {Object} right - Second match
 * @returns {number} Sort order
 */
export function compareByConfidence(left, right) {
  return (right.strongestValue || 0) - (left.strongestValue || 0)
}

/**
 * Compare matches by league name
 * @param {Object} left - First match
 * @param {Object} right - Second match
 * @returns {number} Sort order
 */
export function compareByLeague(left, right) {
  const leftName = left.competition?.name || ''
  const rightName = right.competition?.name || ''
  return leftName.localeCompare(rightName)
}

/**
 * Build match insight with predictions and analysis
 * @param {Object} match - Raw match data
 * @param {Map} analysisByFixture - Map of fixture IDs to analysis
 * @param {Map} intelByFixture - Map of fixture IDs to team intel
 * @returns {Object} Enhanced match object
 */
export function buildMatchInsight(match, analysisByFixture, intelByFixture) {
  const prediction = match.model?.probabilities ?? calculatePrediction(match.homeStats, match.awayStats)
  const [predictedOutcome, predictedProbability] = Object.entries(prediction).sort(
    (left, right) => right[1] - left[1],
  )[0]
  
  const strongestOutcome = match.model?.strongestOutcome ?? predictedOutcome
  const strongestValue = match.model?.confidence ?? predictedProbability
  const analysis = analysisByFixture?.get(match.id)
  const intel = intelByFixture?.get(match.id)
  
  return {
    ...match,
    prediction,
    strongestOutcome,
    strongestValue,
    strongestProbability: predictedProbability,
    valueBet: match.model?.valueBet ?? null,
    analysis,
    intel,
  }
}

/**
 * Merge unique matches from multiple groups
 * @param {Array<Array>} groups - Arrays of matches
 * @returns {Array} Unique matches
 */
export function mergeUniqueMatches(groups) {
  const seen = new Set()
  
  return groups.flat().filter((match) => {
    if (seen.has(match.id)) return false
    seen.add(match.id)
    return true
  })
}

/**
 * Format percentage for display
 * @param {number} value - Percentage value
 * @returns {string} Formatted percentage
 */
export function formatPercent(value) {
  if (value === null || value === undefined) return 'N/A'
  return `${Math.round(value)}%`
}

/**
 * Format form value for display
 * @param {number} value - Form value (0-1)
 * @returns {string} Formatted form
 */
export function formatFormValue(value) {
  if (value === null || value === undefined) return 'N/A'
  return `${Math.round(value * 100)}%`
}

/**
 * Format goals average for display
 * @param {number} value - Goals average
 * @returns {string} Formatted goals
 */
export function formatGoalsAverage(value) {
  if (value === null || value === undefined) return 'N/A'
  return value.toFixed(1)
}

/**
 * Calculate hit rate with proper rounding
 * @param {number} correct - Number of correct predictions
 * @param {number} total - Total predictions
 * @returns {number} Hit rate percentage
 */
export function calculateHitRate(correct, total) {
  if (!total || total === 0) return 0
  return Math.round((correct / total) * 100)
}

/**
 * Calculate calibration error
 * @param {Array} bands - Calibration bands
 * @returns {number} Weighted calibration error
 */
export function calculateCalibrationError(bands) {
  let totalGap = 0
  let totalWeight = 0
  
  bands.forEach(band => {
    if (band.sampleSize && band.calibrationGap !== null) {
      totalGap += Math.abs(band.calibrationGap) * band.sampleSize
      totalWeight += band.sampleSize
    }
  })
  
  return totalWeight > 0 ? Math.round(totalGap / totalWeight) : 0
}

/**
 * Get status badge configuration
 * @param {Object} match - Match object
 * @param {boolean} isNextMatch - Whether this is the next match
 * @returns {Object} Badge configuration
 */
export function getStatusBadge(match, isNextMatch = false) {
  if (match.statusCategory === 'live') {
    return {
      label: match.statusLabel || 'LIVE',
      className: 'border-rose-400/30 bg-rose-500/15 text-rose-200',
      icon: '🔴',
      animate: true,
    }
  }
  
  if (isNextMatch) {
    return {
      label: 'NEXT',
      className: 'border-sky-400/30 bg-sky-500/15 text-sky-200',
      icon: '⏰',
      animate: false,
    }
  }
  
  if (match.statusCategory === 'played') {
    return {
      label: 'PLAYED',
      className: 'border-amber-400/30 bg-amber-500/15 text-amber-200',
      icon: '✓',
      animate: false,
    }
  }
  
  return {
    label: 'UPCOMING',
    className: 'border-emerald-400/30 bg-emerald-500/15 text-emerald-200',
    icon: '📅',
    animate: false,
  }
}

/**
 * Debounce function for performance
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
export function debounce(func, wait) {
  let timeout
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout)
      func(...args)
    }
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}

/**
 * Throttle function for performance
 * @param {Function} func - Function to throttle
 * @param {number} limit - Limit in milliseconds
 * @returns {Function} Throttled function
 */
export function throttle(func, limit) {
  let inThrottle
  return function executedFunction(...args) {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => {
        inThrottle = false
      }, limit)
    }
  }
}

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} Whether email is valid
 */
export function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@([^\s@]+\.)+[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @returns {Object} Validation result
 */
export function validatePassword(password) {
  if (!password) {
    return { valid: false, message: 'Password is required' }
  }
  
  if (password.length < 6) {
    return { valid: false, message: 'Password must be at least 6 characters' }
  }
  
  if (!/\d/.test(password)) {
    return { valid: false, message: 'Password must contain at least one number' }
  }
  
  if (!/[a-zA-Z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one letter' }
  }
  
  return { valid: true, message: '' }
}

/**
 * Truncate text with ellipsis
 * @param {string} text - Text to truncate
 * @param {number} length - Maximum length
 * @returns {string} Truncated text
 */
export function truncateText(text, length = 100) {
  if (!text) return ''
  if (text.length <= length) return text
  return text.slice(0, length).trim() + '...'
}