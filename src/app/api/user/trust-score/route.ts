import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { applyScoreAdjustment, getScoreAdjustment } from '@/lib/trust-score'

/**
 * GET /api/user/trust-score?user_id=xxx
 * Get user's trust score breakdown
 */
export async function GET(request: NextRequest) {
  const supabase = createServerClient()
  const searchParams = request.nextUrl.searchParams
  const userId = searchParams.get('user_id')

  if (!userId) {
    return NextResponse.json({ error: 'Missing user_id' }, { status: 400 })
  }

  try {
    // Get user data
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get user's reports stats
    const { data: reports } = await supabase
      .from('reports')
      .select('id, confirmation_count, denial_count, status')
      .eq('user_id', userId)

    const totalReports = reports?.length || 0
    const totalConfirmations = reports?.reduce((sum, r) => sum + (r.confirmation_count || 0), 0) || 0
    const totalDenials = reports?.reduce((sum, r) => sum + (r.denial_count || 0), 0) || 0
    const removedReports = reports?.filter(r => r.status === 'removed').length || 0
    const viralReports = reports?.filter(r => r.confirmation_count >= 20).length || 0

    // Calculate account age
    const createdAt = new Date(user.created_at)
    const now = new Date()
    const ageMonths = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24 * 30))

    return NextResponse.json({
      trustScore: user.trust_score || 0,
      breakdown: {
        phoneVerified: user.phone_verified || false,
        accountAgeMonths: ageMonths,
        totalReports,
        totalConfirmations,
        totalDenials,
        removedReports,
        viralReports,
      },
    })
  } catch (error) {
    console.error('Error fetching trust score:', error)
    return NextResponse.json(
      { error: 'Failed to fetch trust score' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/user/trust-score
 * Update user's trust score
 *
 * Body: { user_id, action, amount? }
 * action: 'report_confirmed' | 'report_denied' | 'admin_warning' | 'report_removed' | 'report_viral' | 'phone_verified' | 'custom'
 */
export async function POST(request: NextRequest) {
  const supabase = createServerClient()

  try {
    const body = await request.json()
    const { user_id, action, amount } = body

    if (!user_id || !action) {
      return NextResponse.json(
        { error: 'Missing user_id or action' },
        { status: 400 }
      )
    }

    // Get current score
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('trust_score')
      .eq('id', user_id)
      .single()

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const currentScore = user.trust_score || 0

    // Calculate adjustment
    let adjustment: number
    if (action === 'custom' && typeof amount === 'number') {
      adjustment = amount
    } else {
      adjustment = getScoreAdjustment(action)
    }

    // Apply adjustment
    const newScore = applyScoreAdjustment(currentScore, adjustment)

    // Update user
    const { error: updateError } = await supabase
      .from('users')
      .update({ trust_score: newScore })
      .eq('id', user_id)

    if (updateError) throw updateError

    return NextResponse.json({
      previousScore: currentScore,
      adjustment,
      newScore,
    })
  } catch (error) {
    console.error('Error updating trust score:', error)
    return NextResponse.json(
      { error: 'Failed to update trust score' },
      { status: 500 }
    )
  }
}
