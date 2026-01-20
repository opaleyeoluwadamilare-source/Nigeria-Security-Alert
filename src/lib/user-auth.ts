/**
 * User Auth - Server-side session management
 * HTTP-only cookies that survive iOS PWA installs
 */
import { cookies } from 'next/headers'
import { createServerClient } from './supabase'
import jwt from 'jsonwebtoken'
import { createHash, randomBytes } from 'crypto'
import type { User } from '@/types'

// =============================================
// TYPES
// =============================================

export interface UserSession {
  userId: string
  phone: string
  createdAt: number
}

export interface SessionValidationResult {
  valid: boolean
  user?: User
  session?: UserSession
  error?: string
}

// =============================================
// CONFIGURATION
// =============================================

const JWT_SECRET = process.env.USER_JWT_SECRET || process.env.ADMIN_JWT_SECRET || 'user-session-secret-change-in-production'
const COOKIE_NAME = 'user_session'
const SESSION_DURATION_DAYS = 30
const COOKIE_MAX_AGE = SESSION_DURATION_DAYS * 24 * 60 * 60 // 30 days in seconds

// =============================================
// TOKEN HELPERS
// =============================================

export function generateSessionToken(payload: UserSession): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: `${SESSION_DURATION_DAYS}d` })
}

export function verifySessionToken(token: string): UserSession | null {
  try {
    return jwt.verify(token, JWT_SECRET) as UserSession
  } catch {
    return null
  }
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

// =============================================
// SESSION MANAGEMENT
// =============================================

/**
 * Create a new session for a user
 */
export async function createUserSession(
  user: { id: string; phone: string },
  options?: {
    ipAddress?: string
    userAgent?: string
    deviceInfo?: Record<string, unknown>
  }
): Promise<string> {
  const supabase = createServerClient()

  const session: UserSession = {
    userId: user.id,
    phone: user.phone,
    createdAt: Date.now(),
  }

  const token = generateSessionToken(session)
  const tokenHash = hashToken(token)
  const expiresAt = new Date(Date.now() + COOKIE_MAX_AGE * 1000)

  // Store session in database
  await supabase.from('user_sessions').insert({
    user_id: user.id,
    token_hash: tokenHash,
    ip_address: options?.ipAddress,
    user_agent: options?.userAgent,
    device_info: options?.deviceInfo || {},
    expires_at: expiresAt.toISOString(),
  })

  // Update user's last_active
  await supabase
    .from('users')
    .update({ last_active: new Date().toISOString() })
    .eq('id', user.id)

  return token
}

/**
 * Set the session cookie in the response
 */
export async function setUserSessionCookie(token: string) {
  const cookieStore = await cookies()
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  })
}

/**
 * Clear the session cookie
 */
export async function clearUserSessionCookie() {
  const cookieStore = await cookies()
  cookieStore.delete(COOKIE_NAME)
}

/**
 * Get and validate session from cookie
 */
export async function getUserSessionFromCookie(): Promise<SessionValidationResult> {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value

  if (!token) {
    return { valid: false, error: 'No session cookie' }
  }

  // Verify JWT
  const session = verifySessionToken(token)
  if (!session) {
    return { valid: false, error: 'Invalid session token' }
  }

  // Verify session exists in database and is not expired
  const supabase = createServerClient()
  const tokenHash = hashToken(token)

  const { data: dbSession, error: sessionError } = await supabase
    .from('user_sessions')
    .select('*')
    .eq('token_hash', tokenHash)
    .gt('expires_at', new Date().toISOString())
    .single()

  if (sessionError || !dbSession) {
    return { valid: false, error: 'Session expired or not found' }
  }

  // Get user data
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('id', session.userId)
    .single()

  if (userError || !user) {
    return { valid: false, error: 'User not found' }
  }

  // Refresh session activity
  await supabase
    .from('user_sessions')
    .update({ last_active: new Date().toISOString() })
    .eq('token_hash', tokenHash)

  return {
    valid: true,
    user,
    session,
  }
}

/**
 * Get session token from cookie (without validation)
 */
export async function getSessionToken(): Promise<string | null> {
  const cookieStore = await cookies()
  return cookieStore.get(COOKIE_NAME)?.value || null
}

/**
 * Invalidate a specific session
 */
export async function invalidateSession(token: string) {
  const supabase = createServerClient()
  const tokenHash = hashToken(token)

  await supabase
    .from('user_sessions')
    .delete()
    .eq('token_hash', tokenHash)
}

/**
 * Invalidate all sessions for a user
 */
export async function invalidateAllUserSessions(userId: string) {
  const supabase = createServerClient()

  await supabase
    .from('user_sessions')
    .delete()
    .eq('user_id', userId)
}

/**
 * Get all active sessions for a user
 */
export async function getUserSessions(userId: string) {
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('user_sessions')
    .select('id, device_info, created_at, last_active, expires_at')
    .eq('user_id', userId)
    .gt('expires_at', new Date().toISOString())
    .order('last_active', { ascending: false })

  if (error) return []
  return data
}

// =============================================
// RELINK (Zero-OTP Re-authentication)
// =============================================

/**
 * Attempt to re-link a user session using push subscription validation
 * If the device has a valid push subscription for this user, we can trust it
 */
export async function attemptRelink(
  phone: string,
  pushEndpoint?: string
): Promise<{
  success: boolean
  requiresOTP: boolean
  user?: User
  token?: string
}> {
  const supabase = createServerClient()

  // Find user by phone
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('phone', phone)
    .eq('phone_verified', true)
    .single()

  if (userError || !user) {
    return { success: false, requiresOTP: true }
  }

  // If we have a push endpoint, validate it
  if (pushEndpoint) {
    const { data: subscription } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .eq('endpoint', pushEndpoint)
      .single()

    if (subscription) {
      // Valid push subscription = device is authenticated
      // Create new session without requiring OTP
      const token = await createUserSession(user)
      return {
        success: true,
        requiresOTP: false,
        user,
        token,
      }
    }
  }

  // No valid push subscription - require OTP
  return {
    success: false,
    requiresOTP: true,
  }
}

/**
 * Check if a phone number has an existing verified account
 */
export async function checkExistingUser(phone: string): Promise<{
  exists: boolean
  userId?: string
  hasPushSubscription?: boolean
}> {
  const supabase = createServerClient()

  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('phone', phone)
    .eq('phone_verified', true)
    .single()

  if (!user) {
    return { exists: false }
  }

  // Check if user has any push subscriptions
  const { data: subscriptions } = await supabase
    .from('push_subscriptions')
    .select('id')
    .eq('user_id', user.id)
    .limit(1)

  return {
    exists: true,
    userId: user.id,
    hasPushSubscription: !!(subscriptions && subscriptions.length > 0),
  }
}

// =============================================
// CLEANUP
// =============================================

/**
 * Remove expired sessions (call from cron job)
 */
export async function cleanupExpiredSessions(): Promise<number> {
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('user_sessions')
    .delete()
    .lt('expires_at', new Date().toISOString())
    .select('id')

  if (error) return 0
  return data?.length || 0
}
