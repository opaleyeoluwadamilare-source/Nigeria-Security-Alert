import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  const supabase = createServerClient()

  try {
    const body = await request.json()
    const { phone, code } = body

    if (!phone || !code) {
      return NextResponse.json(
        { error: 'Phone and code required' },
        { status: 400 }
      )
    }

    // Normalize phone number
    const normalizedPhone = normalizePhoneNumber(phone)

    if (!normalizedPhone) {
      return NextResponse.json(
        { error: 'Invalid phone number' },
        { status: 400 }
      )
    }

    // Check if in test/sandbox mode
    const isTestCode = code === '000000' || code === '123456'
    const isTestMode = process.env.AT_USERNAME === 'sandbox' || process.env.NODE_ENV === 'development'

    // In test mode with test code, still create/find real user in DB for push notifications to work
    if (isTestMode && isTestCode) {
      console.log('Test mode: Creating/finding real user for', normalizedPhone)

      // Try to find existing user
      let { data: user, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('phone', normalizedPhone)
        .single()

      if (userError || !user) {
        // Create new user in database
        const { data: newUser, error: createError } = await supabase
          .from('users')
          .insert({
            phone: normalizedPhone,
            phone_verified: true,
            trust_score: 0,
          })
          .select()
          .single()

        if (createError) {
          console.error('Failed to create test user:', createError)
          // Fallback to mock user if DB fails
          const mockUser = {
            id: `test-${Date.now()}`,
            phone: normalizedPhone,
            phone_verified: true,
            trust_score: 0,
            created_at: new Date().toISOString(),
            last_active: new Date().toISOString(),
          }
          return NextResponse.json({
            success: true,
            userId: mockUser.id,
            user: mockUser,
            testMode: true,
          })
        }
        user = newUser
      } else {
        // Update existing user
        await supabase
          .from('users')
          .update({
            phone_verified: true,
            last_active: new Date().toISOString(),
          })
          .eq('id', user.id)
      }

      return NextResponse.json({
        success: true,
        userId: user.id,
        user,
        testMode: true,
      })
    }

    // Production mode: verify against DB
    // Find valid OTP in database
    const { data: otpRecord, error: findError } = await supabase
      .from('otp_codes')
      .select('*')
      .eq('phone', normalizedPhone)
      .eq('code', code)
      .eq('used', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (findError || !otpRecord) {
      return NextResponse.json(
        { error: 'Invalid or expired code' },
        { status: 400 }
      )
    }

    // Mark OTP as used
    await supabase
      .from('otp_codes')
      .update({ used: true })
      .eq('id', otpRecord.id)

    // Find or create user
    let { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('phone', normalizedPhone)
      .single()

    if (userError || !user) {
      // Create new user
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert({
          phone: normalizedPhone,
          phone_verified: true,
          trust_score: 0,
        })
        .select()
        .single()

      if (createError) throw createError
      user = newUser
    } else {
      // Update existing user
      await supabase
        .from('users')
        .update({
          phone_verified: true,
          last_active: new Date().toISOString(),
        })
        .eq('id', user.id)
    }

    return NextResponse.json({
      success: true,
      userId: user.id,
      user,
    })
  } catch (error) {
    console.error('Error verifying OTP:', error)
    return NextResponse.json(
      { error: 'Verification failed' },
      { status: 500 }
    )
  }
}

// Normalize Nigerian phone numbers to +234 format
function normalizePhoneNumber(phone: string): string | null {
  let cleaned = phone.replace(/[^\d+]/g, '')

  if (cleaned.startsWith('+234')) {
    cleaned = cleaned
  } else if (cleaned.startsWith('234')) {
    cleaned = '+' + cleaned
  } else if (cleaned.startsWith('0')) {
    cleaned = '+234' + cleaned.substring(1)
  } else if (cleaned.length === 10) {
    cleaned = '+234' + cleaned
  } else {
    return null
  }

  if (cleaned.length !== 14) {
    return null
  }

  return cleaned
}
