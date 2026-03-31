import { isSupabaseConfigured, supabase } from '../lib/supabase'

function getErrorMessage(error) {
  return error?.message || 'Unable to reach the authentication service.'
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