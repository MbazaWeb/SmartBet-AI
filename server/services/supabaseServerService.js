import { createClient } from '@supabase/supabase-js'

function getSupabaseUrl() {
  return process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || ''
}

function getSupabaseServerKey() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || ''
}

export function isSupabaseServerConfigured() {
  return Boolean(getSupabaseUrl() && getSupabaseServerKey())
}

export function getSupabaseServerClient() {
  const supabaseUrl = getSupabaseUrl()
  const supabaseKey = getSupabaseServerKey()

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase server client is not configured.')
  }

  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}