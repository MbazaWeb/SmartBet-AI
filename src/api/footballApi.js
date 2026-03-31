import axios from 'axios'
import { getApiBaseUrl } from './apiBaseUrl'

const apiClient = axios.create({
  baseURL: getApiBaseUrl('/api'),
})

function getErrorMessage(error) {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.message || 'Unable to reach the SmartBet AI backend.'
  }

  return 'Unable to reach the SmartBet AI backend.'
}

export async function getDashboardData(options = {}) {
  try {
    const response = await apiClient.get('/dashboard', {
      params: options.fresh
        ? {
            fresh: '1',
            t: Date.now(),
          }
        : undefined,
    })
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

export async function getMatches() {
  const dashboardData = await getDashboardData()
  return dashboardData.matches ?? []
}