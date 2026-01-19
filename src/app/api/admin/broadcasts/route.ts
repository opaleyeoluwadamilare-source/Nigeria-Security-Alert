import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { requireAdmin, logAdminAction } from '@/lib/admin-auth'
import webpush from 'web-push'

// Configure web-push
if (process.env.VAPID_PRIVATE_KEY && process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) {
  webpush.setVapidDetails(
    'mailto:hello@safetyalertsng.com',
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  )
}

type BroadcastType = 'emergency' | 'announcement' | 'maintenance' | 'info' | 'custom'
type TargetType = 'all' | 'area' | 'users'

interface BroadcastRequest {
  title: string
  body: string
  broadcast_type: BroadcastType
  target_type: TargetType
  target_areas?: string[]
  target_user_ids?: string[]
  action_url?: string
  icon?: string
  scheduled_at?: string
}

/**
 * GET /api/admin/broadcasts
 * List all broadcasts with pagination
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin('view_broadcasts')
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const supabase = createServerClient()
  const searchParams = request.nextUrl.searchParams
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '20')
  const status = searchParams.get('status')
  const type = searchParams.get('type')
  const offset = (page - 1) * limit

  try {
    let query = supabase
      .from('broadcast_notifications')
      .select('*, admin_users!created_by(full_name, email)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (status) {
      query = query.eq('status', status)
    }
    if (type) {
      query = query.eq('broadcast_type', type)
    }

    const { data: broadcasts, error, count } = await query

    if (error) throw error

    return NextResponse.json({
      broadcasts,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    })
  } catch (error) {
    console.error('Error fetching broadcasts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch broadcasts' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/broadcasts
 * Create and send a broadcast notification
 */
export async function POST(request: NextRequest) {
  // Check permission based on broadcast type (will verify emergency permission later)
  const auth = await requireAdmin('send_broadcasts')
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const supabase = createServerClient()

  try {
    const body: BroadcastRequest = await request.json()

    // Validate required fields
    if (!body.title || !body.body) {
      return NextResponse.json(
        { error: 'Title and body are required' },
        { status: 400 }
      )
    }

    // Check emergency broadcast permission
    if (body.broadcast_type === 'emergency') {
      const emergencyAuth = await requireAdmin('send_emergency_broadcasts')
      if (!emergencyAuth.success) {
        return NextResponse.json(
          { error: 'Only super admins can send emergency broadcasts' },
          { status: 403 }
        )
      }
    }

    // Validate targeting
    if (body.target_type === 'area' && (!body.target_areas || body.target_areas.length === 0)) {
      return NextResponse.json(
        { error: 'At least one area must be selected for area targeting' },
        { status: 400 }
      )
    }

    if (body.target_type === 'users' && (!body.target_user_ids || body.target_user_ids.length === 0)) {
      return NextResponse.json(
        { error: 'At least one user must be selected for user targeting' },
        { status: 400 }
      )
    }

    // Create broadcast record
    const { data: broadcast, error: insertError } = await supabase
      .from('broadcast_notifications')
      .insert({
        title: body.title,
        body: body.body,
        broadcast_type: body.broadcast_type || 'announcement',
        target_type: body.target_type || 'all',
        target_areas: body.target_areas,
        target_user_ids: body.target_user_ids,
        action_url: body.action_url || '/app',
        icon: body.icon || getDefaultIcon(body.broadcast_type),
        status: body.scheduled_at ? 'scheduled' : 'sending',
        scheduled_at: body.scheduled_at,
        created_by: auth.admin!.adminId,
      })
      .select()
      .single()

    if (insertError) throw insertError

    // If scheduled, don't send now
    if (body.scheduled_at) {
      await logAdminAction(
        auth.admin!.adminId,
        auth.admin!.email,
        'schedule_broadcast',
        {
          entityType: 'broadcast',
          entityId: broadcast.id,
          details: {
            title: body.title,
            target_type: body.target_type,
            scheduled_at: body.scheduled_at,
          },
        }
      )

      return NextResponse.json({
        broadcast,
        message: 'Broadcast scheduled successfully',
      })
    }

    // Send broadcast immediately
    const result = await sendBroadcast(supabase, broadcast)

    // Update broadcast with results
    await supabase
      .from('broadcast_notifications')
      .update({
        status: result.failed === result.total ? 'failed' : 'sent',
        sent_at: new Date().toISOString(),
        total_recipients: result.total,
        successful_deliveries: result.success,
        failed_deliveries: result.failed,
      })
      .eq('id', broadcast.id)

    // Log action
    await logAdminAction(
      auth.admin!.adminId,
      auth.admin!.email,
      'send_broadcast',
      {
        entityType: 'broadcast',
        entityId: broadcast.id,
        details: {
          title: body.title,
          target_type: body.target_type,
          total_recipients: result.total,
          successful: result.success,
          failed: result.failed,
        },
      }
    )

    return NextResponse.json({
      broadcast: {
        ...broadcast,
        status: result.failed === result.total ? 'failed' : 'sent',
        sent_at: new Date().toISOString(),
        total_recipients: result.total,
        successful_deliveries: result.success,
        failed_deliveries: result.failed,
      },
      delivery: result,
      message: `Broadcast sent to ${result.success} of ${result.total} recipients`,
    })
  } catch (error) {
    console.error('Error creating broadcast:', error)
    return NextResponse.json(
      { error: 'Failed to create broadcast' },
      { status: 500 }
    )
  }
}

function getDefaultIcon(type: BroadcastType): string {
  switch (type) {
    case 'emergency':
      return '🚨'
    case 'announcement':
      return '📢'
    case 'maintenance':
      return '🔧'
    case 'info':
      return '💡'
    default:
      return '🔔'
  }
}

interface SendResult {
  total: number
  success: number
  failed: number
  errors: Array<{ endpoint: string; error: string }>
}

async function sendBroadcast(
  supabase: ReturnType<typeof createServerClient>,
  broadcast: any
): Promise<SendResult> {
  const result: SendResult = {
    total: 0,
    success: 0,
    failed: 0,
    errors: [],
  }

  try {
    // Get subscriptions based on target type
    let subscriptions: any[] = []

    if (broadcast.target_type === 'all') {
      // Get all active subscriptions
      const { data } = await supabase
        .from('push_subscriptions')
        .select('*, users!inner(status)')
        .eq('users.status', 'active')

      subscriptions = data || []
    } else if (broadcast.target_type === 'area' && broadcast.target_areas?.length > 0) {
      // Get subscriptions for users in specific areas
      const { data: userLocations } = await supabase
        .from('user_locations')
        .select('user_id')
        .in('area_slug', broadcast.target_areas)

      if (userLocations && userLocations.length > 0) {
        const userIds = Array.from(new Set(userLocations.map((ul: any) => ul.user_id)))

        const { data } = await supabase
          .from('push_subscriptions')
          .select('*, users!inner(status)')
          .in('user_id', userIds)
          .eq('users.status', 'active')

        subscriptions = data || []
      }
    } else if (broadcast.target_type === 'users' && broadcast.target_user_ids?.length > 0) {
      // Get subscriptions for specific users
      const { data } = await supabase
        .from('push_subscriptions')
        .select('*, users!inner(status)')
        .in('user_id', broadcast.target_user_ids)
        .eq('users.status', 'active')

      subscriptions = data || []
    }

    result.total = subscriptions.length

    if (subscriptions.length === 0) {
      return result
    }

    // Prepare notification payload
    const payload = JSON.stringify({
      title: `${broadcast.icon || '🔔'} ${broadcast.title}`,
      body: broadcast.body,
      tag: `broadcast-${broadcast.id}`,
      url: broadcast.action_url || '/app',
      data: {
        type: 'broadcast',
        broadcast_id: broadcast.id,
        broadcast_type: broadcast.broadcast_type,
      },
    })

    // Send notifications in parallel with rate limiting
    const batchSize = 100
    for (let i = 0; i < subscriptions.length; i += batchSize) {
      const batch = subscriptions.slice(i, i + batchSize)

      const sendPromises = batch.map(async (sub: any) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: sub.keys,
            },
            payload
          )

          // Log successful delivery
          await supabase.from('broadcast_delivery_log').insert({
            broadcast_id: broadcast.id,
            user_id: sub.user_id,
            subscription_endpoint: sub.endpoint,
            success: true,
          })

          result.success++
        } catch (err: any) {
          result.failed++
          result.errors.push({
            endpoint: sub.endpoint.slice(0, 50) + '...',
            error: err.message || 'Unknown error',
          })

          // Log failed delivery
          await supabase.from('broadcast_delivery_log').insert({
            broadcast_id: broadcast.id,
            user_id: sub.user_id,
            subscription_endpoint: sub.endpoint,
            success: false,
            error_message: err.message,
            error_code: err.statusCode?.toString(),
          })

          // Remove invalid subscriptions
          if (err.statusCode === 404 || err.statusCode === 410) {
            await supabase.from('push_subscriptions').delete().eq('id', sub.id)
          }
        }
      })

      await Promise.allSettled(sendPromises)

      // Small delay between batches to avoid rate limiting
      if (i + batchSize < subscriptions.length) {
        await new Promise((resolve) => setTimeout(resolve, 100))
      }
    }

    return result
  } catch (error) {
    console.error('Error sending broadcast:', error)
    return result
  }
}
