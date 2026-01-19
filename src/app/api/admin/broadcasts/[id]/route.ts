import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { requireAdmin } from '@/lib/admin-auth'

/**
 * GET /api/admin/broadcasts/[id]
 * Get broadcast details with delivery log
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin('view_broadcasts')
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const { id } = await params
  const supabase = createServerClient()
  const searchParams = request.nextUrl.searchParams
  const includeDeliveryLog = searchParams.get('include_delivery_log') === 'true'
  const deliveryPage = parseInt(searchParams.get('delivery_page') || '1')
  const deliveryLimit = parseInt(searchParams.get('delivery_limit') || '50')

  try {
    // Get broadcast details
    const { data: broadcast, error } = await supabase
      .from('broadcast_notifications')
      .select('*, admin_users!created_by(full_name, email)')
      .eq('id', id)
      .single()

    if (error || !broadcast) {
      return NextResponse.json(
        { error: 'Broadcast not found' },
        { status: 404 }
      )
    }

    let response: any = { broadcast }

    // Get delivery log if requested
    if (includeDeliveryLog) {
      const offset = (deliveryPage - 1) * deliveryLimit

      const { data: deliveryLog, error: logError, count } = await supabase
        .from('broadcast_delivery_log')
        .select('*, users(phone)', { count: 'exact' })
        .eq('broadcast_id', id)
        .order('attempted_at', { ascending: false })
        .range(offset, offset + deliveryLimit - 1)

      if (!logError) {
        response.delivery_log = {
          items: deliveryLog,
          pagination: {
            page: deliveryPage,
            limit: deliveryLimit,
            total: count || 0,
            totalPages: Math.ceil((count || 0) / deliveryLimit),
          },
        }
      }
    }

    // Get target user details if targeting specific users
    if (broadcast.target_type === 'users' && broadcast.target_user_ids?.length > 0) {
      const { data: targetUsers } = await supabase
        .from('users')
        .select('id, phone, status, created_at')
        .in('id', broadcast.target_user_ids)

      response.target_users = targetUsers
    }

    // Get target area names if targeting specific areas
    if (broadcast.target_type === 'area' && broadcast.target_areas?.length > 0) {
      // Get unique area names from user_locations
      const { data: areaData } = await supabase
        .from('user_locations')
        .select('area_name, area_slug, state')
        .in('area_slug', broadcast.target_areas)

      if (areaData) {
        const uniqueAreas = Array.from(
          new Map(areaData.map((a: any) => [a.area_slug, a])).values()
        )
        response.target_area_details = uniqueAreas
      }
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error fetching broadcast:', error)
    return NextResponse.json(
      { error: 'Failed to fetch broadcast' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/admin/broadcasts/[id]
 * Delete a draft or scheduled broadcast
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin('send_broadcasts')
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const { id } = await params
  const supabase = createServerClient()

  try {
    // Check if broadcast exists and is deletable
    const { data: broadcast, error: fetchError } = await supabase
      .from('broadcast_notifications')
      .select('status')
      .eq('id', id)
      .single()

    if (fetchError || !broadcast) {
      return NextResponse.json(
        { error: 'Broadcast not found' },
        { status: 404 }
      )
    }

    if (broadcast.status === 'sent' || broadcast.status === 'sending') {
      return NextResponse.json(
        { error: 'Cannot delete a broadcast that has already been sent' },
        { status: 400 }
      )
    }

    // Delete the broadcast
    const { error: deleteError } = await supabase
      .from('broadcast_notifications')
      .delete()
      .eq('id', id)

    if (deleteError) throw deleteError

    return NextResponse.json({ message: 'Broadcast deleted successfully' })
  } catch (error) {
    console.error('Error deleting broadcast:', error)
    return NextResponse.json(
      { error: 'Failed to delete broadcast' },
      { status: 500 }
    )
  }
}
