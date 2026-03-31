// src/lib/supabase/client.ts (updated)
import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

export const supabase = isSupabaseConfigured
  ? createClient<Database>(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
      },
      global: {
        fetch: (url, options) => {
          // Add timeout for network requests
          return fetch(url, { ...options, signal: AbortSignal.timeout(10000) })
        },
      },
    })
  : null

// Error handling helper
export class SupabaseError extends Error {
  constructor(
    message: string,
    public code?: string,
    public details?: unknown
  ) {
    super(message)
    this.name = 'SupabaseError'
  }
}

export function handleSupabaseError(error: unknown): never {
  if (error && typeof error === 'object' && 'code' in error) {
    const err = error as { code: string; message?: string }
    if (err.code === 'PGRST205') {
      throw new SupabaseError(
        'Supabase cannot see the social tables yet. Run supabase/social-schema.sql in the SQL editor, then refresh the schema cache.',
        err.code
      )
    }
    throw new SupabaseError(err.message || 'Database error occurred', err.code, error)
  }
  throw new SupabaseError('An unexpected error occurred', undefined, error)
}