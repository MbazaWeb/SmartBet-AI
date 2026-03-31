import { isSupabaseConfigured, supabase } from '../lib/supabase'

/**
 * Sanitize and validate email input
 * @param {string} email - Email to validate
 * @returns {boolean} Whether email is valid
 */
function isValidEmail(email) {
  if (typeof email !== 'string') return false
  const emailRegex = /^[^\s@]+@([^\s@]+\.)+[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @returns {Object} Validation result
 */
function validatePassword(password) {
  if (typeof password !== 'string') {
    return { valid: false, message: 'Password must be a string' }
  }
  
  if (password.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters long' }
  }
  
  // Check for at least one number
  if (!/\d/.test(password)) {
    return { valid: false, message: 'Password must contain at least one number' }
  }
  
  // Check for at least one letter
  if (!/[a-zA-Z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one letter' }
  }
  
  return { valid: true, message: '' }
}

/**
 * Get user-friendly error message from Supabase error
 * @param {Error} error - Supabase error object
 * @returns {string} User-friendly error message
 */
function getErrorMessage(error) {
  if (!error) {
    return 'Authentication failed. Please try again.'
  }
  
  // Handle specific error codes
  if (error.code) {
    switch (error.code) {
      case 'invalid_credentials':
        return 'Invalid email or password. Please check your credentials.'
      case 'email_not_confirmed':
        return 'Please confirm your email address before signing in. Check your inbox.'
      case 'user_not_found':
        return 'No account found with this email address.'
      case 'weak_password':
        return 'Password is too weak. Please use at least 8 characters with letters and numbers.'
      case 'email_exists':
        return 'An account with this email already exists.'
      case 'rate_limit_exceeded':
        return 'Too many attempts. Please wait a few minutes before trying again.'
      default:
        if (error.message) return error.message
    }
  }
  
  // Handle error message strings
  if (typeof error.message === 'string' && error.message.trim()) {
    // Clean up common error messages
    if (error.message.includes('Invalid login credentials')) {
      return 'Invalid email or password.'
    }
    if (error.message.includes('Email not confirmed')) {
      return 'Please verify your email address before signing in.'
    }
    return error.message
  }
  
  // Handle HTTP status codes
  if (typeof error.status === 'number') {
    if (error.status === 400 || error.status === 401) {
      return 'Invalid email or password.'
    }
    if (error.status === 429) {
      return 'Too many attempts. Please try again later.'
    }
    if (error.status >= 500) {
      return 'Authentication service is temporarily unavailable. Please try again later.'
    }
  }
  
  return 'Authentication failed. Please check your connection and try again.'
}

/**
 * Sign up a new user
 * @param {Object} params - Sign up parameters
 * @param {string} params.email - User's email
 * @param {string} params.password - User's password
 * @returns {Promise<Object>} Sign up result
 */
export async function signUp({ email, password }) {
  // Input validation
  if (!email || !password) {
    throw new Error('Email and password are required')
  }
  
  if (!isValidEmail(email)) {
    throw new Error('Please enter a valid email address')
  }
  
  const passwordValidation = validatePassword(password)
  if (!passwordValidation.valid) {
    throw new Error(passwordValidation.message)
  }
  
  try {
    // Check if Supabase is configured
    if (!isSupabaseConfigured || !supabase) {
      throw new Error('Authentication service is not configured. Please contact support.')
    }
    
    // Attempt sign up
    const { data, error } = await supabase.auth.signUp({ 
      email: email.trim().toLowerCase(), 
      password 
    })
    
    if (error) {
      throw error
    }
    
    // Check if sign up was successful
    if (!data.user) {
      throw new Error('Unable to create account. Please try again.')
    }
    
    // Prepare success response
    const response = {
      user: {
        id: data.user.id,
        email: data.user.email,
        created_at: data.user.created_at,
      },
      session: data.session ? {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at,
      } : null,
    }
    
    // Add appropriate message based on whether email confirmation is required
    if (data.session) {
      response.message = 'Account created successfully! You are now signed in.'
    } else {
      response.message = 'Account created! Please check your email to confirm your account, then sign in.'
    }
    
    return response
  } catch (error) {
    console.error('Sign up error:', error)
    throw new Error(getErrorMessage(error))
  }
}

/**
 * Sign in an existing user
 * @param {Object} params - Sign in parameters
 * @param {string} params.email - User's email
 * @param {string} params.password - User's password
 * @returns {Promise<Object>} Sign in result
 */
export async function signIn({ email, password }) {
  // Input validation
  if (!email || !password) {
    throw new Error('Email and password are required')
  }
  
  if (!isValidEmail(email)) {
    throw new Error('Please enter a valid email address')
  }
  
  try {
    // Check if Supabase is configured
    if (!isSupabaseConfigured || !supabase) {
      throw new Error('Authentication service is not configured. Please contact support.')
    }
    
    // Attempt sign in
    const { data, error } = await supabase.auth.signInWithPassword({ 
      email: email.trim().toLowerCase(), 
      password 
    })
    
    if (error) {
      throw error
    }
    
    // Verify session data
    if (!data.session?.access_token || !data.session?.refresh_token) {
      throw new Error('Authentication succeeded but no session was returned.')
    }
    
    // Return successful response
    return {
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at,
        expires_in: data.session.expires_in,
      },
      user: {
        id: data.user.id,
        email: data.user.email,
        created_at: data.user.created_at,
        last_sign_in_at: data.user.last_sign_in_at,
      },
    }
  } catch (error) {
    console.error('Sign in error:', error)
    throw new Error(getErrorMessage(error))
  }
}

/**
 * Sign out the current user
 * @returns {Promise<void>}
 */
export async function signOut() {
  try {
    if (!supabase) {
      throw new Error('Authentication service is not available')
    }
    
    const { error } = await supabase.auth.signOut()
    
    if (error) {
      throw error
    }
    
    return { success: true, message: 'Signed out successfully' }
  } catch (error) {
    console.error('Sign out error:', error)
    throw new Error(getErrorMessage(error))
  }
}

/**
 * Get the current session
 * @returns {Promise<Object|null>} Current session or null
 */
export async function getCurrentSession() {
  try {
    if (!supabase) {
      return null
    }
    
    const { data: { session }, error } = await supabase.auth.getSession()
    
    if (error) {
      console.error('Error getting session:', error)
      return null
    }
    
    return session
  } catch (error) {
    console.error('Get session error:', error)
    return null
  }
}

/**
 * Get the current user
 * @returns {Promise<Object|null>} Current user or null
 */
export async function getCurrentUser() {
  try {
    const session = await getCurrentSession()
    return session?.user || null
  } catch (error) {
    console.error('Get user error:', error)
    return null
  }
}

/**
 * Reset password
 * @param {string} email - User's email
 * @returns {Promise<Object>} Reset result
 */
export async function resetPassword(email) {
  if (!email || !isValidEmail(email)) {
    throw new Error('Please enter a valid email address')
  }
  
  try {
    if (!supabase) {
      throw new Error('Authentication service is not available')
    }
    
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    
    if (error) {
      throw error
    }
    
    return {
      success: true,
      message: 'Password reset email sent. Check your inbox for instructions.',
    }
  } catch (error) {
    console.error('Reset password error:', error)
    throw new Error(getErrorMessage(error))
  }
}

export default { signUp, signIn, signOut, getCurrentSession, getCurrentUser, resetPassword }