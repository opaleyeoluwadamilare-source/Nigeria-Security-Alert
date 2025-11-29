'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  MapPin, 
  ArrowLeft,
  Phone,
  Share2,
  MessageCircle,
  Twitter,
  Copy,
  Shield,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  Minus,
  Clock,
  Calendar,
  Users,
  Activity,
  Info,
  Home,
  Plane,
  Car,
  X,
  Eye,
  Sparkles
} from 'lucide-react'
import { RiskBadge } from '@/components/ui/RiskBadge'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { useData } from '@/hooks/useData'

type UserContext = 'resident' | 'visitor' | 'transit'

interface Location {
  id: string
  name: string
  state?: string
  type: 'state' | 'lga' | 'city' | 'area'
  risk_level: 'EXTREME' | 'VERY HIGH' | 'HIGH' | 'MODERATE' | 'LOW'
}

interface TieredIntelligence {
  location_id: string
  location_name: string
  state: string
  risk_level: string
  badge: string
  summary?: string
  resident_tips?: string[]
  visitor_advice?: string
  transit_advice?: string
  safer_hours?: string
  emergency_contacts?: string[]
  alternatives?: string[]
  highlights?: string[]
  visitor_tips?: string[]
  welcome_message?: string
}

interface ContextAwareData {
  language_rules: {
    never_use: string[]
    translations: Record<string, string>
  }
  advisory_levels: Record<string, Record<string, string>>
  resident_messages: Record<string, string>
  visitor_messages: Record<string, string>
  transit_messages: Record<string, string>
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] }
  },
}

// Badge system with emojis and colors
const badgeSystem = {
  EXTREME: { emoji: '⛔', text: 'Avoid Travel', color: '#DC2626' },
  "VERY HIGH": { emoji: '⚠️', text: 'High Caution', color: '#EA580C' },
  HIGH: { emoji: '🔔', text: 'Stay Alert', color: '#CA8A04' },
  MODERATE: { emoji: '✅', text: 'Generally Safe', color: '#2563EB' },
  LOW: { emoji: '🟢', text: 'Safe', color: '#16A34A' },
}

const riskColors = {
  EXTREME: { bg: 'bg-[#DC2626]', text: 'text-white', border: 'border-[#DC2626]' },
  "VERY HIGH": { bg: 'bg-[#EA580C]', text: 'text-white', border: 'border-[#EA580C]' },
  HIGH: { bg: 'bg-[#CA8A04]', text: 'text-white', border: 'border-[#CA8A04]' },
  MODERATE: { bg: 'bg-[#2563EB]', text: 'text-white', border: 'border-[#2563EB]' },
  LOW: { bg: 'bg-[#16A34A]', text: 'text-white', border: 'border-[#16A34A]' },
}

// Template generator for locations without tiered data
function getTemplate(riskLevel: string): Partial<TieredIntelligence> {
  const badge = badgeSystem[riskLevel as keyof typeof badgeSystem]
  return {
    badge: `${badge.emoji} ${badge.text}`,
    summary: riskLevel === 'MODERATE' || riskLevel === 'LOW' 
      ? 'Generally safe area with standard precautions advised.'
      : 'Exercise caution. Stay alert and follow safety guidelines.',
  }
}

// Data inheritance function
function getLocationData(
  locationId: string,
  tieredIntelligence: Record<string, Record<string, TieredIntelligence>>,
  locationsComplete: Location[],
  states: any[]
): TieredIntelligence | null {
  // Check each tier for specific data
  const tiers = ['extreme', 'very_high', 'high', 'moderate', 'low']
  for (const tier of tiers) {
    if (tieredIntelligence[tier]?.[locationId]) {
      return tieredIntelligence[tier][locationId]
    }
  }
  
  // Get basic info
  const basic = locationsComplete.find(l => l.id === locationId)
  if (!basic) return null
  
  // Check parent state for context
  let stateData: TieredIntelligence | null = null
  if (basic.state) {
    for (const tier of tiers) {
      if (tieredIntelligence[tier]?.[basic.state]) {
        stateData = tieredIntelligence[tier][basic.state]
        break
      }
    }
  }
  
  // Generate from template
  const template = getTemplate(basic.risk_level)
  return {
    location_id: basic.id,
    location_name: basic.name,
    state: basic.state || '',
    risk_level: basic.risk_level,
    badge: template.badge || `${badgeSystem[basic.risk_level as keyof typeof badgeSystem].emoji} ${badgeSystem[basic.risk_level as keyof typeof badgeSystem].text}`,
    summary: stateData?.summary || template.summary || '',
  }
}

export default function AreaSafetyPage() {
  const params = useParams()
  const router = useRouter()
  const locationId = params['location-id'] as string
  const { states, emergency, loading: dataLoading } = useData()
  const [location, setLocation] = useState<Location | null>(null)
  const [tieredData, setTieredData] = useState<TieredIntelligence | null>(null)
  const [contextData, setContextData] = useState<ContextAwareData | null>(null)
  const [stateData, setStateData] = useState<any>(null)
  const [userContext, setUserContext] = useState<UserContext>('visitor')
  const [showResearchMode, setShowResearchMode] = useState(false)
  const [researchModeConfirmed, setResearchModeConfirmed] = useState(false)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  // Load user context preference from localStorage
  useEffect(() => {
    const savedContext = localStorage.getItem(`context_${locationId}`) as UserContext
    if (savedContext && ['resident', 'visitor', 'transit'].includes(savedContext)) {
      setUserContext(savedContext)
    }
  }, [locationId])

  // Save context preference
  const handleContextChange = (context: UserContext) => {
    setUserContext(context)
    localStorage.setItem(`context_${locationId}`, context)
  }

  useEffect(() => {
    async function loadLocation() {
      try {
        const [locationsRes, tieredRes, contextRes] = await Promise.all([
          fetch('/data/locations-complete.json'),
          fetch('/data/tiered-location-intelligence.json'),
          fetch('/data/context-aware-reporting.json'),
        ])

        const locations: Location[] = await locationsRes.json()
        const tieredIntelligence: Record<string, Record<string, TieredIntelligence>> = await tieredRes.json()
        const contextAwareData: ContextAwareData = await contextRes.json()

        const foundLocation = locations.find(loc => loc.id === locationId)
        
        if (foundLocation) {
          setLocation(foundLocation)
          setContextData(contextAwareData)
          
          // Use data inheritance to get location data
          const locationData = getLocationData(locationId, tieredIntelligence, locations, states)
          if (locationData) {
            setTieredData(locationData)
          }
          
          if (foundLocation.state) {
            const state = states.find(s => s.id === foundLocation.state)
            if (state) setStateData(state)
          } else if (foundLocation.type === 'state') {
            const state = states.find(s => s.id === foundLocation.id)
            if (state) setStateData(state)
          }
        }
      } catch (error) {
        console.error('Error loading location:', error)
      } finally {
        setLoading(false)
      }
    }

    if (locationId && states.length > 0) {
      loadLocation()
    }
  }, [locationId, states])

  const handleShare = (platform: 'whatsapp' | 'twitter' | 'copy') => {
    if (!location || !contextData) return

    const advisoryLevel = contextData.advisory_levels[location.risk_level]?.[userContext] || location.risk_level
    const text = `Safety Report: ${location.name}\n` +
                 `Advisory: ${advisoryLevel}\n` +
                 `Context: ${userContext === 'resident' ? 'Resident' : userContext === 'visitor' ? 'Traveler' : 'Transit'}\n\n` +
                 `Check full details on Nigeria Security Alert`
    const url = window.location.href
    
    if (platform === 'whatsapp') {
      window.open(`https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`, '_blank')
    } else if (platform === 'twitter') {
      window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank')
    } else if (platform === 'copy') {
      navigator.clipboard.writeText(`${text}\n${url}`)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (loading || dataLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-accent border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading location data...</p>
        </div>
      </div>
    )
  }

  if (!location || !contextData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Location Not Found</h1>
          <Link href="/">
            <Button>Go Home</Button>
          </Link>
        </div>
      </div>
    )
  }

  const riskColor = riskColors[location.risk_level]
  const stateName = location.state ? states.find(s => s.id === location.state)?.name : undefined
  const badge = tieredData?.badge || `${badgeSystem[location.risk_level].emoji} ${badgeSystem[location.risk_level].text}`
  const isSafeArea = location.risk_level === 'MODERATE' || location.risk_level === 'LOW'
  const isDangerousArea = location.risk_level === 'EXTREME' || location.risk_level === 'VERY HIGH'
  const advisoryLevel = contextData.advisory_levels[location.risk_level]?.[userContext] || location.risk_level

  // Get context-specific message
  const getContextMessage = () => {
    if (userContext === 'resident') {
      return contextData.resident_messages[location.risk_level] || "Stay safe, stay connected."
    } else if (userContext === 'visitor') {
      return contextData.visitor_messages[location.risk_level] || "Please review travel advisory."
    } else {
      return contextData.transit_messages[location.risk_level] || "Review route safety information."
    }
  }

  // Get page title based on context
  const getPageTitle = () => {
    if (userContext === 'resident') {
      return `Safety Tips for ${location.name}`
    } else if (userContext === 'visitor') {
      return `Travel Advisory: ${location.name}`
    } else {
      return `Route Safety: Through ${location.name}`
    }
  }

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <div className="bg-muted/50 border-b border-border">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Link href="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4 transition-colors">
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm">Back to Home</span>
            </Link>
            
            <h1 className="text-2xl md:text-3xl font-bold mb-4">{getPageTitle()}</h1>

            {/* Context Selector */}
            <div className="mb-4">
              <p className="text-sm font-medium text-muted-foreground mb-2">I am:</p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handleContextChange('resident')}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all ${
                    userContext === 'resident'
                      ? 'bg-accent text-white shadow-md'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  <Home className="w-4 h-4" />
                  I live here
                </button>
                <button
                  onClick={() => handleContextChange('visitor')}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all ${
                    userContext === 'visitor'
                      ? 'bg-accent text-white shadow-md'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  <Plane className="w-4 h-4" />
                  Traveling there
                </button>
                <button
                  onClick={() => handleContextChange('transit')}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all ${
                    userContext === 'transit'
                      ? 'bg-accent text-white shadow-md'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  <Car className="w-4 h-4" />
                  Passing through
                </button>
              </div>
            </div>

            {/* Badge - Prominently displayed */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className={`px-4 py-2 rounded-lg font-bold text-lg ${riskColor.bg} ${riskColor.text} shadow-lg`}>
                {badge}
              </div>
              {stateName && (
                <span className="inline-flex items-center gap-2 text-muted-foreground">
                  <MapPin className="w-4 h-4" />
                  <span>{stateName} State</span>
                </span>
              )}
            </div>
          </motion.div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-6"
        >
          {/* SAFE AREAS - Positive Messaging */}
          {isSafeArea && (
            <>
              {/* Welcome Message */}
              <motion.div variants={itemVariants}>
                <Card hover={false} className={`p-6 md:p-8 border-2 ${riskColor.bg} ${riskColor.text}`}>
                  <div className="text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/20 mb-4">
                      <Sparkles className="w-8 h-8" />
                    </div>
                    <h2 className="text-xl md:text-2xl font-bold mb-2">
                      {tieredData?.welcome_message || `Welcome to ${location.name}!`}
                    </h2>
                    <p className="text-base md:text-lg opacity-95">
                      {tieredData?.summary || 'Enjoy your visit with standard safety awareness.'}
                    </p>
                  </div>
                </Card>
              </motion.div>

              {/* Highlights */}
              {tieredData?.highlights && tieredData.highlights.length > 0 && (
                <motion.div variants={itemVariants}>
                  <Card hover={false} className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <Sparkles className="w-5 h-5 text-accent" />
                      <h3 className="font-bold text-lg">Highlights</h3>
                    </div>
                    <ul className="space-y-2">
                      {tieredData.highlights.map((highlight, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                          <span className="text-sm">{highlight}</span>
                        </li>
                      ))}
                    </ul>
                  </Card>
                </motion.div>
              )}

              {/* Visitor Tips */}
              {userContext === 'visitor' && tieredData?.visitor_tips && tieredData.visitor_tips.length > 0 && (
                <motion.div variants={itemVariants}>
                  <Card hover={false} className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <Info className="w-5 h-5 text-accent" />
                      <h3 className="font-bold text-lg">Tips for Visitors</h3>
                    </div>
                    <ul className="space-y-2">
                      {tieredData.visitor_tips.map((tip, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <CheckCircle className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" />
                          <span className="text-sm">{tip}</span>
                        </li>
                      ))}
                    </ul>
                  </Card>
                </motion.div>
              )}

              {/* Resident Tips */}
              {userContext === 'resident' && tieredData?.resident_tips && tieredData.resident_tips.length > 0 && (
                <motion.div variants={itemVariants}>
                  <Card hover={false} className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <Shield className="w-5 h-5 text-accent" />
                      <h3 className="font-bold text-lg">Daily Safety Tips</h3>
                    </div>
                    <ul className="space-y-2">
                      {tieredData.resident_tips.map((tip, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <CheckCircle className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" />
                          <span className="text-sm">{tip}</span>
                        </li>
                      ))}
                    </ul>
                  </Card>
                </motion.div>
              )}
            </>
          )}

          {/* DANGEROUS AREAS - Helpful Warnings */}
          {isDangerousArea && (
            <>
              {/* Advisory Card */}
              <motion.div variants={itemVariants}>
                <Card hover={false} className={`p-6 md:p-8 border-2 ${riskColor.bg} ${riskColor.text}`}>
                  <div className="text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/20 mb-4">
                      <Shield className="w-8 h-8" />
                    </div>
                    <h2 className="text-xl md:text-2xl font-bold mb-2">
                      {userContext === 'resident' ? '⚠️ Heightened Alert' : 
                       userContext === 'visitor' ? '🔴 Do Not Travel' : 
                       '⚠️ Route Not Recommended'}
                    </h2>
                    <p className="text-base md:text-lg opacity-95">
                      {getContextMessage()}
                    </p>
                  </div>
                </Card>
              </motion.div>

              {/* Resident View - Daily Safety Tips */}
              {userContext === 'resident' && tieredData?.resident_tips && (
                <motion.div variants={itemVariants}>
                  <Card hover={false} className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <Shield className="w-5 h-5 text-accent" />
                      <h3 className="font-bold text-lg">Daily Safety Tips</h3>
                    </div>
                    <ul className="space-y-2">
                      {tieredData.resident_tips.map((tip, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <CheckCircle className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" />
                          <span className="text-sm">{tip}</span>
                        </li>
                      ))}
                    </ul>
                    {tieredData?.safer_hours && (
                      <div className="mt-4 p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                        <p className="text-sm font-medium text-green-700 dark:text-green-400">
                          Best movement times: {tieredData.safer_hours}
                        </p>
                      </div>
                    )}
                  </Card>
                </motion.div>
              )}

              {/* Visitor View */}
              {userContext === 'visitor' && (
                <>
                  {tieredData?.visitor_advice && (
                    <motion.div variants={itemVariants}>
                      <Card hover={false} className="p-6">
                        <div className="flex items-center gap-3 mb-4">
                          <Info className="w-5 h-5 text-accent" />
                          <h3 className="font-bold text-lg">What You Should Know</h3>
                        </div>
                        <p className="text-sm text-foreground leading-relaxed">
                          {tieredData.visitor_advice}
                        </p>
                      </Card>
                    </motion.div>
                  )}

                  {/* Alternatives */}
                  {tieredData?.alternatives && tieredData.alternatives.length > 0 && (
                    <motion.div variants={itemVariants}>
                      <Card hover={false} className="p-6 bg-muted/50">
                        <div className="flex items-center gap-3 mb-4">
                          <MapPin className="w-5 h-5 text-accent" />
                          <h3 className="font-bold text-lg">Travel Alternatives</h3>
                        </div>
                        <ul className="space-y-2">
                          {tieredData.alternatives.map((alt, index) => (
                            <li key={index} className="flex items-start gap-2">
                              <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                              <span className="text-sm">{alt}</span>
                            </li>
                          ))}
                        </ul>
                      </Card>
                    </motion.div>
                  )}
                </>
              )}

              {/* Transit View */}
              {userContext === 'transit' && (
                <>
                  {tieredData?.transit_advice && (
                    <motion.div variants={itemVariants}>
                      <Card hover={false} className="p-6">
                        <div className="flex items-center gap-3 mb-4">
                          <Car className="w-5 h-5 text-accent" />
                          <h3 className="font-bold text-lg">Route Information</h3>
                        </div>
                        <p className="text-sm text-foreground leading-relaxed">
                          {tieredData.transit_advice}
                        </p>
                        {tieredData?.safer_hours && (
                          <div className="mt-4 p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                            <p className="text-sm font-medium text-green-700 dark:text-green-400">
                              Recommended travel times: {tieredData.safer_hours}
                            </p>
                          </div>
                        )}
                      </Card>
                    </motion.div>
                  )}

                  {/* Alternatives */}
                  {tieredData?.alternatives && tieredData.alternatives.length > 0 && (
                    <motion.div variants={itemVariants}>
                      <Card hover={false} className="p-6 bg-muted/50">
                        <div className="flex items-center gap-3 mb-4">
                          <MapPin className="w-5 h-5 text-accent" />
                          <h3 className="font-bold text-lg">Alternative Routes</h3>
                        </div>
                        <ul className="space-y-2">
                          {tieredData.alternatives.map((alt, index) => (
                            <li key={index} className="flex items-start gap-2">
                              <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                              <span className="text-sm">{alt}</span>
                            </li>
                          ))}
                        </ul>
                      </Card>
                    </motion.div>
                  )}
                </>
              )}

              {/* Supportive Message for Residents */}
              {userContext === 'resident' && (
                <motion.div variants={itemVariants}>
                  <Card hover={false} className="p-6 bg-accent/10 border border-accent/20">
                    <p className="text-center font-medium text-foreground">
                      Stay safe, stay connected. We're here to help you navigate daily life safely.
                    </p>
                  </Card>
                </motion.div>
              )}
            </>
          )}

          {/* Emergency Contacts - Always shown */}
          {stateData && stateData.emergencyContacts && (
            <motion.div variants={itemVariants}>
              <Card hover={false} className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Phone className="w-5 h-5 text-risk-extreme" />
                  <h3 className="font-bold text-lg">Emergency Contacts</h3>
                </div>
                
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <a href="tel:112" className="p-4 bg-risk-extreme-bg rounded-xl text-center hover:bg-risk-extreme/20 transition-colors active:scale-95">
                    <p className="text-2xl font-bold font-mono text-risk-extreme">112</p>
                    <p className="text-xs text-muted-foreground">National Emergency</p>
                  </a>
                  <a href="tel:199" className="p-4 bg-muted rounded-xl text-center hover:bg-muted/80 transition-colors active:scale-95">
                    <p className="text-2xl font-bold font-mono">199</p>
                    <p className="text-xs text-muted-foreground">Police</p>
                  </a>
                </div>

                {(stateData.emergencyContacts.police && stateData.emergencyContacts.police.length > 0) || (tieredData?.emergency_contacts && tieredData.emergency_contacts.length > 0) ? (
                  <div className="pt-4 border-t border-border">
                    <p className="text-sm text-muted-foreground mb-3">{stateData.name} State Police Numbers</p>
                    <div className="space-y-2">
                      {(tieredData?.emergency_contacts || stateData.emergencyContacts.police.slice(0, 3)).map((num: string, i: number) => (
                        <a key={i} href={`tel:${num}`} className="flex items-center justify-between p-3 bg-muted rounded-lg hover:bg-muted/80 active:scale-[0.98]">
                          <span className="text-sm">{stateData.name} Police</span>
                          <span className="font-mono font-medium">{num}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                ) : null}
              </Card>
            </motion.div>
          )}

          {/* Share */}
          <motion.div variants={itemVariants}>
            <Card hover={false} className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <Share2 className="w-5 h-5 text-accent" />
                <h3 className="font-bold text-lg">Share This Safety Report</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Help others stay safe - share this location safety information
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
          </motion.div>
        </motion.div>
      </div>
    </div>
  )
}
