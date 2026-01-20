import { NextRequest, NextResponse } from 'next/server'
import {
  getUserSessionFromCookie,
  clearUserSessionCookie,
  getSessionToken,
  invalidateSession,
} from '@/lib/user-auth'

/**
 * GET /api/auth/session
 * Validate current session and return user data
 */
export async function GET() {
  try {
    const result = await getUserSessionFromCookie()

    if (!result.valid || !result.user) {
      return NextResponse.json(
        { error: result.error || 'Invalid session' },
        { status: 401 }
      )
    }

    return NextResponse.json({
      user: {
        id: result.user.id,
        phone: result.user.phone,
        phone_verified: result.user.phone_verified,
        trust_score: result.user.trust_score,
        created_at: result.user.created_at,
        last_active: result.user.last_active,
      },
    })
  } catch (error) {
    console.error('Session validation error:', error)
    return NextResponse.json(
      { error: 'Session validation failed' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/auth/session
 * Logout - invalidate current session
 */
export async function DELETE() {
  try {
    const token = await getSessionToken()

    if (token) {
      await invalidateSession(token)
    }

    await clearUserSessionCookie()

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Logout error:', error)
    // Clear cookie anyway
    await clearUserSessionCookie()
    return NextResponse.json({ success: true })
  }
}
