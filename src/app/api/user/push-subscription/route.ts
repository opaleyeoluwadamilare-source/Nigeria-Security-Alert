import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

// POST - Save push subscription
export async function POST(request: NextRequest) {
  const supabase = createServerClient()

  try {
    const body = await request.json()
    const { user_id, subscription, phone } = body

    if (!subscription || !subscription.endpoint) {
      return NextResponse.json(
        { error: 'Invalid subscription' },
        { status: 400 }
      )
    }

    // If phone not provided, try to fetch it from user record
    let userPhone = phone
    if (!userPhone && user_id) {
      const { data: user } = await supabase
        .from('users')
        .select('phone')
        .eq('id', user_id)
        .single()
      userPhone = user?.phone
    }

    // Upsert subscription with phone for re-linking support
    const { data, error } = await supabase
      .from('push_subscriptions')
      .upsert(
        {
          user_id,
          phone: userPhone,
          endpoint: subscription.endpoint,
          keys: {
            p256dh: subscription.keys.p256dh,
            auth: subscription.keys.auth,
          },
        },
        { onConflict: 'endpoint' }
      )
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ subscription: data })
  } catch (error) {
    console.error('Error saving subscription:', error)
    return NextResponse.json(
      { error: 'Failed to save subscription' },
      { status: 500 }
    )
  }
}

// DELETE - Remove push subscription
export async function DELETE(request: NextRequest) {
  const supabase = createServerClient()

  try {
    const body = await request.json()
    const { endpoint, user_id } = body

    if (!endpoint && !user_id) {
      return NextResponse.json({ error: 'Missing endpoint or user_id' }, { status: 400 })
    }

    // Delete by endpoint or user_id
    const query = supabase.from('push_subscriptions').delete()

    if (endpoint) {
      query.eq('endpoint', endpoint)
    } else if (user_id) {
      query.eq('user_id', user_id)
    }

    const { error } = await query

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting subscription:', error)
    return NextResponse.json(
      { error: 'Failed to delete subscription' },
      { status: 500 }
    )
  }
}
