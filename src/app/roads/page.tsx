'use client'

import { useState, useMemo, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Route, 
  MapPin, 
  ArrowRight,
  AlertTriangle,
  Phone,
  Train,
  CheckCircle,
  Shield,
  MessageCircle,
  Twitter,
  Copy,
  ChevronDown,
  Info,
  Users,
  Share2,
  TrendingUp
} from 'lucide-react'
import { useData } from '@/hooks/useData'
import { RiskBadge } from '@/components/ui/RiskBadge'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { checkRouteSafety } from '@/lib/route-intelligence'
import { analytics } from '@/lib/analytics'

// Risk level type
type RiskLevel = 'EXTREME' | 'VERY HIGH' | 'HIGH' | 'MODERATE' | 'LOW'

// Type for route result
interface RouteSafetyResult {
  route: string[]
  routeDisplay: string
  overallRisk: RiskLevel
  riskScore: number
  confidence: string
  stateBreakdown: Array<{ id: string; name: string; stateId: string; riskLevel: RiskLevel }>
  highestRiskState: { id: string; name: string; riskLevel: RiskLevel } | null
  dangerousRoads: Array<{ name: string; riskLevel: RiskLevel; dangerZones?: string[]; recommendation?: string }>
  recommendations: {
    primary: string
    alternatives: string[]
    ifMustTravel: string[]
  }
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] }
  },
}


// Default safety tips
const defaultSafetyTips = [
  'Travel only between 7AM - 4PM',
  'Travel in convoy if possible (3+ vehicles)',
  'Share trip details with family before departure',
  'Keep emergency numbers saved and accessible',
  'Avoid stopping in isolated areas',
  'Keep doors locked and windows up',
]

function RoadsPageContent() {
  const { states, roads, loading } = useData()
  const searchParams = useSearchParams()
  const [selectedFrom, setSelectedFrom] = useState('')
  const [selectedTo, setSelectedTo] = useState('')
  const [showResult, setShowResult] = useState(false)
  const [copied, setCopied] = useState(false)
  const [routeResult, setRouteResult] = useState<RouteSafetyResult | null>(null)
  const [loadingRoute, setLoadingRoute] = useState(false)
  const [routeError, setRouteError] = useState<string | null>(null)

  // Get unique locations for dropdowns - states sorted alphabetically
  const locations = Array.isArray(states) && states.length > 0
    ? states.filter(s => s && s.id && s.name).map(s => ({ id: s.id, name: s.name })).sort((a, b) => a.name.localeCompare(b.name))
    : []

  // Check for URL parameters on mount
  useEffect(() => {
    const fromParam = searchParams.get('from')
    const toParam = searchParams.get('to')
    if (fromParam && toParam && Array.isArray(states) && states.length > 0) {
      setSelectedFrom(fromParam)
      setSelectedTo(toParam)
      handleCheckRoute(fromParam, toParam)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, states.length])

  const handleCheckRoute = async (from?: string, to?: string) => {
    const fromState = from || selectedFrom
    const toState = to || selectedTo
    
    if (!fromState || !toState || fromState === toState) {
      return
    }

    setLoadingRoute(true)
    setShowResult(false)
    setRouteResult(null)
    setRouteError(null) // Clear previous errors

    try {
      const result = await checkRouteSafety(fromState, toState)
      if (result && typeof result === 'object' && !('error' in result)) {
        const routeResult = result as RouteSafetyResult
        setRouteResult(routeResult)
        setShowResult(true)
        setRouteError(null)
        // Track route check
        analytics.trackRouteCheck(fromState, toState, routeResult.overallRisk)
      } else {
        // Show user-friendly error message
        const fromStateName = Array.isArray(states) 
          ? (states.find(s => s && s.id === fromState)?.name || fromState)
          : fromState
        const toStateName = Array.isArray(states)
          ? (states.find(s => s && s.id === toState)?.name || toState)
          : toState
        setRouteError(`Unable to find a route from ${fromStateName} to ${toStateName}. The states may not be connected, or there may be insufficient routing data.`)
      }
    } catch (error) {
      console.error('Error checking route:', error)
      const fromStateName = Array.isArray(states)
        ? (states.find(s => s && s.id === fromState)?.name || fromState)
        : fromState
      const toStateName = Array.isArray(states)
        ? (states.find(s => s && s.id === toState)?.name || toState)
        : toState
      setRouteError(`An error occurred while checking the route from ${fromStateName} to ${toStateName}. Please try again.`)
    } finally {
      setLoadingRoute(false)
    }
  }

  const handleCopyLink = () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(window.location.href)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      } else {
        // Fallback for older browsers
        const textArea = document.createElement('textarea')
        textArea.value = window.location.href
        document.body.appendChild(textArea)
        textArea.select()
        document.execCommand('copy')
        document.body.removeChild(textArea)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }
    } catch (error) {
      console.error('Failed to copy link:', error)
    }
  }

  const handleShare = (platform: 'whatsapp' | 'twitter' | 'copy') => {
    if (!routeResult) return

    try {
      const fromState = Array.isArray(states) ? states.find(s => s && s.id === selectedFrom) : null
      const toState = Array.isArray(states) ? states.find(s => s && s.id === selectedTo) : null
      const riskText = routeResult.overallRisk === 'EXTREME' ? 'EXTREME RISK' :
                       routeResult.overallRisk === 'VERY HIGH' ? 'VERY HIGH RISK' :
                       routeResult.overallRisk === 'HIGH' ? 'HIGH RISK' : 'MODERATE RISK'
      
      const text = `Route Safety Check: ${fromState?.name || selectedFrom} → ${toState?.name || selectedTo}\n` +
                   `Risk Level: ${riskText}\n` +
                   `Risk Score: ${routeResult.riskScore || 0}/100\n` +
                   `Route: ${routeResult.routeDisplay || 'N/A'}\n\n` +
                   `Check full details on Nigeria Security Alert`
      const url = window.location.href
      
      if (platform === 'whatsapp') {
        window.open(`https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`, '_blank')
      } else if (platform === 'twitter') {
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank')
      } else if (platform === 'copy') {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(`${text}\n${url}`).then(() => {
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
          }).catch(() => {
            // Fallback
            const textArea = document.createElement('textarea')
            textArea.value = `${text}\n${url}`
            document.body.appendChild(textArea)
            textArea.select()
            document.execCommand('copy')
            document.body.removeChild(textArea)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
          })
        } else {
          const textArea = document.createElement('textarea')
          textArea.value = `${text}\n${url}`
          document.body.appendChild(textArea)
          textArea.select()
          document.execCommand('copy')
          document.body.removeChild(textArea)
          setCopied(true)
          setTimeout(() => setCopied(false), 2000)
        }
      }
    } catch (error) {
      console.error('Error sharing route:', error)
    }
  }

  return (
    <div className="min-h-screen pb-20 w-full overflow-x-hidden">
      {/* Header */}
      <div className="bg-accent/5 border-b border-border">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-accent/10 mb-4">
              <Route className="w-8 h-8 text-accent" />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold mb-2">Route Safety Checker</h1>
            <p className="text-muted-foreground">
              Check if your route is safe before you travel
            </p>
          </motion.div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Route Selector */}
          <motion.div variants={itemVariants}>
            <Card hover={false} className="p-6 md:p-8">
              <div className="space-y-4">
                {/* From */}
                <div>
                  <label className="block text-sm font-medium mb-2">From</label>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <select
                      value={selectedFrom}
                      onChange={(e) => {
                        setSelectedFrom(e.target.value)
                        setShowResult(false)
                        setRouteError(null)
                      }}
                      style={{ fontSize: '16px' }} // Prevents zoom on iOS Safari
                      className="w-full h-14 pl-12 pr-10 bg-background border-2 border-border rounded-xl appearance-none focus:border-accent focus:outline-none text-lg"
                    >
                      <option value="">Select starting point</option>
                      {locations.map(loc => (
                        <option key={loc.id} value={loc.id}>{loc.name}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
                  </div>
                </div>

                {/* Arrow */}
                <div className="flex justify-center">
                  <motion.div
                    animate={{ y: [0, 4, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="w-10 h-10 rounded-full bg-muted flex items-center justify-center"
                  >
                    <ArrowRight className="w-5 h-5 text-muted-foreground rotate-90" />
                  </motion.div>
                </div>

                {/* To */}
                <div>
                  <label className="block text-sm font-medium mb-2">To</label>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <select
                      value={selectedTo}
                      onChange={(e) => {
                        setSelectedTo(e.target.value)
                        setShowResult(false)
                        setRouteError(null)
                      }}
                      style={{ fontSize: '16px' }} // Prevents zoom on iOS Safari
                      className="w-full h-14 pl-12 pr-10 bg-background border-2 border-border rounded-xl appearance-none focus:border-accent focus:outline-none text-lg"
                    >
                      <option value="">Select destination</option>
                      {locations.map(loc => (
                        <option key={loc.id} value={loc.id}>{loc.name}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
                  </div>
                </div>

                {/* Check Button */}
                <Button 
                  size="lg" 
                  className="w-full h-14 text-lg gap-2 mt-4"
                  disabled={!selectedFrom || !selectedTo || selectedFrom === selectedTo || loadingRoute}
                  onClick={() => handleCheckRoute()}
                >
                  <Shield className="w-5 h-5" />
                  {loadingRoute ? 'Checking Route...' : 'Check Route Safety'}
                </Button>
              </div>
            </Card>
          </motion.div>

          {/* Results */}
          <AnimatePresence>
            {loadingRoute && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="mt-8"
              >
                <Card hover={false} className="p-8 text-center">
                  <div className="animate-spin w-8 h-8 border-4 border-accent border-t-transparent rounded-full mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Analyzing route safety...</p>
                </Card>
              </motion.div>
            )}

            {/* Error Message */}
            {routeError && !loadingRoute && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="mt-8"
              >
                <Card hover={false} className="p-6 md:p-8 border-2 border-orange-500 bg-orange-50 dark:bg-orange-950/20">
                  <div className="flex items-start gap-4">
                    <AlertTriangle className="w-6 h-6 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h3 className="font-bold text-lg mb-2 text-orange-900 dark:text-orange-100">
                        Route Not Available
                      </h3>
                      <p className="text-sm text-orange-800 dark:text-orange-200 mb-4">
                        {routeError}
                      </p>
                      <div className="flex flex-wrap gap-3">
                        <Button
                          variant="secondary"
                          onClick={() => {
                            setRouteError(null)
                            setSelectedFrom('')
                            setSelectedTo('')
                            setShowResult(false)
                          }}
                          className="gap-2"
                        >
                          Try Another Route
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() => setRouteError(null)}
                        >
                          Dismiss
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            )}

            {showResult && routeResult && !loadingRoute && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="mt-8 space-y-6"
              >
                {/* Route Header */}
                <Card hover={false} className={`p-6 md:p-8 border-2 ${
                  routeResult.overallRisk === 'EXTREME' ? 'border-risk-extreme bg-risk-extreme-bg/50' :
                  routeResult.overallRisk === 'VERY HIGH' ? 'border-risk-very-high bg-risk-very-high-bg/50' :
                  routeResult.overallRisk === 'HIGH' ? 'border-risk-high bg-risk-high-bg/50' :
                  'border-risk-moderate bg-risk-moderate-bg/50'
                }`}>
                  <div className="text-center mb-6">
                    <RiskBadge level={routeResult.overallRisk} size="lg" />
                    <h2 className="text-2xl md:text-3xl font-bold mt-4 mb-2">
                      ROUTE: {routeResult.routeDisplay || 'Unknown Route'}
                    </h2>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-border/50">
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground mb-1">Risk Score</p>
                      <p className="text-3xl font-bold font-mono">{routeResult.riskScore || 0}/100</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground mb-1">Confidence</p>
                      <p className="text-lg font-semibold uppercase">{routeResult.confidence || 'UNKNOWN'}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground mb-1">States</p>
                      <p className="text-lg font-semibold">{Array.isArray(routeResult.stateBreakdown) ? routeResult.stateBreakdown.length : 0}</p>
                    </div>
                  </div>
                </Card>

                {/* State-by-State Breakdown */}
                {Array.isArray(routeResult.stateBreakdown) && routeResult.stateBreakdown.length > 0 && (
                  <Card hover={false} className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <MapPin className="w-5 h-5 text-accent" />
                      <h3 className="font-bold">STATE-BY-STATE:</h3>
                    </div>
                    <div className="space-y-2">
                      {routeResult.stateBreakdown.map((state) => {
                        if (!state || !state.id) return null
                        const isHighestRisk = routeResult.highestRiskState?.id === state.id
                        return (
                          <Link
                            key={state.id}
                            href={`/location/${state.id}`}
                            className="flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors group"
                          >
                            <div className="flex items-center gap-3">
                              <span className="text-muted-foreground">•</span>
                              <span className="font-medium">{state.name || state.id}</span>
                              {state.riskLevel && (
                                <RiskBadge level={state.riskLevel as RiskLevel} size="sm" />
                              )}
                              {isHighestRisk && (
                                <span className="text-xs text-muted-foreground italic">← Highest risk</span>
                              )}
                            </div>
                            <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                          </Link>
                        )
                      })}
                    </div>
                  </Card>
                )}

                {/* Dangerous Roads */}
                {Array.isArray(routeResult.dangerousRoads) && routeResult.dangerousRoads.length > 0 && (
                  <Card hover={false} className="p-6 border-2 border-risk-extreme bg-risk-extreme-bg/30">
                    <div className="flex items-center gap-3 mb-4">
                      <AlertTriangle className="w-5 h-5 text-risk-extreme" />
                      <h3 className="font-bold">KNOWN DANGEROUS ROAD ON THIS ROUTE:</h3>
                    </div>
                    <div className="space-y-4">
                      {routeResult.dangerousRoads.map((road, index) => {
                        if (!road || !road.name) return null
                        return (
                          <div key={index} className="p-4 bg-background rounded-lg border border-risk-extreme/20">
                            <div className="flex items-center gap-3 mb-2">
                              <span className="font-medium">{road.name}</span>
                              {road.riskLevel && (
                                <RiskBadge level={road.riskLevel as RiskLevel} size="sm" />
                              )}
                            </div>
                            {Array.isArray(road.dangerZones) && road.dangerZones.length > 0 && (
                              <p className="text-sm text-muted-foreground mb-2">
                                Danger zones: {road.dangerZones.filter(z => z && typeof z === 'string').join(', ')}
                              </p>
                            )}
                            {road.recommendation && typeof road.recommendation === 'string' && (
                              <p className="text-sm font-medium text-risk-extreme">
                                Recommended: {road.recommendation}
                              </p>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </Card>
                )}

                {/* Recommendations */}
                {routeResult.recommendations && (
                  <Card hover={false} className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <Shield className="w-5 h-5 text-accent" />
                      <h3 className="font-bold">RECOMMENDATIONS:</h3>
                    </div>
                    <div className="space-y-4">
                      {routeResult.recommendations.primary && typeof routeResult.recommendations.primary === 'string' && (
                        <div>
                          <p className="font-medium mb-2">{routeResult.recommendations.primary}</p>
                        </div>
                      )}
                      
                      {Array.isArray(routeResult.recommendations.alternatives) && routeResult.recommendations.alternatives.length > 0 && (
                        <div>
                          <p className="text-sm font-medium text-muted-foreground mb-2">Alternatives:</p>
                          <ul className="space-y-2">
                            {routeResult.recommendations.alternatives.filter(alt => alt && typeof alt === 'string').map((alt, index) => (
                              <li key={index} className="flex items-start gap-2">
                                <CheckCircle className="w-4 h-4 text-risk-moderate flex-shrink-0 mt-0.5" />
                                <span className="text-sm">{alt}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {Array.isArray(routeResult.recommendations.ifMustTravel) && routeResult.recommendations.ifMustTravel.length > 0 && (
                        <div>
                          <p className="text-sm font-medium text-muted-foreground mb-2">If you must travel:</p>
                          <ul className="space-y-2">
                            {routeResult.recommendations.ifMustTravel.filter(tip => tip && typeof tip === 'string').map((tip, index) => (
                              <li key={index} className="flex items-start gap-2">
                                <CheckCircle className="w-4 h-4 text-risk-moderate flex-shrink-0 mt-0.5" />
                                <span className="text-sm">{tip}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </Card>
                )}

                {/* Methodology */}
                <Card hover={false} className="p-6 bg-muted/50">
                  <div className="flex items-center gap-3 mb-2">
                    <Info className="w-5 h-5 text-muted-foreground" />
                    <h3 className="font-bold text-sm">METHODOLOGY:</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Risk calculated based on state risk levels, known dangerous roads, and verified incident data.
                  </p>
                </Card>

                {/* Share */}
                <Card hover={false} className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <Share2 className="w-5 h-5 text-accent" />
                    <h3 className="font-bold">Share This Route Check</h3>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    Help others stay safe - share this route safety information
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <Button variant="secondary" className="gap-2" onClick={() => handleShare('whatsapp')}>
                      <MessageCircle className="w-4 h-4" />
                      WhatsApp
                    </Button>
                    <Button variant="secondary" className="gap-2" onClick={() => handleShare('twitter')}>
                      <Twitter className="w-4 h-4" />
                      Twitter
                    </Button>
                    <Button variant="secondary" className="gap-2" onClick={() => handleShare('copy')}>
                      <Copy className="w-4 h-4" />
                      {copied ? 'Copied!' : 'Copy'}
                    </Button>
                  </div>
                </Card>

                {/* Check Another Route */}
                <div className="text-center">
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setShowResult(false)
                      setSelectedFrom('')
                      setSelectedTo('')
                      setRouteError(null)
                    }}
                  >
                    Check Another Route
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Popular Routes - when no result shown */}
          {!showResult && !loadingRoute && !routeError && (
            <motion.div variants={itemVariants} className="mt-8">
              <h2 className="text-xl font-bold mb-4">Dangerous Routes</h2>
              {loading ? (
                <p className="text-muted-foreground">Loading routes...</p>
              ) : (
                <div className="space-y-3">
                  {Array.isArray(roads) && roads.length > 0 ? (
                    roads.slice(0, 6).map((road) => {
                      if (!road || !road.slug) return null
                      return (
                        <Link key={road.slug} href={`/road/${road.slug}`}>
                          <Card className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-1 flex-wrap">
                                  <span className="font-medium">{road.name || 'Unknown Road'}</span>
                                  {road.riskLevel && (
                                    <RiskBadge level={road.riskLevel as RiskLevel} size="sm" />
                                  )}
                                </div>
                                {Array.isArray(road.states) && road.states.length > 0 && (
                                  <p className="text-sm text-muted-foreground">
                                    {road.states.filter(s => s && typeof s === 'string').join(' → ')}
                                  </p>
                                )}
                              </div>
                              <ArrowRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                            </div>
                          </Card>
                        </Link>
                      )
                    })
                  ) : (
                    <p className="text-muted-foreground">No dangerous routes data available.</p>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  )
}

export default function RoadsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-accent border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading route checker...</p>
        </div>
      </div>
    }>
      <RoadsPageContent />
    </Suspense>
  )
}
