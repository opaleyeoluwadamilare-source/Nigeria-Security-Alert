import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'

/**
 * POST /api/user/sms-preferences
 * Enable/disable SMS alerts for users without push support
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { user_id, sms_enabled, critical_only } = body

    if (!user_id) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    const supabase = getSupabase()

    // Update user preferences
    const { error } = await supabase
      .from('users')
      .update({
        sms_alerts_enabled: sms_enabled ?? true,
        sms_critical_only: critical_only ?? true, // Default to critical only for SMS
        updated_at: new Date().toISOString(),
      })
      .eq('id', user_id)

    if (error) {
      console.error('Failed to update SMS preferences:', error)
      return NextResponse.json(
        { error: 'Failed to update preferences' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'SMS preferences updated',
    })
  } catch (error) {
    console.error('SMS preferences error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/user/sms-preferences?user_id=xxx
 * Get current SMS preferences
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get('user_id')

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    const supabase = getSupabase()

    const { data, error } = await supabase
      .from('users')
      .select('sms_alerts_enabled, sms_critical_only, phone')
      .eq('id', userId)
      .single()

    if (error) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      sms_enabled: data.sms_alerts_enabled ?? false,
      critical_only: data.sms_critical_only ?? true,
      phone_registered: !!data.phone,
    })
  } catch (error) {
    console.error('Get SMS preferences error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
