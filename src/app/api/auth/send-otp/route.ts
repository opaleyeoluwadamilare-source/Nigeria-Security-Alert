import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  const supabase = createServerClient()

  try {
    const { phone } = await request.json()

    if (!phone || (!phone.startsWith('+234') && !phone.startsWith('234') && !phone.startsWith('0'))) {
      return NextResponse.json(
        { error: 'Valid Nigerian phone number required (+234...)' },
        { status: 400 }
      )
    }

    // Normalize phone number
    const normalizedPhone = normalizePhoneNumber(phone)

    if (!normalizedPhone) {
      return NextResponse.json(
        { error: 'Invalid Nigerian phone number' },
        { status: 400 }
      )
    }

    // In sandbox/dev mode, use a fixed test code for easier testing
    const isDev = process.env.NODE_ENV === 'development' || process.env.AT_USERNAME === 'sandbox'

    // Generate 6-digit OTP (use fixed code in test mode)
    const otp = isDev ? '123456' : Math.floor(100000 + Math.random() * 900000).toString()

    // Store OTP (expires in 10 minutes)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000)

    const { error: dbError } = await supabase.from('otp_codes').insert({
      phone: normalizedPhone,
      code: otp,
      expires_at: expiresAt.toISOString(),
    })

    if (dbError) throw dbError

    // Send via Africa's Talking
    const apiUrl = process.env.AT_USERNAME === 'sandbox'
      ? 'https://api.sandbox.africastalking.com/version1/messaging'
      : 'https://api.africastalking.com/version1/messaging'

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
        'apiKey': process.env.AT_API_KEY!,
      },
      body: new URLSearchParams({
        username: process.env.AT_USERNAME!,
        to: normalizedPhone,
        message: `Your SafetyAlerts code is: ${otp}. Valid for 10 minutes.`,
      }),
    })

    const result = await response.json()
    console.log('SMS API response:', result)

    return NextResponse.json({
      success: true,
      message: 'Verification code sent',
      ...(isDev && { code: otp, testMode: true }), // Include code in dev/sandbox for testing
    })

  } catch (error) {
    console.error('Send OTP error:', error)
    return NextResponse.json(
      { error: 'Failed to send verification code' },
      { status: 500 }
    )
  }
}

// Normalize Nigerian phone numbers to +234 format
function normalizePhoneNumber(phone: string): string | null {
  // Remove all non-digit characters except +
  let cleaned = phone.replace(/[^\d+]/g, '')

  // Handle different formats
  if (cleaned.startsWith('+234')) {
    // Already in international format
  } else if (cleaned.startsWith('234')) {
    cleaned = '+' + cleaned
  } else if (cleaned.startsWith('0')) {
    cleaned = '+234' + cleaned.substring(1)
  } else if (cleaned.length === 10) {
    // Assume it's without leading 0
    cleaned = '+234' + cleaned
  } else {
    return null
  }

  // Validate length (Nigerian numbers are +234 followed by 10 digits)
  if (cleaned.length !== 14) {
    return null
  }

  return cleaned
}
