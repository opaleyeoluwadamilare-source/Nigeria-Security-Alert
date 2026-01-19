import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { requireAdmin, logAdminAction } from '@/lib/admin-auth'

/**
 * GET /api/admin/broadcasts/templates
 * List all broadcast templates
 */
export async function GET() {
  const auth = await requireAdmin('view_broadcasts')
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const supabase = createServerClient()

  try {
    const { data: templates, error } = await supabase
      .from('broadcast_templates')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({ templates })
  } catch (error) {
    console.error('Error fetching templates:', error)
    return NextResponse.json(
      { error: 'Failed to fetch templates' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/broadcasts/templates
 * Create a new broadcast template
 */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin('send_broadcasts')
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const supabase = createServerClient()

  try {
    const body = await request.json()

    if (!body.name || !body.title || !body.body) {
      return NextResponse.json(
        { error: 'Name, title, and body are required' },
        { status: 400 }
      )
    }

    const { data: template, error } = await supabase
      .from('broadcast_templates')
      .insert({
        name: body.name,
        title: body.title,
        body: body.body,
        broadcast_type: body.broadcast_type || 'announcement',
        icon: body.icon,
        action_url: body.action_url,
        created_by: auth.admin!.adminId,
      })
      .select()
      .single()

    if (error) throw error

    await logAdminAction(
      auth.admin!.adminId,
      auth.admin!.email,
      'create_broadcast_template',
      {
        entityType: 'broadcast_template',
        entityId: template.id,
        details: { name: body.name },
      }
    )

    return NextResponse.json({ template }, { status: 201 })
  } catch (error) {
    console.error('Error creating template:', error)
    return NextResponse.json(
      { error: 'Failed to create template' },
      { status: 500 }
    )
  }
}
