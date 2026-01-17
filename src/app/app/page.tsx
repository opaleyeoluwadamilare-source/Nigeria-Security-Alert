'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Shield,
  MapPin,
  Plus,
  Settings,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Bell,
  ChevronRight,
  Users,
  Clock,
  FileText,
  Activity,
  Share2,
  Navigation,
} from 'lucide-react'
import { useAppStore } from '@/lib/store'
import { useAlerts } from '@/hooks/useAlerts'
import { useLocation } from '@/hooks/useLocation'
import { Button } from '@/components/ui/Button'
import { RiskBadge } from '@/components/ui/RiskBadge'
import { EmptyState } from '@/components/ui/EmptyState'
import { shareAlert } from '@/lib/share'
import { formatDistance } from '@/lib/distance'
import { staggerContainer, staggerItem, fabVariants, alertCardVariants } from '@/lib/animations'
import { NigerianShield } from '@/components/landing/NigerianShield'
import {
  RobberyIcon,
  AttackIcon,
  GunshotsIcon,
  KidnappingIcon,
  CheckpointIcon,
  FireIcon,
  AccidentIcon,
  TrafficIcon,
  SuspiciousIcon,
} from '@/components/landing/IncidentIcons'
import type { Alert } from '@/types'

type FilterType = 'all' | 'critical' | 'robbery' | 'kidnapping' | 'fire' | 'accident' | 'traffic' | 'checkpoint' | 'resolved'

const filterOptions: { value: FilterType; label: string; icon?: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'critical', label: 'Critical', icon: '🚨' },
  { value: 'robbery', label: 'Robbery', icon: '🔴' },
  { value: 'kidnapping', label: 'Kidnapping', icon: '🆘' },
  { value: 'fire', label: 'Fire', icon: '🔥' },
  { value: 'accident', label: 'Accident', icon: '🚗' },
  { value: 'traffic', label: 'Traffic', icon: '🚧' },
  { value: 'checkpoint', label: 'Checkpoint', icon: '🚔' },
  { value: 'resolved', label: 'Resolved', icon: '✓' },
]

export default function AppFeedPage() {
  const router = useRouter()
  const [filter, setFilter] = useState<FilterType>('all')
  const [isRefreshing, setIsRefreshing] = useState(false)

  const { hasCompletedOnboarding, savedLocations, currentArea, setCurrentLocation } =
    useAppStore()
  const { alerts, loading, refresh, hasActiveAlerts, lastUpdated } = useAlerts()
  const { getLocation } = useLocation()

  // Redirect to onboarding if not completed
  useEffect(() => {
    if (!hasCompletedOnboarding) {
      router.push('/app/onboarding')
    }
  }, [hasCompletedOnboarding, router])

  // Get current location on mount
  useEffect(() => {
    async function fetchLocation() {
      const result = await getLocation()
      if (result.success && result.coords && result.area) {
        setCurrentLocation(
          { lat: result.coords.lat, lng: result.coords.lng },
          result.area
        )
      }
    }
    fetchLocation()
  }, [getLocation, setCurrentLocation])

  // Pull to refresh handler
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true)
    await refresh()
    setTimeout(() => setIsRefreshing(false), 500)
  }, [refresh])

  // Filter alerts
  const filteredAlerts = alerts.filter((alert) => {
    switch (filter) {
      case 'critical':
        return alert.risk_level === 'EXTREME' || alert.risk_level === 'VERY HIGH' || alert.risk_level === 'HIGH'
      case 'robbery':
        return alert.incident_type === 'robbery'
      case 'kidnapping':
        return alert.incident_type === 'kidnapping'
      case 'fire':
        return alert.incident_type === 'fire'
      case 'accident':
        return alert.incident_type === 'accident'
      case 'traffic':
        return alert.incident_type === 'traffic'
      case 'checkpoint':
        return alert.incident_type === 'checkpoint'
      case 'resolved':
        return alert.status === 'ended'
      default:
        return true
    }
  })

  if (!hasCompletedOnboarding) {
    return null // Will redirect
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="bg-white/95 backdrop-blur-md border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/app" className="flex items-center gap-2">
            <NigerianShield className="w-8 h-8" />
            <span className="font-bold text-lg text-gray-900">SafetyAlerts</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/app/settings">
              <Button variant="ghost" className="p-2 relative">
                <Bell className="w-5 h-5 text-muted-foreground" />
                {hasActiveAlerts && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-safety-red rounded-full" />
                )}
              </Button>
            </Link>
            <Link href="/app/settings">
              <Button variant="ghost" className="p-2">
                <Settings className="w-5 h-5 text-muted-foreground" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Current Location Pill */}
        {currentArea && (
          <div className="max-w-lg mx-auto px-4 pb-3">
            <button className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-muted rounded-full text-sm text-foreground hover:bg-muted/80 transition-colors">
              <Navigation className="w-3.5 h-3.5 text-primary" />
              <span>Near {currentArea.name}</span>
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          </div>
        )}
      </header>

      <div className="max-w-lg mx-auto px-4 pt-4">
        {/* Status Banner */}
        <AnimatePresence mode="wait">
          {hasActiveAlerts ? (
            <motion.div
              key="alert"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-gradient-to-r from-safety-red/10 to-safety-amber/10 border border-safety-red/20 rounded-2xl p-4 mb-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-safety-red/20 rounded-full flex items-center justify-center flex-shrink-0 animate-pulse">
                  <AlertTriangle className="w-5 h-5 text-safety-red" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground">
                    {alerts.filter(a => a.status === 'active').length} active alert{alerts.filter(a => a.status === 'active').length !== 1 ? 's' : ''} nearby
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Tap to see details and stay informed
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="safe"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-gradient-to-r from-safety-green/10 to-safety-green/5 border border-safety-green/20 rounded-2xl p-4 mb-4 status-safe"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-safety-green/20 rounded-full flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 className="w-5 h-5 text-safety-green" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground">All quiet in your areas</h3>
                  <p className="text-sm text-muted-foreground">
                    Last checked: {lastUpdated ? formatTimeAgo(lastUpdated) : 'just now'}
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Filter Bar */}
        <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide -mx-4 px-4">
          {filterOptions.map((option) => {
            const isActive = filter === option.value
            // Count alerts for this filter
            const count = option.value === 'all'
              ? alerts.filter(a => a.status === 'active').length
              : option.value === 'critical'
                ? alerts.filter(a => a.risk_level === 'EXTREME' || a.risk_level === 'VERY HIGH').length
                : option.value === 'resolved'
                  ? alerts.filter(a => a.status === 'ended').length
                  : alerts.filter(a => a.incident_type === option.value).length

            return (
              <button
                key={option.value}
                onClick={() => setFilter(option.value)}
                className={`px-3 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                {option.icon && <span className="text-sm">{option.icon}</span>}
                {option.label}
                {count > 0 && option.value !== 'all' && (
                  <span className={`ml-1 px-1.5 py-0.5 text-xs rounded-full ${
                    isActive ? 'bg-white/20' : 'bg-gray-200'
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Refresh Row */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-foreground">Recent Alerts</h2>
          <Button
            variant="ghost"
            onClick={handleRefresh}
            disabled={loading || isRefreshing}
            className="text-sm text-muted-foreground"
          >
            <RefreshCw className={`w-4 h-4 mr-1.5 ${(loading || isRefreshing) ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Refreshing...' : lastUpdated ? formatTimeAgo(lastUpdated) : 'Refresh'}
          </Button>
        </div>
      </div>

      {/* Alert Feed */}
      <div className="max-w-lg mx-auto px-4">
        {loading && alerts.length === 0 ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-background-elevated rounded-2xl p-4 animate-pulse">
                <div className="flex gap-3">
                  <div className="w-12 h-12 bg-muted rounded-xl" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted rounded w-1/3" />
                    <div className="h-5 bg-muted rounded w-2/3" />
                    <div className="h-3 bg-muted rounded w-1/2" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredAlerts.length === 0 ? (
          <EmptyState
            type={savedLocations.length === 0 ? 'no-areas' : 'all-safe'}
            action={
              savedLocations.length === 0
                ? { label: 'Add Your Areas', onClick: () => router.push('/app/settings') }
                : undefined
            }
          />
        ) : (
          <motion.div
            variants={staggerContainer}
            initial="initial"
            animate="animate"
            className="space-y-3"
          >
            {filteredAlerts.map((alert, index) => (
              <AlertCard
                key={alert.id}
                alert={alert}
                index={index}
              />
            ))}
          </motion.div>
        )}
      </div>

      {/* Report FAB */}
      <Link href="/app/report">
        <motion.button
          variants={fabVariants}
          initial="initial"
          animate="animate"
          whileHover="hover"
          whileTap="tap"
          className="fixed bottom-24 right-4 bg-emerald-700 text-white rounded-2xl px-5 py-3.5 shadow-lg hover:bg-emerald-800 hover:shadow-xl transition-all z-50 flex items-center gap-2 touch-target"
        >
          <Plus className="w-5 h-5" />
          <span className="font-semibold">Report</span>
        </motion.button>
      </Link>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-gray-100 z-40 safe-bottom">
        <div className="max-w-lg mx-auto flex items-center justify-around">
          <Link
            href="/app"
            className="flex flex-col items-center py-3 px-6 min-w-[80px] text-emerald-700"
          >
            <div className="relative">
              <NigerianShield className="w-6 h-6" />
              {hasActiveAlerts && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white" />
              )}
            </div>
            <span className="text-xs mt-1 font-medium">Feed</span>
          </Link>
          <Link
            href="/app/activity"
            className="flex flex-col items-center py-3 px-6 min-w-[80px] text-gray-400 hover:text-gray-600 transition-colors"
          >
            <Activity className="w-5 h-5" />
            <span className="text-xs mt-1">Activity</span>
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

// Custom Icon Components Map
const incidentIconComponents: Record<string, React.ComponentType<{ className?: string }>> = {
  robbery: RobberyIcon,
  attack: AttackIcon,
  gunshots: GunshotsIcon,
  kidnapping: KidnappingIcon,
  checkpoint: CheckpointIcon,
  fire: FireIcon,
  accident: AccidentIcon,
  traffic: TrafficIcon,
  suspicious: SuspiciousIcon,
}

// Alert Card Component
function AlertCard({ alert, index }: { alert: Alert; index: number }) {
  const router = useRouter()
  const IconComponent = incidentIconComponents[alert.incident_type] || SuspiciousIcon

  const handleShare = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    await shareAlert(alert)
  }

  const isHighRisk = ['robbery', 'kidnapping', 'gunshots', 'attack'].includes(alert.incident_type)

  return (
    <motion.div
      variants={staggerItem}
      onClick={() => router.push(`/app/alert/${alert.id}`)}
      className={`bg-white rounded-2xl p-4 cursor-pointer hover:shadow-md transition-all border group active:scale-[0.98] ${
        isHighRisk ? 'border-red-200 hover:border-red-300' : 'border-gray-100 hover:border-gray-200'
      }`}
    >
      <div className="flex gap-3">
        {/* Icon - Using Custom SVG */}
        <div className="flex-shrink-0">
          <IconComponent className="w-12 h-12" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-2 mb-1">
            <RiskBadge level={alert.risk_level} size="sm" />
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {alert.time_ago}
            </span>
          </div>

          {/* Title */}
          <h3 className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">
            {formatIncidentType(alert.incident_type)} — {alert.area_name}
          </h3>

          {/* Landmark */}
          {alert.landmark && (
            <p className="text-sm text-muted-foreground mt-0.5 line-clamp-1">
              Near {alert.landmark}
            </p>
          )}

          {/* Meta */}
          <div className="flex items-center gap-4 mt-2">
            {/* Distance */}
            {alert.distance_km !== undefined && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {formatDistance(alert.distance_km)}
              </span>
            )}

            {/* Confirmations */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <div className="w-4 h-1.5 bg-safety-green rounded-full" style={{ width: `${Math.min(alert.confirmation_count * 4, 24)}px` }} />
                <span className="text-xs text-safety-green">{alert.confirmation_count}</span>
              </div>
              {alert.denial_count > 0 && (
                <div className="flex items-center gap-1">
                  <div className="w-4 h-1.5 bg-safety-red/40 rounded-full" style={{ width: `${Math.min(alert.denial_count * 4, 16)}px` }} />
                  <span className="text-xs text-safety-red">{alert.denial_count}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col items-end justify-between">
          <button
            onClick={handleShare}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <Share2 className="w-4 h-4 text-muted-foreground" />
          </button>
          <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
        </div>
      </div>
    </motion.div>
  )
}

// Helper functions
function getIncidentIcon(type: string): string {
  const icons: Record<string, string> = {
    robbery: '🚨',
    attack: '⚠️',
    gunshots: '🔫',
    kidnapping: '🆘',
    checkpoint: '🚔',
    fire: '🔥',
    accident: '🚗',
    traffic: '🚧',
    suspicious: '👀',
    other: '📢',
  }
  return icons[type] || '📢'
}

function getIncidentBackground(type: string): string {
  const backgrounds: Record<string, string> = {
    robbery: 'bg-risk-critical/10',
    attack: 'bg-risk-critical/10',
    gunshots: 'bg-risk-critical/10',
    kidnapping: 'bg-risk-critical/10',
    checkpoint: 'bg-safety-amber/10',
    fire: 'bg-risk-high/10',
    accident: 'bg-risk-moderate/10',
    traffic: 'bg-risk-info/10',
    suspicious: 'bg-safety-amber/10',
    other: 'bg-muted',
  }
  return backgrounds[type] || 'bg-muted'
}

function formatIncidentType(type: string): string {
  const labels: Record<string, string> = {
    robbery: 'ROBBERY',
    attack: 'ATTACK',
    gunshots: 'GUNSHOTS',
    kidnapping: 'KIDNAPPING',
    checkpoint: 'CHECKPOINT',
    fire: 'FIRE',
    accident: 'ACCIDENT',
    traffic: 'TRAFFIC',
    suspicious: 'SUSPICIOUS',
    other: 'ALERT',
  }
  return labels[type] || 'ALERT'
}

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}
