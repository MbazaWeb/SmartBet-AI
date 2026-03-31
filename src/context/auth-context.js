/**
 * Authentication Context
 * Provides authentication state and methods throughout the application
 * 
 * @typedef {Object} AuthContextValue
 * @property {Object|null} user - Current authenticated user
 * @property {Object|null} session - Current session data
 * @property {boolean} loading - Whether auth is initializing
 * @property {boolean} isConfigured - Whether Supabase is configured
 * @property {function(string): void} openAuth - Open auth dialog with specified mode
 * @property {function(): void} closeAuth - Close auth dialog
 * @property {function(): Promise<void>} signOut - Sign out current user
 * @property {function(): Promise<Object|null>} refreshSession - Refresh current session
 * 
 * @type {import('react').Context<AuthContextValue|null>}
 */
import { createContext } from 'react'

const AuthContext = createContext(null)

export default AuthContext