'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { 
  Activity, 
  AlertTriangle, 
  ExternalLink, 
  RefreshCw, 
  ChevronDown, 
  ChevronUp,
  Car,
  CheckCircle,
  Info,
  MapPin,
  Route as RouteIcon
} from 'lucide-react'
import { 
  fetchRouteReports,
  fetchRouteReportsByStates,
  formatSeenDate, 
  formatLastUpdated, 
  isBreakingNews,
  RouteReportsData, 
  RoadReportsData 
} from '@/lib/gdelt'
import { 
  getRoadsForRoute, 
  RoadInfo 
} from '@/lib/road-mapping'
import { useRouteIntelligence } from '@/hooks/useRouteIntelligence'
import { ClassifiedIncident } from '@/lib/risk-scoring'
import { useNetworkStatus } from '@/hooks/useNetworkStatus'

interface RouteLiveReportsProps {
  stateIds: string[]
  routeDisplay?: string  // NEW: Route display name (e.g., "Lagos → Abuja")
  className?: string
  enableIntelligence?: boolean  // NEW: Toggle intelligence feature
  routeProfile?: {  // NEW: For intelligence
    routeDisplay?: string
    overallRisk?: string
    dangerousRoads?: Array<{ name: string; riskLevel: string }>
    recommendations?: {
      primary: string
      alternatives: string[]
    }
  }
}

export function RouteLiveReports({ 
  stateIds, 
  routeDisplay: routeDisplayProp,
  className = '',
  enableIntelligence = true,  // Default to enabled
  routeProfile,
}: RouteLiveReportsProps) {
  const [data, setData] = useState<RouteReportsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [expandedRoads, setExpandedRoads] = useState<Set<string>>(new Set())
  const [showAllIncidents, setShowAllIncidents] = useState(false)
  
  const roads = getRoadsForRoute(stateIds)
  
  // Generate route display name if not provided
  const routeDisplay = routeDisplayProp || 
    (stateIds.length > 0 ? stateIds.map(s => {
      // Format state name (capitalize first letter of each word)
      return s.split(/[\s-]+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ')
    }).join(' → ') : 'Route')
  
  // Network status detection
  const networkStatus = useNetworkStatus()
  
  // NEW: Route intelligence hook - always call to satisfy React Hooks rules
  // Pass highest risk level from routeProfile for risk-based time windows
  const highestRiskLevel = routeProfile?.overallRisk 
    ? routeProfile.overallRisk.toUpperCase().trim() 
    : null
  
  const intelligence = useRouteIntelligence(
    stateIds,
    routeDisplay,
    routeProfile,
    highestRiskLevel  // Pass highest risk level for time window
  )
  
  const loadReports = async (isRefresh = false) => {
    // If no explicit road mappings, use state-based fallback
    if (roads.length === 0 && stateIds.length > 0) {
      // Use state-based query as fallback
      try {
        setLoading(true)
        setError(null)
        
        if (isRefresh) {
          setRefreshing(true)
        }
        
        // Clear cache on refresh
        if (isRefresh && typeof window !== 'undefined') {
          const stateKey = stateIds.sort().join('-')
          localStorage.removeItem(`live-reports-route-states-${stateKey}`)
        }
        
        // Pass highest risk level for risk-based time windows
        const reports = await fetchRouteReportsByStates(stateIds, highestRiskLevel || null)
        
        setData(reports)
      } catch (err) {
        console.error('Error loading route reports:', err)
        // Only set error if we don't have intelligence to show
        if (!intelligence || intelligence.error || !intelligence.briefing) {
          setError('Failed to load live reports')
        }
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
      return
    }
    
    if (roads.length === 0) {
      setLoading(false)
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
        const routeKey = roads.map(r => r.id).sort().join('-')
        const cacheKey = `live-reports-route-${routeKey}`
        localStorage.removeItem(cacheKey)
        
        // Also clear individual road caches
        roads.forEach(road => {
          localStorage.removeItem(`live-reports-road-${road.id}`)
        })
      }
      
      const reports = await fetchRouteReports(roads)
      
      // If we got cached data immediately, hide loading right away
      if (reports.cached && !data) {
        setLoading(false)
      }
      
      setData(reports)
      
      // Auto-expand roads with incidents
      const roadsWithIncidents = new Set(
        reports.roads
          .filter(r => r.incidentCount > 0)
          .map(r => r.roadId)
      )
      setExpandedRoads(roadsWithIncidents)
      
    } catch (err) {
      console.error('Error loading route reports:', err)
      // Only set error if we don't have any data AND no intelligence
      if (!data && (!intelligence || intelligence.error || !intelligence.briefing)) {
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
  }, [stateIds.join(',')])
  
  const toggleRoad = (roadId: string) => {
    setExpandedRoads(prev => {
      const next = new Set(prev)
      if (next.has(roadId)) {
        next.delete(roadId)
      } else {
        next.add(roadId)
      }
      return next
    })
  }
  
  const getRoadBadge = (count: number) => {
    if (count >= 5) return { variant: 'danger' as const, icon: '🔴' }
    if (count >= 2) return { variant: 'warning' as const, icon: '🟠' }
    if (count >= 1) return { variant: 'info' as const, icon: '🟡' }
    return { variant: 'success' as const, icon: '🟢' }
  }
  
  const getTotalBadge = (count: number) => {
    if (count >= 10) return { variant: 'danger' as const, label: 'High Risk Route' }
    if (count >= 5) return { variant: 'warning' as const, label: 'Elevated Risk' }
    if (count >= 1) return { variant: 'info' as const, label: 'Some Activity' }
    return { variant: 'success' as const, label: 'Low Activity' }
  }
  
  // Always render if we have stateIds (fallback will work)
  // Only hide if truly no data available
  if (stateIds.length === 0) {
    return null
  }
  
  if (loading) {
    return (
      <Card className={`border-blue-200 dark:border-blue-800 bg-blue-50/30 dark:bg-blue-950/10 ${className}`} hover={false}>
        <div className="p-6">
          <div className="flex items-center justify-center gap-2 text-blue-600 dark:text-blue-400">
            <div className="animate-spin w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full" />
            <span className="text-sm">Loading route reports...</span>
          </div>
        </div>
      </Card>
    )
  }
  
  if (error && !data) {
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
  const showIntelligence = enableIntelligence && intelligence && 
    !intelligence.loading && 
    !intelligence.error && 
    (intelligence.briefing || (intelligence.incidents && intelligence.incidents.length > 0))
  
  const onRouteCount = intelligence && intelligence.groupedIncidents
    ? intelligence.groupedIncidents.onRoute.length
    : 0
  const routeStateCount = intelligence && intelligence.groupedIncidents
    ? intelligence.groupedIncidents.routeState.length
    : 0
  const offRouteCount = intelligence && intelligence.groupedIncidents
    ? intelligence.groupedIncidents.offRoute.length
    : 0
  
  const relevantCount = onRouteCount + routeStateCount
  
  if (!data && !showIntelligence) return null
  
  const totalBadge = data ? getTotalBadge(data.totalIncidents) : { variant: 'default' as const, label: 'No Data' }
  
  return (
    <>
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
                <RouteIcon className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                <h3 className="text-sm sm:text-base font-bold text-foreground">Route Intelligence</h3>
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
            
            {/* Summary */}
            {intelligence.briefing?.summary && (
              <p className="text-sm sm:text-base text-foreground leading-relaxed mb-3 sm:mb-4">
                {intelligence.briefing.summary}
              </p>
            )}
            
            {/* Risk Score & Incident Count */}
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap mb-3 sm:mb-4">
              <Badge className={`${getRiskBadgeStyle(intelligence.riskScore.level)} border text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-1.5`}>
                {intelligence.riskScore.level.charAt(0).toUpperCase() + intelligence.riskScore.level.slice(1)} Activity
              </Badge>
              <span className="text-xs sm:text-sm text-muted-foreground">
                {onRouteCount} on route, {routeStateCount} in route states
                {offRouteCount > 0 && (
                  <span className="text-muted-foreground/60"> • {offRouteCount} elsewhere</span>
                )}
              </span>
            </div>
            
            {/* Traveler Tips Section */}
            {intelligence.briefing?.for_travelers && (
              <div className="border rounded-lg overflow-hidden mb-3 sm:mb-4">
                <div className="bg-blue-50 dark:bg-blue-950/30 px-3 sm:px-4 py-2.5 sm:py-3 border-b">
                  <div className="flex items-center gap-2">
                    <Car className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                    <h4 className="text-xs sm:text-sm font-medium text-foreground">Travel Advice</h4>
                  </div>
                </div>
                <div className="p-3 sm:p-4">
                  <p className="text-sm sm:text-base font-medium text-foreground mb-2 sm:mb-3">
                    {intelligence.briefing.for_travelers.headline}
                  </p>
                  <ul className="space-y-1.5 sm:space-y-2">
                    {intelligence.briefing.for_travelers.tips.map((tip, i) => (
                      <li key={i} className="text-xs sm:text-sm text-muted-foreground flex items-start gap-2">
                        <span className="text-blue-500 dark:text-blue-400 mt-0.5 flex-shrink-0">•</span>
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                  {intelligence.briefing.for_travelers.best_times && (
                    <div className="mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-border">
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        <strong>Best times:</strong> {intelligence.briefing.for_travelers.best_times}
                      </p>
                    </div>
                  )}
                  {intelligence.briefing.for_travelers.alternatives && intelligence.briefing.for_travelers.alternatives.length > 0 && (
                    <div className="mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-border">
                      <p className="text-xs sm:text-sm font-medium text-muted-foreground mb-1">Alternatives:</p>
                      <ul className="space-y-1">
                        {intelligence.briefing.for_travelers.alternatives.map((alt, i) => (
                          <li key={i} className="text-xs sm:text-sm text-muted-foreground">• {alt}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Route Segments */}
            {intelligence.briefing?.route_segments && intelligence.briefing.route_segments.length > 0 && (
              <div className="border rounded-lg overflow-hidden mb-3 sm:mb-4">
                <div className="bg-muted/30 px-3 sm:px-4 py-2 border-b">
                  <h4 className="text-xs sm:text-sm font-medium text-foreground">Route Segments</h4>
                </div>
                <div className="divide-y divide-border">
                  {intelligence.briefing.route_segments.map((segment, i) => (
                    <div key={i} className="p-2.5 sm:p-3">
                      <div className="flex items-center justify-between mb-1 gap-2 flex-wrap sm:flex-nowrap">
                        <span className="text-xs sm:text-sm font-medium text-foreground break-words">{segment.segment}</span>
                        <Badge 
                          variant={
                            segment.status.includes('safe') ? 'success' :
                            segment.status.includes('elevated') || segment.status.includes('high') ? 'warning' :
                            'default'
                          }
                          className="text-xs px-2 py-0.5 flex-shrink-0"
                        >
                          {segment.status}
                        </Badge>
                      </div>
                      {segment.incidents.length > 0 && (
                        <ul className="mt-1.5 sm:mt-2 space-y-1">
                          {segment.incidents.map((incident, j) => (
                            <li key={j} className="text-xs sm:text-sm text-muted-foreground">• {incident}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Positive Notes */}
            {intelligence.briefing?.positive_notes && intelligence.briefing.positive_notes.length > 0 && (
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-2.5 sm:p-3 mb-3 sm:mb-4">
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                  <div className="space-y-1">
                    {intelligence.briefing.positive_notes.map((note, i) => (
                      <p key={i} className="text-xs sm:text-sm text-green-800 dark:text-green-300">{note}</p>
                    ))}
                  </div>
                </div>
              </div>
            )}
            
            {/* Bottom Line */}
            {intelligence.briefing?.bottom_line && (
              <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-2.5 sm:p-3 mb-3 sm:mb-4">
                <p className="text-xs sm:text-sm text-blue-800 dark:text-blue-300 font-medium">
                  💬 {intelligence.briefing.bottom_line}
                </p>
              </div>
            )}
            
            {/* Incidents Section (Collapsible) */}
            {relevantCount > 0 && intelligence.groupedIncidents && (
              <div className="border rounded-lg overflow-hidden mb-3 sm:mb-4">
                <button
                  onClick={() => setShowAllIncidents(!showAllIncidents)}
                  className="w-full flex items-center justify-between p-3 sm:p-4 hover:bg-gray-50 dark:hover:bg-gray-900/50 transition min-h-[44px] touch-target"
                  aria-label={showAllIncidents ? "Hide incidents" : "Show incidents"}
                >
                  <span className="text-xs sm:text-sm font-medium text-foreground">
                    Recent Incidents ({relevantCount})
                  </span>
                  {showAllIncidents ? (
                    <ChevronUp className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground flex-shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground flex-shrink-0" />
                  )}
                </button>
                
                {showAllIncidents && (
                  <div className="border-t divide-y divide-border">
                    {/* On Route */}
                    {intelligence.groupedIncidents.onRoute.length > 0 && (
                      <div className="p-2 sm:p-3">
                        <p className="text-xs sm:text-sm font-medium text-muted-foreground px-2 sm:px-3 py-1.5 sm:py-2">
                          🛣️ On This Route
                        </p>
                        {intelligence.groupedIncidents.onRoute.map((incident, i) => (
                          <IncidentItem key={i} incident={incident} />
                        ))}
                      </div>
                    )}
                    
                    {/* In Route States */}
                    {intelligence.groupedIncidents.routeState.length > 0 && (
                      <div className="p-2 sm:p-3">
                        <p className="text-xs sm:text-sm font-medium text-muted-foreground px-2 sm:px-3 py-1.5 sm:py-2">
                          📍 In Route States
                        </p>
                        {intelligence.groupedIncidents.routeState.map((incident, i) => (
                          <IncidentItem key={i} incident={incident} />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
            
            {/* Off-Route Note */}
            {offRouteCount > 0 && (
              <div className="flex items-start gap-2 text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4">
                <Info className="w-3 h-3 sm:w-4 sm:h-4 mt-0.5 flex-shrink-0" />
                <p>
                  {offRouteCount} other {offRouteCount === 1 ? 'incident' : 'incidents'} reported off this route (not shown)
                </p>
              </div>
            )}
            
            {/* Methodology Note */}
            <p className="text-[10px] sm:text-xs text-muted-foreground pt-2 sm:pt-3 border-t border-border">
              Intelligence based on verified news reports • Relevance calculated using route corridor analysis
            </p>
          </div>
        </Card>
      )}
      
      {/* Fallback: Raw Reports Section (if intelligence unavailable or disabled) */}
      {(!showIntelligence || intelligence?.fallbackToRaw) && data && (
        <Card className={`border-blue-200 dark:border-blue-800 bg-gradient-to-br from-blue-50/50 to-background dark:from-blue-950/20 dark:to-background overflow-hidden ${className}`} hover={false}>
          <div className="p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Activity className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <h3 className="font-bold text-foreground">LIVE INCIDENT REPORTS</h3>
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
        
            {/* Summary */}
            <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4 flex-wrap">
              <Badge variant={totalBadge.variant} className="text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-1.5">
                {totalBadge.label}
              </Badge>
              <span className="text-xs sm:text-sm text-muted-foreground">
                {data.totalIncidents} {data.totalIncidents === 1 ? 'incident' : 'incidents'} along route (last 14 days)
              </span>
            </div>
            
            {/* Road breakdown */}
            <div className="space-y-2 sm:space-y-3">
              {data.roads.map((road) => {
                const badge = getRoadBadge(road.incidentCount)
                const isExpanded = expandedRoads.has(road.roadId)
                
                return (
                  <div key={road.roadId} className="border border-border rounded-lg overflow-hidden">
                    {/* Road header */}
                    <button
                      onClick={() => toggleRoad(road.roadId)}
                      className="w-full flex items-center justify-between p-2.5 sm:p-3 hover:bg-muted transition text-left min-h-[44px] touch-target"
                      aria-label={isExpanded ? `Collapse ${road.roadName}` : `Expand ${road.roadName}`}
                    >
                      <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                        <span className="text-base sm:text-lg flex-shrink-0">{badge.icon}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs sm:text-sm md:text-base font-medium text-foreground truncate">{road.roadName}</p>
                          <p className="text-[10px] sm:text-xs text-muted-foreground">
                            {road.incidentCount} {road.incidentCount === 1 ? 'incident' : 'incidents'}
                          </p>
                        </div>
                      </div>
                      {road.incidentCount > 0 && (
                        isExpanded ? (
                          <ChevronUp className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground flex-shrink-0 ml-2" />
                        ) : (
                          <ChevronDown className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground flex-shrink-0 ml-2" />
                        )
                      )}
                    </button>
                
                    {/* Expanded articles */}
                    {isExpanded && road.articles.length > 0 && (
                      <div className="border-t border-border bg-muted/30 p-2 sm:p-3">
                        <ul className="space-y-1.5 sm:space-y-2">
                          {road.articles.map((article, index) => (
                            <li key={index}>
                              <a
                                href={article.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-start gap-2 p-2 sm:p-2.5 rounded hover:bg-background transition group min-h-[44px] touch-target"
                              >
                                <AlertTriangle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-orange-500 dark:text-orange-400 mt-0.5 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start gap-1.5 sm:gap-2 flex-wrap">
                                    <p className="text-xs sm:text-sm text-foreground group-hover:text-blue-700 dark:group-hover:text-blue-400 line-clamp-2 flex-1 min-w-0">
                                      {article.title}
                                    </p>
                                    {isBreakingNews(article.seendate) && (
                                      <Badge variant="danger" className="text-[10px] px-1.5 py-0 flex-shrink-0">
                                        BREAKING
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">
                                    {article.domain} • {formatSeenDate(article.seendate)}
                                  </p>
                                </div>
                                <ExternalLink className="h-3 w-3 sm:h-4 sm:w-4 text-gray-300 dark:text-gray-600 group-hover:text-blue-500 flex-shrink-0 mt-0.5" />
                              </a>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
        
            {/* Footer */}
            <div className="flex items-center gap-1.5 sm:gap-2 mt-3 sm:mt-4 pt-2 sm:pt-3 border-t border-border flex-wrap">
              <p className="text-[10px] sm:text-xs text-muted-foreground">
                Based on Nigerian news sources • Updated {formatLastUpdated(data.lastUpdated)}
              </p>
              {data.cached && (
                <span className="text-[10px] sm:text-xs text-muted-foreground/60" title="Data from cache">
                  • Cached
                </span>
              )}
            </div>
          </div>
        </Card>
      )}
    </>
  )
}

