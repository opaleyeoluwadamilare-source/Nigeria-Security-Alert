'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { 
  Radio, 
  AlertTriangle, 
  ExternalLink, 
  RefreshCw, 
  Info,
  Car,
  Home,
  Plane,
  CheckCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
  MapPin
} from 'lucide-react'
import { 
  fetchAreaReports, 
  formatSeenDate, 
  formatLastUpdated, 
  isBreakingNews,
  LiveReportsData 
} from '@/lib/gdelt'
import { 
  getAreaHierarchy, 
  getStateDisplayName 
} from '@/lib/area-state-mapping'
import { useLiveIntelligence } from '@/hooks/useLiveIntelligence'
import { ClassifiedIncident } from '@/lib/risk-scoring'
import { useNetworkStatus } from '@/hooks/useNetworkStatus'
import { IntelligenceLoadingAnimation } from './IntelligenceLoadingAnimation'
import { LiveIntelligenceProgressBar } from '@/components/ui/LiveIntelligenceProgressBar'

type UserContext = 'resident' | 'visitor' | 'transit'

interface LiveReportsSectionProps {
  locationId: string
  locationName?: string
  state?: string  // State from locationData (fallback if not in mapping)
  className?: string
  enableIntelligence?: boolean // NEW: Toggle intelligence feature
  userContext?: UserContext // NEW: Context from top selection (resident/visitor/transit)
  areaProfile?: { // NEW: For intelligence
    riskLevel?: string
    keyThreats?: string[]
    saferZones?: string[]
    dangerZones?: string[]
    travelWindow?: string
  }
  onDynamicRiskChange?: (adjustedRisk: string | null) => void // NEW: Callback to pass adjusted risk to parent
}

export function LiveReportsSection({ 
  locationId, 
  locationName,
  state: stateFromProps,  // State from parent component
  className = '',
  enableIntelligence = true, // Default to enabled
  userContext = 'visitor', // Default to visitor if not provided
  areaProfile,
  onDynamicRiskChange,
}: LiveReportsSectionProps) {
  const [data, setData] = useState<LiveReportsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [showAllIncidents, setShowAllIncidents] = useState(false)
  
  // Auto-sync intelligence tab with userContext from top selection
  // Map: resident → 'residents', visitor/transit → 'travelers'
  const activeTab: 'travelers' | 'residents' = userContext === 'resident' ? 'residents' : 'travelers'
  
  // Get context label for display
  const getContextLabel = () => {
    switch (userContext) {
      case 'resident': return 'Living Here'
      case 'visitor': return 'Traveling'
      case 'transit': return 'Passing Through'
      default: return 'Traveling'
    }
  }
  
  // Get context icon
  const getContextIcon = () => {
    switch (userContext) {
      case 'resident': return Home
      case 'visitor': return Plane
      case 'transit': return Car
      default: return Plane
    }
  }
  
  const hierarchy = getAreaHierarchy(locationId)
  
  // Network status detection
  const networkStatus = useNetworkStatus()
  
  // Smart state resolution: mapping > props > locationId
  const getStateInfo = () => {
    if (hierarchy) {
      return {
        state: hierarchy.state,
        zone: hierarchy.zone || null
      }
    }
    
    // Fallback: use state from props
    if (stateFromProps) {
      // Normalize state name (convert "lagos" to "Lagos")
      const normalizedState = getStateDisplayName(stateFromProps) || stateFromProps
      return {
        state: normalizedState,
        zone: null
      }
    }
    
    return null
  }
  
  const stateInfo = getStateInfo()
  
  // NEW: Intelligence hook - always call to satisfy React Hooks rules
  // Use normalized state from getStateInfo() for proper state resolution
  // Pass risk level from areaProfile for risk-based time windows and dynamic adjustment
  const intelligence = useLiveIntelligence(
    locationId,
    stateInfo?.state || '',
    areaProfile,
    areaProfile?.riskLevel  // Pass risk level for time window and dynamic adjustment
  )
  
  const loadReports = async (isRefresh = false) => {
    if (!stateInfo) {
      // Don't set error immediately - try to use intelligence if available
      if (intelligence && !intelligence.loading && intelligence.briefing) {
        setLoading(false)
        return // Intelligence will handle display
      }
      setLoading(false)
      setError('Unable to determine location state')
      return
    }
    
    // Only show loading on initial load, not refresh (stale-while-revalidate)
    if (isRefresh) {
      setRefreshing(true)
    } else if (!data) {
      setLoading(true)
    }
    setError(null)
    
    try {
      // Clear cache on refresh
      if (isRefresh && typeof window !== 'undefined') {
        const cacheKey = `live-reports-area-${locationId}-${stateInfo.state}`
        localStorage.removeItem(cacheKey)
      }
      
      // Pass risk level for risk-based time windows
      const reports = await fetchAreaReports(
        locationId,
        stateInfo.zone,
        stateInfo.state,
        areaProfile?.riskLevel  // Pass risk level for time windows
      )
      
      // If we got cached data immediately, hide loading right away
      if (reports.cached && !data) {
        setLoading(false)
      }
      
      setData(reports)
      if (reports.error) {
        setError(reports.error)
      }
    } catch (err) {
      console.error('Error loading live reports:', err)
      // Only set error if we don't have any data AND no intelligence
      if (!data && (!intelligence || intelligence.error)) {
        setError('Failed to load live reports')
      }
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }
  
  useEffect(() => {
    loadReports()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationId, stateInfo?.state])
  
  // Notify parent of adjusted risk when it changes
  // Must be before any early returns to satisfy React Hooks rules
  useEffect(() => {
    if (intelligence?.dynamicRisk && onDynamicRiskChange) {
      onDynamicRiskChange(intelligence.dynamicRisk.adjustedRisk)
    } else if (!intelligence?.loading && !intelligence?.dynamicRisk && onDynamicRiskChange) {
      // Reset to null when intelligence is loaded but no dynamic risk adjustment
      onDynamicRiskChange(null)
    }
  }, [intelligence?.dynamicRisk?.adjustedRisk, intelligence?.loading, onDynamicRiskChange])
  
  const getActivityBadge = (count: number) => {
    if (count >= 10) return { variant: 'danger' as const, label: 'High Activity' }
    if (count >= 5) return { variant: 'warning' as const, label: 'Moderate Activity' }
    if (count >= 1) return { variant: 'info' as const, label: 'Low Activity' }
    return { variant: 'success' as const, label: 'Quiet' }
  }
  
  const getLevelDescription = () => {
    if (!data || !stateInfo) return ''
    
    const displayName = locationName || locationId
    
    switch (data.level) {
      case 'area':
        return `Showing incidents specific to ${displayName}`
      case 'zone':
        return `Showing incidents in the ${data.query} area`
      case 'state':
        return `No local incidents found. Showing ${stateInfo.state} State activity.`
      default:
        return ''
    }
  }
  
  // Always render - don't return null (works for all locations now)
  // if (!hierarchy) {
  //   return null  // REMOVED - now works for all locations
  // }
  
  // Show loading if either raw reports or intelligence is loading
  if (loading || (intelligence && intelligence.loading && !intelligence.briefing && intelligence.incidents.length === 0)) {
    return (
      <Card className={`border-green-200 bg-green-50/30 dark:bg-green-950/10 ${className}`} hover={false}>
        <div className="p-3 sm:p-4 md:p-6 lg:p-8">
          {intelligence?.loading && (
            <div className="mb-4 sm:mb-6">
              <LiveIntelligenceProgressBar stage={intelligence.loadingStage || 'fetching'} />
            </div>
          )}
          <IntelligenceLoadingAnimation 
            locationName={locationName || locationId} 
            loadingStage={intelligence?.loadingStage || 'fetching'}
          />
        </div>
      </Card>
    )
  }
  
  // Only show error if BOTH raw reports AND intelligence failed
  // Prioritize intelligence display over raw reports
  if (error && !data && (!intelligence || intelligence.error || !intelligence.briefing)) {
    return (
      <Card className={`border-gray-200 dark:border-gray-800 ${className}`} hover={false}>
        <div className="p-6">
          <div className="flex items-center justify-center gap-2 text-gray-500 dark:text-gray-400">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-sm">Live reports unavailable</span>
            <button 
              onClick={() => loadReports(true)}
              className="ml-2 text-blue-600 dark:text-blue-400 hover:underline text-sm"
            >
              Retry
            </button>
          </div>
        </div>
      </Card>
    )
  }
  
  if (!data) return null
  
  const badge = getActivityBadge(data.articles.length)
  
  // Helper functions for intelligence UI
  const getRiskBadgeStyle = (level: string) => {
    switch (level) {
      case 'low': return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800'
      case 'moderate': return 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800'
      case 'elevated': return 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800'
      case 'high': return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800'
      default: return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/20 dark:text-gray-400 dark:border-gray-800'
    }
  }
  
  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'fatal': return '🔴'
      case 'serious': return '🟠'
      case 'moderate': return '🟡'
      case 'minor': return '🟢'
      default: return '⚪'
    }
  }
  
  const formatTimeAgo = (isoString: string | null): string => {
    if (!isoString) return ''
    try {
      const date = new Date(isoString)
      const now = new Date()
      const diffMins = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))
      
      if (diffMins < 1) return 'Just now'
      if (diffMins < 60) return `${diffMins}m ago`
      
      const diffHours = Math.floor(diffMins / 60)
      if (diffHours < 24) return `${diffHours}h ago`
      
      return `${Math.floor(diffHours / 24)}d ago`
    } catch {
      return ''
    }
  }
  
  // Render intelligence incident item
  const IncidentItem = ({ incident }: { incident: ClassifiedIncident }) => (
    <a
      href={incident.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-start gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/20 transition group min-h-[44px] touch-target"
    >
      <span className="text-base sm:text-lg mt-0.5 flex-shrink-0">{getSeverityIcon(incident.severity)}</span>
      <div className="flex-1 min-w-0">
        <p className="text-xs sm:text-sm text-foreground group-hover:text-blue-700 dark:group-hover:text-blue-400 leading-relaxed">
          {incident.notification}
        </p>
        <div className="flex items-center gap-1.5 sm:gap-2 mt-1 flex-wrap">
          {incident.location_extracted && (
            <span className="text-[10px] sm:text-xs text-muted-foreground flex items-center gap-1">
              <MapPin className="w-3 h-3 flex-shrink-0" />
              <span className="truncate max-w-[120px] sm:max-w-none">{incident.location_extracted}</span>
            </span>
          )}
          <Badge variant="default" className="text-[10px] sm:text-xs py-0 px-1.5">
            {incident.incident_type.replace('_', ' ')}
          </Badge>
          {incident.relevance && (
            <span className="text-[10px] sm:text-xs text-muted-foreground hidden sm:inline">
              {incident.relevance.label}
            </span>
          )}
        </div>
      </div>
      <ExternalLink className="w-4 h-4 sm:w-5 sm:h-5 text-gray-300 dark:text-gray-600 group-hover:text-blue-500 flex-shrink-0 mt-1" />
    </a>
  )
  
  // Determine if we should show intelligence or raw reports
  // Show intelligence if:
  // 1. Feature is enabled
  // 2. Intelligence exists and is not loading
  // 3. No error (or error is non-critical)
  // 4. Has briefing OR has incidents (show intelligence even if briefing failed but incidents exist)
  const hasIncidents = intelligence && (
    intelligence.groupedIncidents.immediate.length > 0 ||
    intelligence.groupedIncidents.nearby.length > 0 ||
    intelligence.groupedIncidents.regional.length > 0 ||
    intelligence.groupedIncidents.stateWide.length > 0
  )
  const showIntelligence = enableIntelligence && intelligence && 
    !intelligence.loading && 
    !intelligence.error && 
    (intelligence.briefing !== null || hasIncidents) // Show if briefing exists OR incidents exist
  
  const relevantCount = intelligence 
    ? intelligence.groupedIncidents.immediate.length + 
      intelligence.groupedIncidents.nearby.length + 
      intelligence.groupedIncidents.regional.length
    : 0
  const distantCount = intelligence ? intelligence.groupedIncidents.stateWide.length : 0
  
  return (
    <div id="live-reports-section" className="scroll-mt-24">
      {/* Network Status Banner (if offline) */}
      {!networkStatus.isOnline && (
        <Card className={`border-orange-200 dark:border-orange-800 bg-orange-50/50 dark:bg-orange-950/20 ${className}`} hover={false}>
          <div className="p-3 sm:p-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-orange-600 dark:text-orange-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-orange-800 dark:text-orange-300">
                  No internet connection
                </p>
                <p className="text-[10px] sm:text-xs text-orange-700 dark:text-orange-400 mt-0.5">
                  Showing cached data. Reports will update when connection is restored.
                </p>
              </div>
            </div>
          </div>
        </Card>
      )}
      
      {/* Intelligence Section (if available) */}
      {showIntelligence && intelligence && (
        <Card className={`border-blue-200 dark:border-blue-800 bg-gradient-to-br from-blue-50/50 to-background dark:from-blue-950/20 dark:to-background overflow-hidden ${className}`} hover={false}>
          <div className="p-4 sm:p-5 md:p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-3 sm:mb-4 gap-2 sm:gap-3">
              <div className="flex items-center gap-2">
                <Radio className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                <h3 className="text-sm sm:text-base font-bold text-foreground">Live Intelligence</h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground hidden sm:inline">
                  {formatTimeAgo(intelligence.lastUpdated)}
                </span>
                <button 
                  onClick={() => intelligence.refresh()}
                  disabled={intelligence.loading || !networkStatus.isOnline}
                  className="text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition p-1.5 sm:p-2 disabled:opacity-50 min-h-[44px] min-w-[44px] flex items-center justify-center touch-target"
                  title={!networkStatus.isOnline ? "Offline - cannot refresh" : "Refresh"}
                  aria-label="Refresh intelligence"
                >
                  <RefreshCw className={`h-4 w-4 sm:h-5 sm:w-5 ${intelligence.loading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>
            
            {/* Risk Score & Incident Count */}
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap mb-3 sm:mb-4">
              <Badge className={`${getRiskBadgeStyle(intelligence.riskScore.level)} border text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-1.5`}>
                {intelligence.riskScore.level.charAt(0).toUpperCase() + intelligence.riskScore.level.slice(1)} Activity
              </Badge>
              <span className="text-xs sm:text-sm text-muted-foreground">
                {relevantCount} {relevantCount === 1 ? 'incident' : 'incidents'} in your area
                {distantCount > 0 && (
                  <span className="text-muted-foreground/60"> • {distantCount} elsewhere in state</span>
                )}
              </span>
            </div>
            
            {/* Dynamic Risk Adjustment (if available and different from static) */}
            {intelligence.dynamicRisk && intelligence.dynamicRisk.staticRisk !== intelligence.dynamicRisk.adjustedRisk && (
              <div className="mb-3 sm:mb-4 p-3 sm:p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <div className="flex items-start gap-2 sm:gap-3">
                  <Info className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
                      Risk Assessment Update
                    </p>
                    <p className="text-xs sm:text-sm text-blue-800 dark:text-blue-200 leading-relaxed">
                      <span className="font-medium">Static Risk:</span> {intelligence.dynamicRisk.staticRisk} → 
                      <span className="font-medium"> Adjusted Risk:</span> {intelligence.dynamicRisk.adjustedRisk}
                    </p>
                    <p className="text-xs text-blue-700 dark:text-blue-300 mt-1.5 opacity-90">
                      {intelligence.dynamicRisk.reasoning}
                    </p>
                    {intelligence.dynamicRisk.daysSinceLastIncident !== null && (
                      <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                        Last incident: {intelligence.dynamicRisk.daysSinceLastIncident} day{intelligence.dynamicRisk.daysSinceLastIncident !== 1 ? 's' : ''} ago
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
            
            {/* Context Badge - Shows which view is active (synced with top selection) */}
            <div className="mb-3 sm:mb-4 flex items-center justify-center">
              <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                {(() => {
                  const ContextIcon = getContextIcon()
                  return <ContextIcon className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 dark:text-blue-400" />
                })()}
                <span className="text-xs sm:text-sm font-medium text-blue-700 dark:text-blue-400">
                  Showing {getContextLabel()} view
                </span>
                {userContext === 'transit' && (
                  <span className="text-[10px] sm:text-xs text-blue-600 dark:text-blue-400 opacity-70 ml-1">
                    (travel advice)
                  </span>
                )}
              </div>
            </div>
            
            {/* Intelligence Content - Auto-synced with top selection, no duplicate tabs */}
            {intelligence.briefing && (
              <div className="mb-4 sm:mb-5">
                {/* Content Panel - Shows content based on activeTab (synced with userContext) */}
                <div className="relative min-h-[120px]">
                  {/* Travelers/Visitor/Transit Content */}
                  <div 
                    className={`transition-all duration-300 ease-in-out ${
                      activeTab === 'travelers'
                        ? 'opacity-100 translate-y-0 pointer-events-auto'
                        : 'opacity-0 translate-y-2 pointer-events-none absolute inset-0'
                    }`}
                  >
                    {intelligence.briefing.for_travelers && (
                      <div className={`rounded-xl p-4 sm:p-5 border ${
                        userContext === 'transit'
                          ? 'bg-orange-50/50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800'
                          : 'bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800'
                      }`}>
                        <div className="flex items-start gap-3 mb-3">
                          <div className={`p-2 rounded-lg flex-shrink-0 ${
                            userContext === 'transit'
                              ? 'bg-orange-100 dark:bg-orange-900/30'
                              : 'bg-blue-100 dark:bg-blue-900/30'
                          }`}>
                            {userContext === 'transit' ? (
                              <Car className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600 dark:text-orange-400" />
                            ) : (
                              <Plane className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 dark:text-blue-400" />
                            )}
                          </div>
                          <div className="flex-1">
                            <h4 className="text-sm sm:text-base font-semibold text-foreground mb-1">
                              {intelligence.briefing.for_travelers.headline}
                            </h4>
                            <p className="text-xs sm:text-sm text-muted-foreground">
                              {userContext === 'transit' 
                                ? 'Route safety tips for passing through'
                                : 'Safety tips for your journey'}
                            </p>
                          </div>
                        </div>
                        <ul className="space-y-2 sm:space-y-2.5">
                          {intelligence.briefing.for_travelers.tips.map((tip, i) => (
                            <li key={i} className="text-xs sm:text-sm text-foreground flex items-start gap-2.5">
                              <CheckCircle className={`w-4 h-4 sm:w-5 sm:h-5 mt-0.5 flex-shrink-0 ${
                                userContext === 'transit'
                                  ? 'text-orange-500 dark:text-orange-400'
                                  : 'text-blue-500 dark:text-blue-400'
                              }`} />
                              <span className="flex-1 leading-relaxed">{tip}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                  
                  {/* Residents Content */}
                  <div 
                    className={`transition-all duration-300 ease-in-out ${
                      activeTab === 'residents'
                        ? 'opacity-100 translate-y-0 pointer-events-auto'
                        : 'opacity-0 translate-y-2 pointer-events-none absolute inset-0'
                    }`}
                  >
                    {intelligence.briefing.for_residents && (
                      <div className="bg-green-50/50 dark:bg-green-950/20 rounded-xl p-4 sm:p-5 border border-green-200 dark:border-green-800">
                        <div className="flex items-start gap-3 mb-3">
                          <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg flex-shrink-0">
                            <Home className="w-5 h-5 sm:w-6 sm:h-6 text-green-600 dark:text-green-400" />
                          </div>
                          <div className="flex-1">
                            <h4 className="text-sm sm:text-base font-semibold text-foreground mb-1">
                              {intelligence.briefing.for_residents.headline}
                            </h4>
                            <p className="text-xs sm:text-sm text-muted-foreground">
                              Safety guidance for residents
                            </p>
                          </div>
                        </div>
                        <ul className="space-y-2 sm:space-y-2.5 mb-3">
                          {intelligence.briefing.for_residents.tips.map((tip, i) => (
                            <li key={i} className="text-xs sm:text-sm text-foreground flex items-start gap-2.5">
                              <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-500 dark:text-green-400 mt-0.5 flex-shrink-0" />
                              <span className="flex-1 leading-relaxed">{tip}</span>
                            </li>
                          ))}
                        </ul>
                        {intelligence.briefing.for_residents.neighborhood_status && (
                          <div className="mt-3 pt-3 border-t border-green-200 dark:border-green-800">
                            <p className="text-xs sm:text-sm font-medium text-foreground mb-1">Neighborhood Status:</p>
                            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                              {intelligence.briefing.for_residents.neighborhood_status}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
            
            {/* Summary (moved below tabs for better flow) */}
            {intelligence.briefing?.summary && (
              <div className="bg-muted/30 rounded-lg p-3 sm:p-4 mb-3 sm:mb-4 border border-border">
                <p className="text-xs sm:text-sm md:text-base text-foreground leading-relaxed">
                  {intelligence.briefing.summary}
                </p>
              </div>
            )}
            
            {/* Positive Notes */}
            {intelligence.briefing?.positive_notes && intelligence.briefing.positive_notes.length > 0 && (
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 mb-4">
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                  <div className="space-y-1">
                    {intelligence.briefing.positive_notes.map((note, i) => (
                      <p key={i} className="text-sm text-green-800 dark:text-green-300">{note}</p>
                    ))}
                  </div>
                </div>
              </div>
            )}
            
            {/* Bottom Line */}
            {intelligence.briefing?.bottom_line && (
              <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-3 mb-4">
                <p className="text-sm text-blue-800 dark:text-blue-300 font-medium">
                  💬 {intelligence.briefing.bottom_line}
                </p>
              </div>
            )}
            
            {/* Incidents Section (Collapsible) */}
            {relevantCount > 0 && intelligence.groupedIncidents && (
              <div className="border rounded-lg overflow-hidden mb-4">
                <button
                  onClick={() => setShowAllIncidents(!showAllIncidents)}
                  className="w-full flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-900/50 transition"
                >
                  <span className="text-sm font-medium text-foreground">
                    Recent Incidents ({relevantCount})
                  </span>
                  {showAllIncidents ? (
                    <ChevronUp className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  )}
                </button>
                
                {showAllIncidents && (
                  <div className="border-t divide-y divide-border">
                    {/* Immediate */}
                    {intelligence.groupedIncidents.immediate.length > 0 && (
                      <div className="p-2">
                        <p className="text-xs font-medium text-muted-foreground px-3 py-1">
                          📍 In {locationName || locationId}
                        </p>
                        {intelligence.groupedIncidents.immediate.map((incident, i) => (
                          <IncidentItem key={i} incident={incident} />
                        ))}
                      </div>
                    )}
                    
                    {/* Nearby */}
                    {intelligence.groupedIncidents.nearby.length > 0 && (
                      <div className="p-2">
                        <p className="text-xs font-medium text-muted-foreground px-3 py-1">
                          📍 Nearby (~15km)
                        </p>
                        {intelligence.groupedIncidents.nearby.map((incident, i) => (
                          <IncidentItem key={i} incident={incident} />
                        ))}
                      </div>
                    )}
                    
                    {/* Regional */}
                    {intelligence.groupedIncidents.regional.length > 0 && (
                      <div className="p-2">
                        <p className="text-xs font-medium text-muted-foreground px-3 py-1">
                          📍 Same Region (~30km)
                        </p>
                        {intelligence.groupedIncidents.regional.map((incident, i) => (
                          <IncidentItem key={i} incident={incident} />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
            
            {/* Distant Incidents Note */}
            {distantCount > 0 && (
              <div className="flex items-start gap-2 text-xs text-muted-foreground mb-4">
                <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
                <p>
                  {distantCount} other {distantCount === 1 ? 'incident' : 'incidents'} reported elsewhere in {stateInfo?.state || stateFromProps || 'this state'} (not shown — far from your location)
                </p>
              </div>
            )}
            
            {/* Methodology Note */}
            <p className="text-xs text-muted-foreground pt-2 border-t border-border">
              Intelligence based on verified news reports • Relevance calculated using proximity analysis
            </p>
          </div>
        </Card>
      )}
      
      {/* Fallback: Raw Reports Section (if intelligence unavailable or disabled) */}
      {(!showIntelligence || intelligence?.fallbackToRaw) && (
        <Card className={`border-blue-200 dark:border-blue-800 bg-gradient-to-br from-blue-50/50 to-background dark:from-blue-950/20 dark:to-background overflow-hidden ${className}`} hover={false}>
          <div className="p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Radio className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <h3 className="text-base font-bold text-foreground">Live Reports</h3>
              </div>
              <button 
                onClick={() => loadReports(true)}
                disabled={refreshing}
                className="text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition p-1 disabled:opacity-50"
                title={refreshing ? 'Refreshing...' : 'Refresh data'}
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
            </div>
        
        <div className="flex items-center gap-2 mb-4">
          <p className="text-xs text-muted-foreground">
            Updated {formatLastUpdated(data.lastUpdated)}
          </p>
          {data.cached && (
            <span className="text-xs text-muted-foreground/60" title="Data from cache">
              • Cached
            </span>
          )}
        </div>
        
        {/* Badge and count */}
        <div className="flex items-center gap-2 mb-3">
          <Badge variant={badge.variant}>
            {badge.label}
          </Badge>
          <span className="text-sm text-muted-foreground">
            {data.articles.length} {data.articles.length === 1 ? 'incident' : 'incidents'} in last 14 days
          </span>
        </div>
        
        {/* Level indicator */}
        <div className="flex items-start gap-1.5 mb-3 text-xs text-muted-foreground">
          <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
          <span>{getLevelDescription()}</span>
        </div>
        
        {/* Articles */}
        {data.articles.length > 0 ? (
          <ul className="space-y-2">
            {data.articles.map((article, index) => (
              <li key={index}>
                <a
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-2 p-2 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/20 transition group"
                >
                  <AlertTriangle className="h-3.5 w-3.5 text-orange-500 dark:text-orange-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm text-foreground group-hover:text-blue-700 dark:group-hover:text-blue-400 line-clamp-2 flex-1">
                        {article.title}
                      </p>
                      {isBreakingNews(article.seendate) && (
                        <Badge variant="danger" className="text-[10px] px-1.5 py-0 flex-shrink-0">
                          BREAKING
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {article.domain} • {formatSeenDate(article.seendate)}
                    </p>
                  </div>
                  <ExternalLink className="h-3 w-3 text-gray-300 dark:text-gray-600 group-hover:text-blue-500 flex-shrink-0 mt-1" />
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-3">
            No recent incidents reported
          </p>
        )}
        
            {/* Footer */}
            <p className="text-xs text-muted-foreground mt-4 pt-3 border-t border-border">
              Based on Nigerian news sources. May not include all incidents.
            </p>
          </div>
        </Card>
      )}
    </div>
  )
}

