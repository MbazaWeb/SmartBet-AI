/**
 * Utility function to trim trailing slashes from a URL string
 * @param {string} value - URL string to trim
 * @returns {string} URL without trailing slashes
 */
function trimTrailingSlash(value) {
  if (typeof value !== 'string') {
    console.warn('trimTrailingSlash received non-string value:', value)
    return ''
  }
  return value.replace(/\/+$/, '')
}

/**
 * Validates if a URL is properly formatted
 * @param {string} url - URL to validate
 * @returns {boolean} Whether URL is valid
 */
function isValidUrl(url) {
  if (typeof url !== 'string') return false
  try {
    // For relative URLs, just check format
    if (url.startsWith('/')) return true
    new URL(url)
    return true
  } catch {
    return false
  }
}

/**
 * Gets the API base URL for making requests
 * @param {string} prefix - API prefix (default: '/api')
 * @returns {string} The full API base URL
 */
export function getApiBaseUrl(prefix = '/api') {
  // Ensure prefix starts with slash
  const normalizedPrefix = prefix.startsWith('/') ? prefix : `/${prefix}`
  
  // Check for configured base URL in environment variables
  const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL
  
  if (configuredBaseUrl && typeof configuredBaseUrl === 'string') {
    const trimmed = trimTrailingSlash(configuredBaseUrl)
    if (isValidUrl(trimmed)) {
      return `${trimmed}${normalizedPrefix}`
    }
    console.warn('Invalid VITE_API_BASE_URL configured:', configuredBaseUrl)
  }
  
  // Browser environment detection
  if (typeof window !== 'undefined') {
    try {
      const { hostname, port, protocol } = window.location
      const isLocalHost = hostname === 'localhost' || hostname === '127.0.0.1'
      
      // For local development, use port 8787 if available
      if (isLocalHost && port && port !== '8787') {
        const localUrl = `${protocol}//127.0.0.1:8787${normalizedPrefix}`
        if (isValidUrl(localUrl)) {
          return localUrl
        }
      }
      
      // Fallback to relative URL for production
      if (isValidUrl(normalizedPrefix)) {
        return normalizedPrefix
      }
    } catch (error) {
      console.error('Error constructing API URL:', error)
    }
  }
  
  // Final fallback
  return normalizedPrefix
}

/**
 * Gets a full API URL for a specific endpoint
 * @param {string} endpoint - API endpoint (e.g., '/dashboard')
 * @returns {string} Full API URL
 */
export function getApiUrl(endpoint = '') {
  const baseUrl = getApiBaseUrl()
  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`
  return `${baseUrl}${normalizedEndpoint}`
}

/**
 * Checks if the API is reachable
 * @returns {Promise<boolean>} Whether API is reachable
 */
export async function checkApiHealth() {
  try {
    const baseUrl = getApiBaseUrl()
    const healthUrl = `${baseUrl}/health`
    
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)
    
    const response = await fetch(healthUrl, {
      method: 'GET',
      signal: controller.signal,
    })
    
    clearTimeout(timeoutId)
    return response.ok
  } catch (error) {
    console.error('API health check failed:', error)
    return false
  }
}

export default { getApiBaseUrl, getApiUrl, checkApiHealth }