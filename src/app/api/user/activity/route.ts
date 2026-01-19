import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'

/**
 * GET /api/user/activity?user_id=xxx
 * Get user's activity stats and recent actions
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get('user_id')

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    const supabase = getSupabase()

    // Get user's reports count
    const { count: reportsCount } = await supabase
      .from('reports')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)

    // Get user's confirmations count
    const { count: confirmationsCount } = await supabase
      .from('confirmations')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('confirmation_type', 'confirm')

    // Get recent activity (last 50 items)
    const { data: recentReports } = await supabase
      .from('reports')
      .select('id, incident_type, area_name, created_at, status')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10)

    const { data: recentConfirmations } = await supabase
      .from('confirmations')
      .select(`
        id,
        confirmation_type,
        created_at,
        report_id,
        reports!inner (
          incident_type,
          area_name
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10)

    // Calculate neighbors helped (unique reports confirmed in their area)
    const { count: neighborsHelped } = await supabase
      .from('confirmations')
      .select('report_id', { count: 'exact', head: true })
      .eq('user_id', userId)

    // Merge and sort recent activity
    const activity: any[] = []

    if (recentReports) {
      recentReports.forEach((report) => {
        activity.push({
          id: report.id,
          type: 'report',
          incident_type: report.incident_type,
          area_name: report.area_name,
          created_at: report.created_at,
          status: report.status,
        })
      })
    }

    if (recentConfirmations) {
      recentConfirmations.forEach((conf: any) => {
        activity.push({
          id: conf.id,
          type: conf.confirmation_type === 'confirm' ? 'confirmation' : 'denial',
          incident_type: conf.reports?.incident_type,
          area_name: conf.reports?.area_name,
          created_at: conf.created_at,
          report_id: conf.report_id,
        })
      })
    }

    // Sort by date descending
    activity.sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )

    // Calculate achievements
    const achievements = []

    if ((reportsCount || 0) >= 1) {
      achievements.push({
        id: 'first-report',
        name: 'First Reporter',
        description: 'Submitted your first incident report',
        icon: '📝',
        earned_at: recentReports?.[recentReports.length - 1]?.created_at,
      })
    }

    if ((reportsCount || 0) >= 5) {
      achievements.push({
        id: 'active-reporter',
        name: 'Active Reporter',
        description: 'Submitted 5+ incident reports',
        icon: '🔔',
      })
    }

    if ((confirmationsCount || 0) >= 1) {
      achievements.push({
        id: 'community-helper',
        name: 'Community Helper',
        description: 'Confirmed your first incident',
        icon: '🤝',
      })
    }

    if ((confirmationsCount || 0) >= 10) {
      achievements.push({
        id: 'community-guardian',
        name: 'Community Guardian',
        description: 'Confirmed 10+ incidents',
        icon: '🛡️',
      })
    }

    if ((reportsCount || 0) + (confirmationsCount || 0) >= 20) {
      achievements.push({
        id: 'safety-champion',
        name: 'Safety Champion',
        description: 'Made 20+ contributions to community safety',
        icon: '🏆',
      })
    }

    return NextResponse.json({
      stats: {
        reports_submitted: reportsCount || 0,
        confirmations_made: confirmationsCount || 0,
        neighbors_helped: neighborsHelped || 0,
      },
      recent_activity: activity.slice(0, 20),
      achievements,
    })
  } catch (error) {
    console.error('Activity fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
