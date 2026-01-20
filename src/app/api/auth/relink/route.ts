import { NextRequest, NextResponse } from 'next/server'
import {
  attemptRelink,
  checkExistingUser,
  setUserSessionCookie,
} from '@/lib/user-auth'

/**
 * POST /api/auth/relink
 * Attempt to restore session without OTP using push subscription validation
 *
 * If the device has a valid push subscription for this user, we can trust it
 * and restore the session without requiring a new OTP (saves SMS cost)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { phone, push_endpoint } = body

    if (!phone) {
      return NextResponse.json(
        { error: 'Phone number required' },
        { status: 400 }
      )
    }

    // Attempt to re-link using push subscription validation
    const result = await attemptRelink(phone, push_endpoint)

    if (result.success && result.token && result.user) {
      // Create response with session cookie
      const response = NextResponse.json({
        success: true,
        user: {
          id: result.user.id,
          phone: result.user.phone,
          phone_verified: result.user.phone_verified,
          trust_score: result.user.trust_score,
          created_at: result.user.created_at,
          last_active: result.user.last_active,
        },
      })

      // Set session cookie
      await setUserSessionCookie(result.token)

      return response
    }

    // Re-link failed - require OTP
    return NextResponse.json({
      success: false,
      requiresOTP: true,
      message: 'Please verify with OTP',
    })
  } catch (error) {
    console.error('Relink error:', error)
    return NextResponse.json(
      { error: 'Relink failed' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/auth/relink?phone=xxx
 * Check if a phone number has an existing verified account
 * Used to show "Welcome back" UI
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const phone = searchParams.get('phone')

    if (!phone) {
      return NextResponse.json(
        { error: 'Phone number required' },
        { status: 400 }
      )
    }

    const result = await checkExistingUser(phone)

    return NextResponse.json({
      exists: result.exists,
      hasPushSubscription: result.hasPushSubscription,
    })
  } catch (error) {
    console.error('Check existing user error:', error)
    return NextResponse.json(
      { error: 'Check failed' },
      { status: 500 }
    )
  }
}
