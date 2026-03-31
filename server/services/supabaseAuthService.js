import axios from 'axios'

function getSupabaseUrl() {
  return process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || ''
}

function getSupabaseAnonKey() {
  return process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || ''
}

function getAuthClient() {
  const supabaseUrl = getSupabaseUrl()
  const supabaseAnonKey = getSupabaseAnonKey()

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase auth is not configured on the backend.')
  }

  return axios.create({
    baseURL: `${supabaseUrl}/auth/v1`,
    headers: {
      apikey: supabaseAnonKey,
      'Content-Type': 'application/json',
    },
  })
}

function normalizeAuthError(error) {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.msg || error.response?.data?.message || error.message
    const status = error.response?.status || 500

    return {
      status,
      message: message || 'Authentication request failed.',
    }
  }

  return {
    status: 500,
    message: error.message || 'Authentication request failed.',
  }
}

export function isSupabaseAuthConfigured() {
  return Boolean(getSupabaseUrl() && getSupabaseAnonKey())
}

export async function signUpWithEmail({ email, password }) {
  try {
    const client = getAuthClient()
    const response = await client.post('/signup', { email, password })
    const data = response.data ?? {}

    return {
      user: data.user ?? null,
      session: data.session ?? null,
      message: data.session
        ? 'Account created and signed in.'
        : 'Check your email to confirm the account, then sign in.',
    }
  } catch (error) {
    throw normalizeAuthError(error)
  }
}

export async function signInWithEmail({ email, password }) {
  try {
    const client = getAuthClient()
    const response = await client.post('/token?grant_type=password', { email, password })
    const data = response.data ?? {}

    return {
      session: {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
      },
      user: data.user ?? null,
    }
  } catch (error) {
    throw normalizeAuthError(error)
  }
}