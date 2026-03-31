import { useContext, useDebugValue } from 'react'
import AuthContext from './auth-context'

/**
 * Custom hook to access authentication context
 * Must be used within an AuthProvider component
 * 
 * @returns {Object} Auth context value containing:
 * @returns {Object|null} user - Current authenticated user
 * @returns {Object|null} session - Current session data
 * @returns {boolean} loading - Whether auth is initializing
 * @returns {boolean} isConfigured - Whether Supabase is configured
 * @returns {function(string): void} openAuth - Open auth dialog with specified mode
 * @returns {function(): void} closeAuth - Close auth dialog
 * @returns {function(): Promise<void>} signOut - Sign out current user
 * @returns {function(): Promise<Object|null>} refreshSession - Refresh current session
 * 
 * @throws {Error} If used outside of AuthProvider
 * 
 * @example
 * const { user, openAuth, signOut } = useAuth()
 * 
 * if (!user) {
 *   return <button onClick={() => openAuth('signin')}>Sign in</button>
 * }
 * 
 * return <button onClick={signOut}>Sign out</button>
 */
export default function useAuth() {
  const context = useContext(AuthContext)

  // Enable React DevTools debugging
  useDebugValue(context?.user?.email ?? 'Not authenticated', (email) => 
    email ? `User: ${email}` : 'Not authenticated'
  )

  if (!context) {
    throw new Error(
      'useAuth must be used within an AuthProvider. ' +
      'Make sure your component is wrapped in <AuthProvider>'
    )
  }

  // Add a helper method to check if user is authenticated
  const isAuthenticated = Boolean(context.user)

  // Add a helper method to get user's display name
  const getDisplayName = () => {
    if (!context.user) return null
    return context.user.email?.split('@')[0] || 'User'
  }

  // Add a helper method to get user's initials
  const getUserInitials = () => {
    const displayName = getDisplayName()
    if (!displayName) return '??'
    return displayName.slice(0, 2).toUpperCase()
  }

  // Return enhanced context with helper methods
  return {
    ...context,
    isAuthenticated,
    getDisplayName,
    getUserInitials,
  }
}