import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { requireAdmin } from '@/lib/admin-auth'

/**
 * GET /api/admin/broadcasts/areas
 * Get list of areas with user counts for targeting
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin('send_broadcasts')
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const supabase = createServerClient()
  const searchParams = request.nextUrl.searchParams
  const search = searchParams.get('search')

  try {
    // Get all unique areas from user_locations with user counts
    let query = supabase
      .from('user_locations')
      .select('area_name, area_slug, state')

    if (search) {
      query = query.or(`area_name.ilike.%${search}%,state.ilike.%${search}%`)
    }

    const { data: locations, error } = await query

    if (error) throw error

    // Aggregate by area_slug
    const areaMap = new Map<string, {
      area_name: string
      area_slug: string
      state: string
      user_count: number
    }>()

    locations?.forEach((loc: any) => {
      if (areaMap.has(loc.area_slug)) {
        const existing = areaMap.get(loc.area_slug)!
        existing.user_count++
      } else {
        areaMap.set(loc.area_slug, {
          area_name: loc.area_name,
          area_slug: loc.area_slug,
          state: loc.state,
          user_count: 1,
        })
      }
    })

    // Convert to array and sort by user count
    const areas = Array.from(areaMap.values())
      .sort((a, b) => b.user_count - a.user_count)

    // Get push subscription counts per area
    for (const area of areas) {
      const { data: userLocations } = await supabase
        .from('user_locations')
        .select('user_id')
        .eq('area_slug', area.area_slug)

      if (userLocations && userLocations.length > 0) {
        const userIds = Array.from(new Set(userLocations.map((ul: any) => ul.user_id)))

        const { count } = await supabase
          .from('push_subscriptions')
          .select('user_id', { count: 'exact', head: true })
          .in('user_id', userIds)

        ;(area as any).push_subscriptions = count || 0
      } else {
        ;(area as any).push_subscriptions = 0
      }
    }

    return NextResponse.json({ areas })
  } catch (error) {
    console.error('Error fetching areas:', error)
    return NextResponse.json(
      { error: 'Failed to fetch areas' },
      { status: 500 }
    )
  }
}
