import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

// GET - Check if user has a push subscription
export async function GET(request: NextRequest) {
  const supabase = createServerClient()
  const searchParams = request.nextUrl.searchParams
  const userId = searchParams.get('user_id')

  if (!userId) {
    return NextResponse.json({ hasSubscription: false })
  }

  try {
    const { data, error } = await supabase
      .from('push_subscriptions')
      .select('id')
      .eq('user_id', userId)
      .limit(1)

    if (error) throw error

    return NextResponse.json({
      hasSubscription: data && data.length > 0,
    })
  } catch (error) {
    console.error('Error checking push subscription:', error)
    return NextResponse.json({ hasSubscription: false })
  }
}
