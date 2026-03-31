function trimTrailingSlash(value) {
  return value.replace(/\/+$/, '')
}

export function getApiBaseUrl(prefix = '/api') {
  const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL

  if (configuredBaseUrl) {
    return `${trimTrailingSlash(configuredBaseUrl)}${prefix}`
  }

  if (typeof window !== 'undefined') {
    const { hostname, port, protocol } = window.location
    const isLocalHost = hostname === 'localhost' || hostname === '127.0.0.1'

    if (isLocalHost && port && port !== '8787') {
      return `${protocol}//127.0.0.1:8787${prefix}`
    }
  }

  return prefix
}