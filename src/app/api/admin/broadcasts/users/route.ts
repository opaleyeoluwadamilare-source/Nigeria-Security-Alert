import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { requireAdmin } from '@/lib/admin-auth'

/**
 * GET /api/admin/broadcasts/users
 * Search users for broadcast targeting
 * Supports searching by phone number and filtering by area
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin('send_broadcasts')
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const supabase = createServerClient()
  const searchParams = request.nextUrl.searchParams
  const phone = searchParams.get('phone')
  const area = searchParams.get('area')
  const limit = parseInt(searchParams.get('limit') || '50')

  try {
    if (phone) {
      // Search by phone number
      const { data: users, error } = await supabase
        .from('users')
        .select(`
          id,
          phone,
          status,
          created_at,
          last_active,
          user_locations (
            area_name,
            area_slug,
            state,
            is_primary
          )
        `)
        .ilike('phone', `%${phone}%`)
        .eq('status', 'active')
        .limit(limit)

      if (error) throw error

      return NextResponse.json({ users })
    }

    if (area) {
      // Get users in a specific area
      const { data: userLocations, error: locError } = await supabase
        .from('user_locations')
        .select('user_id')
        .eq('area_slug', area)

      if (locError) throw locError

      if (!userLocations || userLocations.length === 0) {
        return NextResponse.json({ users: [] })
      }

      const userIds = Array.from(new Set(userLocations.map((ul: any) => ul.user_id)))

      const { data: users, error } = await supabase
        .from('users')
        .select(`
          id,
          phone,
          status,
          created_at,
          last_active,
          user_locations (
            area_name,
            area_slug,
            state,
            is_primary
          )
        `)
        .in('id', userIds)
        .eq('status', 'active')
        .limit(limit)

      if (error) throw error

      return NextResponse.json({ users })
    }

    // Return recent active users if no search params
    const { data: users, error } = await supabase
      .from('users')
      .select(`
        id,
        phone,
        status,
        created_at,
        last_active,
        user_locations (
          area_name,
          area_slug,
          state,
          is_primary
        )
      `)
      .eq('status', 'active')
      .order('last_active', { ascending: false })
      .limit(limit)

    if (error) throw error

    return NextResponse.json({ users })
  } catch (error) {
    console.error('Error searching users:', error)
    return NextResponse.json(
      { error: 'Failed to search users' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/broadcasts/users
 * Get user count for targeting preview
 */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin('send_broadcasts')
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const supabase = createServerClient()

  try {
    const body = await request.json()
    const { target_type, target_areas, target_user_ids } = body

    let count = 0
    let hasSubscriptions = 0

    if (target_type === 'all') {
      // Count all active users with push subscriptions
      const { count: subCount } = await supabase
        .from('push_subscriptions')
        .select('user_id', { count: 'exact', head: true })

      const { count: userCount } = await supabase
        .from('users')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'active')

      count = userCount || 0
      hasSubscriptions = subCount || 0
    } else if (target_type === 'area' && target_areas?.length > 0) {
      // Count users in selected areas
      const { data: userLocations } = await supabase
        .from('user_locations')
        .select('user_id')
        .in('area_slug', target_areas)

      if (userLocations) {
        const userIds = Array.from(new Set(userLocations.map((ul: any) => ul.user_id)))
        count = userIds.length

        // Count those with subscriptions
        const { count: subCount } = await supabase
          .from('push_subscriptions')
          .select('user_id', { count: 'exact', head: true })
          .in('user_id', userIds)

        hasSubscriptions = subCount || 0
      }
    } else if (target_type === 'users' && target_user_ids?.length > 0) {
      count = target_user_ids.length

      // Count those with subscriptions
      const { count: subCount } = await supabase
        .from('push_subscriptions')
        .select('user_id', { count: 'exact', head: true })
        .in('user_id', target_user_ids)

      hasSubscriptions = subCount || 0
    }

    return NextResponse.json({
      total_users: count,
      with_push_subscriptions: hasSubscriptions,
      without_subscriptions: count - hasSubscriptions,
    })
  } catch (error) {
    console.error('Error getting user count:', error)
    return NextResponse.json(
      { error: 'Failed to get user count' },
      { status: 500 }
    )
  }
}
