import axios from 'axios'
import { getApiBaseUrl, checkApiHealth } from './apiBaseUrl'

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: getApiBaseUrl('/api'),
  timeout: 30000, // 30 second timeout
  headers: {
    'Content-Type': 'application/json',
  },
})

// Simple in-memory cache
const cache = new Map()
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

// Retry configuration
const MAX_RETRIES = 3
const RETRY_DELAY = 1000 // 1 second

/**
 * Get cache key for request
 * @param {string} url - Request URL
 * @param {Object} params - Request params
 * @returns {string} Cache key
 */
function getCacheKey(url, params) {
  return `${url}?${JSON.stringify(params)}`
}

/**
 * Sleep for specified milliseconds
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))

/**
 * Make API request with retry logic
 * @param {Function} requestFn - Function that returns a promise
 * @param {number} retryCount - Current retry count
 * @returns {Promise<any>} API response
 */
async function withRetry(requestFn, retryCount = 0) {
  try {
    return await requestFn()
  } catch (error) {
    if (retryCount < MAX_RETRIES && shouldRetry(error)) {
      await sleep(RETRY_DELAY * (retryCount + 1))
      return withRetry(requestFn, retryCount + 1)
    }
    throw error
  }
}

/**
 * Determine if error is retryable
 * @param {Error} error - Error object
 * @returns {boolean} Whether to retry
 */
function shouldRetry(error) {
  if (axios.isAxiosError(error)) {
    // Network errors or 5xx server errors are retryable
    if (!error.response) return true
    const status = error.response.status
    return status >= 500 || status === 429
  }
  return false
}

/**
 * Get user-friendly error message
 * @param {Error} error - Error object
 * @returns {string} User-friendly error message
 */
function getErrorMessage(error) {
  if (axios.isAxiosError(error)) {
    // Network error
    if (!error.response) {
      return 'Unable to connect to the server. Please check your internet connection.'
    }
    
    // Server response with error
    const status = error.response.status
    const data = error.response.data
    
    if (data?.message) {
      return data.message
    }
    
    switch (status) {
      case 400:
        return 'Invalid request. Please try again.'
      case 401:
        return 'Authentication required. Please sign in.'
      case 403:
        return 'You do not have permission to access this resource.'
      case 404:
        return 'The requested resource was not found.'
      case 429:
        return 'Too many requests. Please wait a moment and try again.'
      case 500:
      case 502:
      case 503:
      case 504:
        return 'Server error. Please try again later.'
      default:
        return `Request failed with status ${status}`
    }
  }
  
  // Non-Axios error
  return error.message || 'An unexpected error occurred.'
}

/**
 * Get dashboard data
 * @param {Object} options - Request options
 * @param {boolean} options.fresh - Whether to bypass cache
 * @returns {Promise<Object>} Dashboard data
 */
export async function getDashboardData(options = {}) {
  const { fresh = false } = options
  const url = '/dashboard'
  const params = fresh ? { fresh: '1', t: Date.now() } : undefined
  const cacheKey = getCacheKey(url, params)
  
  // Check cache if not fresh
  if (!fresh && cache.has(cacheKey)) {
    const cached = cache.get(cacheKey)
    if (Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data
    }
    cache.delete(cacheKey)
  }
  
  try {
    const response = await withRetry(async () => {
      const result = await apiClient.get(url, { params })
      return result
    })
    
    // Validate response
    if (!response.data) {
      throw new Error('Empty response from server')
    }
    
    // Cache response
    cache.set(cacheKey, {
      data: response.data,
      timestamp: Date.now(),
    })
    
    return response.data
  } catch (error) {
    console.error('Error fetching dashboard data:', error)
    throw new Error(getErrorMessage(error))
  }
}

/**
 * Get matches data
 * @returns {Promise<Array>} Matches array
 */
export async function getMatches() {
  try {
    const dashboardData = await getDashboardData()
    const matches = dashboardData.matches ?? []
    
    // Validate matches data
    if (!Array.isArray(matches)) {
      console.warn('Matches data is not an array:', matches)
      return []
    }
    
    return matches
  } catch (error) {
    console.error('Error fetching matches:', error)
    return []
  }
}

/**
 * Get specific match by ID
 * @param {string|number} matchId - Match identifier
 * @returns {Promise<Object|null>} Match data or null
 */
export async function getMatchById(matchId) {
  try {
    const matches = await getMatches()
    return matches.find(match => match.id === matchId) || null
  } catch (error) {
    console.error(`Error fetching match ${matchId}:`, error)
    return null
  }
}

/**
 * Force refresh dashboard data (bypass cache)
 * @returns {Promise<Object>} Fresh dashboard data
 */
export async function refreshDashboardData() {
  return getDashboardData({ fresh: true })
}

/**
 * Check API health and connection
 * @returns {Promise<boolean>} Whether API is healthy
 */
export async function isApiHealthy() {
  try {
    const isHealthy = await checkApiHealth()
    return isHealthy
  } catch (error) {
    console.error('API health check failed:', error)
    return false
  }
}

/**
 * Clear the API cache
 */
export function clearApiCache() {
  cache.clear()
  console.log('API cache cleared')
}

// Request interceptor for logging (development only)
if (import.meta.env.DEV) {
  apiClient.interceptors.request.use(request => {
    console.log('API Request:', request.method?.toUpperCase(), request.url, request.params)
    return request
  })
  
  apiClient.interceptors.response.use(
    response => {
      console.log('API Response:', response.status, response.config.url)
      return response
    },
    error => {
      console.error('API Error:', error.config?.url, error.message)
      return Promise.reject(error)
    }
  )
}

export default {
  getDashboardData,
  getMatches,
  getMatchById,
  refreshDashboardData,
  isApiHealthy,
  clearApiCache,
}