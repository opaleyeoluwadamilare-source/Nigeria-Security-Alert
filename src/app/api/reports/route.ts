import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import webpush from 'web-push'
import type { Report, IncidentType } from '@/types'

// Configure web-push if VAPID keys are available
if (process.env.VAPID_PRIVATE_KEY && process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) {
  webpush.setVapidDetails(
    'mailto:hello@safetyalertsng.com',
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  )
}

// GET - Fetch reports for areas
export async function GET(request: NextRequest) {
  const supabase = createServerClient()

  const searchParams = request.nextUrl.searchParams
  const areas = searchParams.get('areas')?.split(',') || []
  const status = searchParams.get('status') || 'active'
  const limit = parseInt(searchParams.get('limit') || '50')

  try {
    let query = supabase
      .from('reports')
      .select('*')
      .in('status', status === 'all' ? ['active', 'ended'] : [status])
      .gte(
        'created_at',
        new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      )
      .order('created_at', { ascending: false })
      .limit(limit)

    // Filter by areas if provided
    if (areas.length > 0) {
      query = query.in('area_slug', areas)
    }

    const { data, error } = await query

    if (error) throw error

    return NextResponse.json({ reports: data })
  } catch (error) {
    console.error('Error fetching reports:', error)
    return NextResponse.json(
      { error: 'Failed to fetch reports' },
      { status: 500 }
    )
  }
}

// POST - Create new report
export async function POST(request: NextRequest) {
  const supabase = createServerClient()

  try {
    const body = await request.json()

    const {
      user_id,
      incident_type,
      landmark,
      description,
      photo_url,
      latitude,
      longitude,
      area_name,
      area_slug,
      state,
    } = body

    // Validate required fields
    if (!incident_type || !latitude || !longitude || !area_name || !area_slug) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Insert report
    const { data: report, error: insertError } = await supabase
      .from('reports')
      .insert({
        user_id,
        incident_type,
        landmark,
        description,
        photo_url,
        latitude,
        longitude,
        area_name,
        area_slug,
        state,
        status: 'active',
        confirmation_count: 1, // Reporter counts as first confirmation
        denial_count: 0,
      })
      .select()
      .single()

    if (insertError) throw insertError

    // Send push notifications to users in this area (non-blocking)
    sendAlertNotifications(supabase, report).catch(console.error)

    return NextResponse.json({ report }, { status: 201 })
  } catch (error) {
    console.error('Error creating report:', error)
    return NextResponse.json(
      { error: 'Failed to create report' },
      { status: 500 }
    )
  }
}

// Send push notifications to users in affected area
async function sendAlertNotifications(supabase: any, report: Report) {
  try {
    // Get users who have this area saved
    const { data: userLocations } = await supabase
      .from('user_locations')
      .select('user_id')
      .eq('area_slug', report.area_slug)

    if (!userLocations || userLocations.length === 0) return

    const userIds = Array.from(new Set(userLocations.map((ul: any) => ul.user_id)))

    // Exclude the reporter
    const filteredUserIds = userIds.filter((id) => id !== report.user_id)

    if (filteredUserIds.length === 0) return

    // Get push subscriptions
    const { data: subscriptions } = await supabase
      .from('push_subscriptions')
      .select('*')
      .in('user_id', filteredUserIds)

    if (!subscriptions || subscriptions.length === 0) return

    // Prepare notification payload
    const incidentLabels: Record<IncidentType, string> = {
      robbery: '🔴 ROBBERY',
      attack: '🔴 ATTACK',
      gunshots: '🔴 GUNSHOTS',
      kidnapping: '🔴 KIDNAPPING',
      checkpoint: '🟡 CHECKPOINT',
      fire: '🟠 FIRE',
      accident: '🟠 ACCIDENT',
      traffic: '🟡 TRAFFIC',
      suspicious: '🟠 SUSPICIOUS',
      other: '⚠️ ALERT',
      official: '📢 OFFICIAL ALERT',
    }

    const title = `${incidentLabels[report.incident_type] || '⚠️ ALERT'} near ${report.area_name}`
    const body = report.landmark
      ? `${report.landmark}: ${report.description || 'Tap for details'}`
      : report.description || 'Tap for details'

    const payload = JSON.stringify({
      title,
      body: body.slice(0, 100),
      tag: `report-${report.id}`,
      url: `/app/alert/${report.id}`,
    })

    // Send to all subscriptions
    const sendPromises = subscriptions.map(async (sub: any) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: sub.keys,
          },
          payload
        )
      } catch (err: any) {
        // Remove invalid subscriptions
        if (err.statusCode === 404 || err.statusCode === 410) {
          await supabase.from('push_subscriptions').delete().eq('id', sub.id)
        }
      }
    })

    await Promise.allSettled(sendPromises)
  } catch (error) {
    console.error('Error sending notifications:', error)
  }
}
