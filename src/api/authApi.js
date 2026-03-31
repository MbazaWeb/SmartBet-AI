import { isSupabaseConfigured, supabase } from '../lib/supabase'

function getErrorMessage(error) {
  if (!error) {
    return 'Authentication failed.'
  }

  if (typeof error.message === 'string' && error.message.trim()) {
    return error.message
  }

  if (typeof error.code === 'string' && error.code === 'invalid_credentials') {
    return 'Invalid login credentials.'
  }

  if (typeof error.status === 'number') {
    if (error.status === 400 || error.status === 401) {
      return 'Invalid login credentials.'
    }

    if (error.status >= 500) {
      return 'Authentication service is temporarily unavailable.'
    }
  }

  return 'Authentication failed.'
}

export async function signUp({ email, password }) {
  try {
    if (!isSupabaseConfigured || !supabase) {
      throw new Error('Supabase auth is not configured.')
    }

    const { data, error } = await supabase.auth.signUp({ email, password })

    if (error) {
      throw error
    }

    return {
      user: data.user ?? null,
      session: data.session
        ? {
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
          }
        : null,
      message: data.session
        ? 'Account created and signed in.'
        : 'Check your email to confirm the account, then sign in.',
    }
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

export async function signIn({ email, password }) {
  try {
    if (!isSupabaseConfigured || !supabase) {
      throw new Error('Supabase auth is not configured.')
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      throw error
    }

    if (!data.session?.access_token || !data.session?.refresh_token) {
      throw new Error('Authentication succeeded but no session was returned.')
    }

    return {
      session: data.session
        ? {
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
          }
        : null,
      user: data.user ?? null,
    }
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}