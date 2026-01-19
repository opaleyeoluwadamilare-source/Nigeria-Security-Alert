'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  ChevronLeft,
  Shield,
  Activity,
  Settings,
  CheckCircle2,
  FileText,
  Users,
  Clock,
  TrendingUp,
  Award,
  AlertTriangle,
  XCircle,
  Loader2,
  RefreshCw,
} from 'lucide-react'
import { NigerianShield } from '@/components/landing/NigerianShield'
import { useAppStore } from '@/lib/store'
import { EmptyState } from '@/components/ui/EmptyState'
import { staggerContainer, staggerItem } from '@/lib/animations'
import { INCIDENT_TYPES } from '@/types'

interface ActivityStats {
  reports_submitted: number
  confirmations_made: number
  neighbors_helped: number
}

interface ActivityItem {
  id: string
  type: 'report' | 'confirmation' | 'denial'
  incident_type: string
  area_name: string
  created_at: string
  status?: string
  report_id?: string
}

interface Achievement {
  id: string
  name: string
  description: string
  icon: string
  earned_at?: string
}

export default function ActivityPage() {
  const router = useRouter()
  const { savedLocations, user } = useAppStore()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState<ActivityStats>({
    reports_submitted: 0,
    confirmations_made: 0,
    neighbors_helped: 0,
  })
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([])
  const [achievements, setAchievements] = useState<Achievement[]>([])

  const fetchActivity = async () => {
    if (!user?.id) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/user/activity?user_id=${user.id}`)

      if (!response.ok) {
        throw new Error('Failed to fetch activity')
      }

      const data = await response.json()
      setStats(data.stats)
      setRecentActivity(data.recent_activity || [])
      setAchievements(data.achievements || [])
    } catch (err) {
      console.error('Failed to fetch activity:', err)
      setError('Could not load your activity. Pull down to refresh.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchActivity()
  }, [user?.id])

  const getIncidentLabel = (type: string) => {
    const incident = INCIDENT_TYPES.find((i) => i.type === type)
    return incident?.label || type
  }

  const getIncidentIcon = (type: string) => {
    const incident = INCIDENT_TYPES.find((i) => i.type === type)
    return incident?.icon || '🔔'
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 bg-background/80 backdrop-blur-md border-b border-border z-40">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center">
          <button
            onClick={() => router.back()}
            className="p-2 -ml-2 hover:bg-muted rounded-lg transition-colors"
          >
            <ChevronLeft className="w-6 h-6 text-foreground" />
          </button>
          <h1 className="font-semibold text-lg flex-1 text-center text-foreground">
            Your Activity
          </h1>
          <button
            onClick={fetchActivity}
            disabled={loading}
            className="p-2 -mr-2 hover:bg-muted rounded-lg transition-colors"
          >
            <RefreshCw className={`w-5 h-5 text-muted-foreground ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-4 space-y-6">
        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="bg-safety-red/10 border border-safety-red/20 rounded-xl p-4 text-center">
            <p className="text-safety-red text-sm">{error}</p>
            <button
              onClick={fetchActivity}
              className="mt-2 text-sm text-primary hover:underline"
            >
              Try Again
            </button>
          </div>
        )}

        {!loading && !error && (
          <>
            {/* Impact Stats */}
            <motion.section
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl p-5 border border-primary/20">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-foreground">Your Impact</h2>
                    <p className="text-sm text-muted-foreground">
                      Thank you for keeping your community safe
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-background/80 rounded-xl p-3 text-center">
                    <div className="w-8 h-8 bg-safety-amber/10 rounded-full flex items-center justify-center mx-auto mb-2">
                      <FileText className="w-4 h-4 text-safety-amber" />
                    </div>
                    <div className="text-2xl font-bold text-foreground">{stats.reports_submitted}</div>
                    <div className="text-xs text-muted-foreground">Reports</div>
                  </div>

                  <div className="bg-background/80 rounded-xl p-3 text-center">
                    <div className="w-8 h-8 bg-safety-green/10 rounded-full flex items-center justify-center mx-auto mb-2">
                      <CheckCircle2 className="w-4 h-4 text-safety-green" />
                    </div>
                    <div className="text-2xl font-bold text-foreground">{stats.confirmations_made}</div>
                    <div className="text-xs text-muted-foreground">Verified</div>
                  </div>

                  <div className="bg-background/80 rounded-xl p-3 text-center">
                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-2">
                      <Users className="w-4 h-4 text-primary" />
                    </div>
                    <div className="text-2xl font-bold text-foreground">{stats.neighbors_helped}</div>
                    <div className="text-xs text-muted-foreground">Helped</div>
                  </div>
                </div>
              </div>
            </motion.section>

            {/* Achievements */}
            {achievements.length > 0 && (
              <motion.section
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <h2 className="font-semibold text-foreground flex items-center gap-2 mb-3">
                  <Award className="w-5 h-5 text-safety-amber" />
                  Achievements
                </h2>
                <div className="space-y-2">
                  {achievements.map((achievement) => (
                    <div
                      key={achievement.id}
                      className="bg-background-elevated rounded-xl p-4 border border-border flex items-center gap-4"
                    >
                      <div className="w-12 h-12 bg-safety-amber/10 rounded-full flex items-center justify-center text-2xl">
                        {achievement.icon}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-foreground">{achievement.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {achievement.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.section>
            )}

            {/* Recent Activity */}
            <motion.section
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <h2 className="font-semibold text-foreground flex items-center gap-2 mb-3">
                <Clock className="w-5 h-5 text-muted-foreground" />
                Recent Activity
              </h2>

              {recentActivity.length === 0 ? (
                <EmptyState
                  type="no-activity"
                  action={{
                    label: 'Report an Incident',
                    onClick: () => router.push('/app/report'),
                  }}
                />
              ) : (
                <motion.div
                  variants={staggerContainer}
                  initial="initial"
                  animate="animate"
                  className="space-y-3"
                >
                  {recentActivity.map((item) => (
                    <motion.div
                      key={item.id}
                      variants={staggerItem}
                      className="bg-background-elevated rounded-xl p-4 border border-border"
                      onClick={() => {
                        if (item.type === 'report') {
                          router.push(`/app/alert/${item.id}`)
                        } else if (item.report_id) {
                          router.push(`/app/alert/${item.report_id}`)
                        }
                      }}
                      style={{ cursor: 'pointer' }}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                          item.type === 'report'
                            ? 'bg-safety-amber/10'
                            : item.type === 'confirmation'
                              ? 'bg-safety-green/10'
                              : 'bg-safety-red/10'
                        }`}>
                          {item.type === 'report' ? (
                            <span className="text-xl">{getIncidentIcon(item.incident_type)}</span>
                          ) : item.type === 'confirmation' ? (
                            <CheckCircle2 className="w-5 h-5 text-safety-green" />
                          ) : (
                            <XCircle className="w-5 h-5 text-safety-red" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground truncate">
                            {item.type === 'report' ? (
                              <>Reported: {getIncidentLabel(item.incident_type)}</>
                            ) : item.type === 'confirmation' ? (
                              <>Confirmed: {getIncidentLabel(item.incident_type)}</>
                            ) : (
                              <>Disputed: {getIncidentLabel(item.incident_type)}</>
                            )}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {item.area_name} • {formatTimeAgo(new Date(item.created_at))}
                          </p>
                        </div>
                        {item.status && (
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            item.status === 'active'
                              ? 'bg-safety-amber/10 text-safety-amber'
                              : 'bg-muted text-muted-foreground'
                          }`}>
                            {item.status}
                          </span>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </motion.section>

            {/* Watching Areas */}
            <motion.section
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-foreground">Watching</h2>
                <Link
                  href="/app/settings"
                  className="text-sm text-primary hover:underline"
                >
                  Manage
                </Link>
              </div>

              <div className="bg-background-elevated rounded-2xl border border-border overflow-hidden">
                {savedLocations.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground">
                    <p className="text-sm">No areas yet</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {savedLocations.map((location) => (
                      <div key={location.id} className="p-3 flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                          location.is_primary ? 'bg-primary/10' : 'bg-muted'
                        }`}>
                          <Shield className={`w-4 h-4 ${
                            location.is_primary ? 'text-primary' : 'text-muted-foreground'
                          }`} />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-foreground text-sm">{location.area_name}</p>
                          <p className="text-xs text-muted-foreground">{location.state}</p>
                        </div>
                        {location.is_primary && (
                          <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                            Primary
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.section>
          </>
        )}
      </div>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-gray-100 z-40 safe-bottom">
        <div className="max-w-lg mx-auto flex items-center justify-around">
          <Link
            href="/app"
            className="flex flex-col items-center py-3 px-6 min-w-[80px] text-gray-400 hover:text-gray-600 transition-colors"
          >
            <NigerianShield className="w-6 h-6 opacity-50" />
            <span className="text-xs mt-1">Feed</span>
          </Link>
          <Link
            href="/app/activity"
            className="flex flex-col items-center py-3 px-6 min-w-[80px] text-emerald-700"
          >
            <Activity className="w-5 h-5" />
            <span className="text-xs mt-1 font-medium">Activity</span>
          </Link>
          <Link
            href="/app/settings"
            className="flex flex-col items-center py-3 px-6 min-w-[80px] text-gray-400 hover:text-gray-600 transition-colors"
          >
            <Settings className="w-5 h-5" />
            <span className="text-xs mt-1">Settings</span>
          </Link>
        </div>
      </nav>
    </div>
  )
}

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  if (seconds < 60) return 'Just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`
  return date.toLocaleDateString()
}
