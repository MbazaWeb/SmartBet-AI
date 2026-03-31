import axios from 'axios'

const apiClient = axios.create({
  baseURL: '/api/auth',
})

function getErrorMessage(error) {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.message || 'Unable to reach the authentication service.'
  }

  return 'Unable to reach the authentication service.'
}

export async function signUp({ email, password }) {
  try {
    const response = await apiClient.post('/signup', { email, password })
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

export async function signIn({ email, password }) {
  try {
    const response = await apiClient.post('/signin', { email, password })
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}