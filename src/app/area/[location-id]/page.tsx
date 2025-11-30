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
  Train,
  Car,
  X,
  Eye,
  Star
} from 'lucide-react'
import { RiskBadge } from '@/components/ui/RiskBadge'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Logo } from '@/components/ui/Logo'
import { LocationIcon } from '@/components/ui/LocationIcon'
import { useData } from '@/hooks/useData'
import { 
  lookupLocationIntelligence, 
  CombinedLocationData,
  Location as LocationType,
  DetailedLocationIntelligence,
  TieredLocationIntelligence
} from '@/lib/location-intelligence'
import { analytics } from '@/lib/analytics'

type UserContext = 'resident' | 'visitor' | 'transit'

interface Location {
  id: string
  name: string
  state?: string
  type: 'state' | 'lga' | 'city' | 'area' | 'institution' | 'market' | 'tourist' | 'airport' | 'industrial'
  risk_level: 'EXTREME' | 'VERY HIGH' | 'HIGH' | 'MODERATE' | 'LOW'
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
  MODERATE: { emoji: '✅', text: 'Generally Safe', color: '#10b981' },
  LOW: { emoji: '🟢', text: 'Safe', color: '#22c55e' },
}

const riskColors = {
  EXTREME: { 
    bg: 'bg-[#DC2626]', 
    text: 'text-white', 
    border: 'border-[#DC2626]',
    borderColor: '#DC2626',
    gradient: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 50%, #991b1b 100%)'
  },
  "VERY HIGH": { 
    bg: 'bg-[#EA580C]', 
    text: 'text-white', 
    border: 'border-[#EA580C]',
    borderColor: '#EA580C',
    gradient: 'linear-gradient(135deg, #ea580c 0%, #c2410c 50%, #9a3412 100%)'
  },
  HIGH: { 
    bg: 'bg-[#CA8A04]', 
    text: 'text-white', 
    border: 'border-[#CA8A04]',
    borderColor: '#CA8A04',
    gradient: 'linear-gradient(135deg, #ca8a04 0%, #a16207 50%, #854d0e 100%)'
  },
  MODERATE: { 
    bg: 'bg-[#10b981]', 
    text: 'text-white', 
    border: 'border-[#059669]',
    borderColor: '#059669',
    gradient: 'linear-gradient(135deg, #10b981 0%, #059669 50%, #047857 100%)'
  },
  LOW: { 
    bg: 'bg-[#22c55e]', 
    text: 'text-white', 
    border: 'border-[#16a34a]',
    borderColor: '#16a34a',
    gradient: 'linear-gradient(135deg, #22c55e 0%, #16a34a 50%, #15803d 100%)'
  },
}

// Template generator for locations without tiered data
function getTemplate(riskLevel: string, locationName?: string): Partial<TieredLocationIntelligence> & { summary: string } {
  const badge = badgeSystem[riskLevel as keyof typeof badgeSystem] || badgeSystem.MODERATE
  const locationText = locationName || 'this area'
  const baseTemplate: Partial<TieredLocationIntelligence> & { summary: string } = {
    badge: `${badge.emoji} ${badge.text}`,
    summary: `This area has ${riskLevel.toLowerCase()} security risks. Standard precautions advised.`,
    recommendations: ['Stay aware of your surroundings.', 'Keep emergency contacts accessible.'],
    travel_advice: {
      primary: 'Standard precautions',
      details: 'Stay alert and aware of your surroundings.'
    },
    welcome_message: `Welcome to ${locationText}!`,
    highlights: ['Local attractions', 'Cultural sites'],
    visitor_tips: ['Use standard safety practices', 'Stay informed'],
    resident_tips: ['Continue normal activities', 'Stay informed'],
    transit_tips: ['Plan your route', 'Standard precautions'],
    if_break_down: ['Call emergency services if needed', 'Standard procedures apply']
  }

  if (riskLevel === 'EXTREME') {
    baseTemplate.summary = 'This area is experiencing extreme security challenges. Avoid all non-essential travel.'
    baseTemplate.travel_advice = {
      primary: 'DO NOT TRAVEL',
      details: 'Avoid all non-essential travel. Active conflict zone. If travel is essential, arrange security escort.'
    }
    baseTemplate.recommendations = [
      'Strongly consider alternative routes or transportation.',
      'If travel is essential, arrange security escort.',
      'Inform family of travel plans and check-in times.',
      'Travel only in convoy during daylight hours (7AM-11AM).',
      'Keep emergency contacts saved and accessible.'
    ]
    baseTemplate.welcome_message = locationName ? `${locationName} is currently under extreme alert.` : 'This area is currently under extreme alert.'
    baseTemplate.resident_welcome = locationName ? `Heightened Alert: ${locationName}` : 'Heightened Alert'
    baseTemplate.visitor_welcome = locationName ? `Do Not Travel: ${locationName}` : 'Do Not Travel'
    baseTemplate.transit_welcome = locationName ? `Route Safety: Through ${locationName}` : 'Route Safety'
    baseTemplate.visitor_tips = ['Avoid completely', 'Seek military escort if essential']
    baseTemplate.resident_tips = ['Stay indoors during high-risk hours', 'Maintain communication with community leaders']
    baseTemplate.transit_tips = ['Avoid passing through', 'Seek alternative routes']
    baseTemplate.if_break_down = ['Stay in your vehicle', 'Call emergency services immediately', 'Do not exit vehicle until help arrives']
  } else if (riskLevel === 'VERY HIGH') {
    baseTemplate.summary = 'This area has very high security risks. Essential travel only.'
    baseTemplate.travel_advice = {
      primary: 'RECONSIDER TRAVEL',
      details: 'Essential travel only. High kidnapping/attack risk. Exercise extreme caution if travel is unavoidable.'
    }
    baseTemplate.recommendations = [
      'Travel only if absolutely necessary.',
      'Travel during daylight hours only (7AM-4PM).',
      'Travel in convoy when possible.',
      'Share your travel itinerary with family.',
      'Keep emergency numbers ready.'
    ]
    baseTemplate.welcome_message = locationName ? `${locationName} requires very high caution.` : 'This area requires very high caution.'
    baseTemplate.resident_welcome = locationName ? `Heightened Alert: ${locationName}` : 'Heightened Alert'
    baseTemplate.visitor_welcome = locationName ? `High Caution: ${locationName}` : 'High Caution'
    baseTemplate.transit_welcome = locationName ? `Route Safety: Through ${locationName}` : 'Route Safety'
    baseTemplate.visitor_tips = ['Travel with local guides', 'Avoid isolated areas']
    baseTemplate.resident_tips = ['Be vigilant at all times', 'Secure your home and property']
    baseTemplate.transit_tips = ['Do not stop unnecessarily', 'Ensure vehicle is in good condition']
    baseTemplate.if_break_down = ['Stay in your vehicle', 'Call emergency services immediately', 'Keep doors locked']
  } else if (riskLevel === 'HIGH') {
    baseTemplate.summary = 'This area has high security concerns. Exercise extreme caution.'
    baseTemplate.travel_advice = {
      primary: 'EXERCISE CAUTION',
      details: 'Exercise extreme caution. Significant security concerns. Travel with caution and stay alert.'
    }
    baseTemplate.recommendations = [
      'Be vigilant throughout your journey.',
      'Avoid traveling at night.',
      'Keep valuables out of sight.',
      'Stay on main roads.',
      'Have emergency contacts ready.'
    ]
    baseTemplate.welcome_message = locationName ? `${locationName} requires heightened awareness.` : 'This area requires heightened awareness.'
    baseTemplate.resident_welcome = locationName ? `Safety Tips for ${locationName}` : 'Safety Tips'
    baseTemplate.visitor_welcome = locationName ? `Travel Advisory: ${locationName}` : 'Travel Advisory'
    baseTemplate.transit_welcome = locationName ? `Route Safety: Through ${locationName}` : 'Route Safety'
    baseTemplate.highlights = ['Local markets', 'Cultural sites']
    baseTemplate.visitor_tips = ['Stay in reputable accommodations', 'Inform someone of your whereabouts']
    baseTemplate.resident_tips = ['Vary your routine', 'Enhance home security']
    baseTemplate.transit_tips = ['Avoid shortcuts', 'Travel with a full tank of fuel']
    baseTemplate.if_break_down = ['Stay in your vehicle', 'Call emergency services', 'Keep windows up']
  } else if (riskLevel === 'MODERATE') {
    baseTemplate.summary = 'This area has moderate security risks. Standard precautions advised.'
    baseTemplate.travel_advice = {
      primary: 'STANDARD PRECAUTIONS ADVISED',
      details: 'Normal travel with standard precautions. Stay alert.'
    }
    baseTemplate.recommendations = [
      'Stay aware of your surroundings.',
      'Avoid isolated areas, especially at night.',
      'Keep emergency contacts accessible.',
      'Follow local news for updates.'
    ]
    baseTemplate.welcome_message = locationName ? `Welcome to ${locationName}!` : 'Welcome to this generally safe area!'
    baseTemplate.resident_welcome = locationName ? `Safety Tips for ${locationName}` : 'Safety Tips'
    baseTemplate.visitor_welcome = locationName ? `Travel Advisory: ${locationName}` : 'Travel Advisory'
    baseTemplate.transit_welcome = locationName ? `Route Safety: Through ${locationName}` : 'Route Safety'
    baseTemplate.highlights = ['Local markets', 'Cultural sites', 'Tourist attractions']
    baseTemplate.visitor_tips = ['Use ride-hailing apps', 'Travel in groups when possible']
    baseTemplate.resident_tips = ['Join community watch', 'Report suspicious activity']
    baseTemplate.transit_tips = ['Plan your route in advance', 'Avoid night travel when possible']
    baseTemplate.if_break_down = ['Stay in your vehicle', 'Call emergency services', 'Wait in well-lit area']
  } else if (riskLevel === 'LOW') {
    baseTemplate.summary = 'This area has low security risks. Normal safety awareness.'
    baseTemplate.travel_advice = {
      primary: 'NORMAL SAFETY AWARENESS',
      details: 'No specific travel concerns. Maintain general awareness.'
    }
    baseTemplate.recommendations = [
      'Maintain general safety awareness.',
      'Follow standard travel practices.',
      'Keep emergency contacts accessible.'
    ]
    baseTemplate.welcome_message = locationName ? `Welcome to ${locationName}!` : 'Welcome to this safe area!'
    baseTemplate.resident_welcome = locationName ? `Safety Tips for ${locationName}` : 'Safety Tips'
    baseTemplate.visitor_welcome = locationName ? `Travel Advisory: ${locationName}` : 'Travel Advisory'
    baseTemplate.transit_welcome = locationName ? `Route Safety: Through ${locationName}` : 'Route Safety'
    baseTemplate.highlights = ['Local attractions', 'Cultural sites', 'Tourist destinations']
    baseTemplate.visitor_tips = ['Enjoy your visit', 'Explore safely']
    baseTemplate.resident_tips = ['Continue normal activities', 'Stay informed']
    baseTemplate.transit_tips = ['Safe to travel', 'Standard precautions']
    baseTemplate.if_break_down = ['Call emergency services if needed', 'Standard breakdown procedures apply']
  }

  return baseTemplate
}

export default function AreaSafetyPage() {
  const params = useParams()
  const router = useRouter()
  const locationId = params['location-id'] as string
  const { states, emergency } = useData()
  const [location, setLocation] = useState<Location | null>(null)
  const [locationData, setLocationData] = useState<CombinedLocationData | null>(null)
  const [contextData, setContextData] = useState<ContextAwareData | null>(null)
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
    analytics.trackContextChange(context, locationId)
  }

  useEffect(() => {
    let isMounted = true // Flag to prevent state updates if component unmounts
    
    async function loadLocation() {
      try {
        setLoading(true)
        
        // Load all required data files - MERGE BOTH LOCATION FILES like search bar does
        const [finalRes, completeRes, detailedRes, tieredRes, contextRes] = await Promise.all([
          fetch('/data/locations-final-1098.json'),
          fetch('/data/locations-complete.json'),
          fetch('/data/detailed-location-intelligence.json'),
          fetch('/data/tiered-location-intelligence.json'),
          fetch('/data/context-aware-reporting.json'),
        ])
        
        // Check if component is still mounted
        if (!isMounted) return

        // Check critical files
        if (!finalRes.ok) {
          throw new Error(`Failed to load locations-final-1098.json: ${finalRes.status}`)
        }
        if (!detailedRes.ok) {
          throw new Error(`Failed to load detailed-location-intelligence.json: ${detailedRes.status}`)
        }
        if (!tieredRes.ok) {
          throw new Error(`Failed to load tiered-location-intelligence.json: ${tieredRes.status}`)
        }
        if (!contextRes.ok) {
          throw new Error(`Failed to load context-aware-reporting.json: ${contextRes.status}`)
        }

        // Parse JSON responses
        const finalResponse = await finalRes.json()
        const detailedIntelligence: DetailedLocationIntelligence = await detailedRes.json()
        const tieredIntelligence: Record<string, Record<string, TieredLocationIntelligence>> = await tieredRes.json()
        const contextAwareData: ContextAwareData = await contextRes.json()

        // Handle both old format (array) and new format (object with locations array)
        const finalLocations = Array.isArray(finalResponse) 
          ? finalResponse 
          : finalResponse.locations || []
        
        // Try to load complete file, but don't fail if it doesn't exist
        let completeLocations: LocationType[] = []
        if (completeRes.ok) {
          try {
            const completeResponse = await completeRes.json()
            completeLocations = Array.isArray(completeResponse) 
              ? completeResponse 
              : completeResponse.locations || []
          } catch (e) {
            console.warn('Could not parse locations-complete.json, continuing with final-1098 only:', e)
          }
        } else {
          console.warn('locations-complete.json not found or failed to load, using only locations-final-1098.json')
        }
        
        // MERGE locations: use final-1098 as base, add any unique locations from complete
        const locationMap = new Map<string, LocationType>()
        
        // First, add all locations from final-1098 (these take priority)
        finalLocations.forEach((loc: LocationType) => {
          if (loc && loc.id && loc.name) {
            locationMap.set(loc.id, loc)
          }
        })
        
        // Then, add locations from complete that don't exist in final
        completeLocations.forEach((loc: LocationType) => {
          if (loc && loc.id && loc.name && !locationMap.has(loc.id)) {
            locationMap.set(loc.id, loc)
          }
        })
        
        // Convert map back to array
        const mergedLocations: LocationType[] = Array.from(locationMap.values())

        // Find location in merged locations
        const foundLocation = mergedLocations.find(
          loc => loc.id.toLowerCase().trim() === locationId.toLowerCase().trim()
        )
        
        if (!foundLocation) {
          console.warn(`Location ${locationId} not found in merged locations`)
          setLoading(false)
          return
        }

        // Convert to Location interface for compatibility
        const location: Location = {
          id: foundLocation.id,
          name: foundLocation.name,
          state: foundLocation.state,
          type: foundLocation.type,
          risk_level: foundLocation.risk_level,
        }

        setLocation(location)
        setContextData(contextAwareData)
        
        // Use the new lookup function with MERGED locations
        const combinedData = lookupLocationIntelligence(
          locationId,
          mergedLocations,  // Use merged locations instead of just complete
          detailedIntelligence,
          tieredIntelligence
        )
        
        if (!isMounted) return
        
        if (combinedData) {
          setLocationData(combinedData)
        } else {
          console.warn(`Could not generate location data for ${locationId}, using template fallback`)
          // Generate fallback data using template system for useful default content
          if (foundLocation && isMounted) {
            const template = getTemplate(foundLocation.risk_level, foundLocation.name)
            setLocationData({
              location_id: foundLocation.id,
              location_name: foundLocation.name,
              state: foundLocation.state || '',
              type: foundLocation.type,
              risk_level: foundLocation.risk_level,
              badge: `${badgeSystem[foundLocation.risk_level as keyof typeof badgeSystem]?.emoji || '⚠️'} ${badgeSystem[foundLocation.risk_level as keyof typeof badgeSystem]?.text || 'Unknown'}`,
              summary: template.summary,
              key_threats: template.key_threats || [],
              safer_zones: template.safer_zones || [],
              danger_zones: template.danger_zones || [],
              resident_tips: template.resident_tips || [],
              visitor_tips: template.visitor_tips || [],
              transit_tips: template.transit_tips || [],
              if_you_must_go: template.recommendations || [],
              travel_windows: template.travel_advice ? {
                safest: template.travel_advice.details,
                avoid: template.travel_advice.primary.includes('AVOID') ? template.travel_advice.primary : undefined,
              } : undefined,
              // Add welcome messages for context
              resident_welcome: template.resident_welcome,
              visitor_welcome: template.visitor_welcome,
              transit_welcome: template.transit_welcome,
              highlights: template.highlights || [],
            })
          }
        }
      } catch (error) {
        console.error('Error loading location:', error)
        if (isMounted) {
          setLoading(false)
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    if (locationId) {
      loadLocation()
    }
    
    return () => {
      isMounted = false // Cleanup: prevent state updates after unmount
    }
  }, [locationId])

  // Track location view when location data is loaded
  useEffect(() => {
    if (location && locationData) {
      analytics.trackLocationView(
        location.id,
        location.name,
        location.risk_level,
        userContext
      )
    }
  }, [location, locationData, userContext])

  const handleShare = (platform: 'whatsapp' | 'twitter' | 'copy') => {
    if (!location || !locationData) return

    try {
      const contextDataForShare = contextData || {
        advisory_levels: {},
        resident_messages: {},
        visitor_messages: {},
        transit_messages: {}
      }
      const advisoryLevel = (contextDataForShare.advisory_levels as Record<string, Record<string, string>>)[location.risk_level]?.[userContext] || location.risk_level
      const text = `Safety Report: ${location.name}\n` +
                   `Advisory: ${advisoryLevel}\n` +
                   `Summary: ${locationData.summary || 'No summary available'}\n` +
                   `Context: ${userContext === 'resident' ? 'Resident' : userContext === 'visitor' ? 'Traveler' : 'Transit'}\n\n` +
                   `Check full details on Nigeria Security Alert`
      const url = window.location.href
      
      // Track share event
      analytics.trackShare(platform, location?.id)
      
      if (platform === 'whatsapp') {
        window.open(`https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`, '_blank')
      } else if (platform === 'twitter') {
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank')
      } else if (platform === 'copy') {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(`${text}\n${url}`).then(() => {
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
          }).catch(err => {
            console.error('Failed to copy to clipboard:', err)
            // Fallback for older browsers
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
          // Fallback for older browsers
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
      console.error('Error sharing:', error)
    }
  }


  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-accent border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading location data...</p>
        </div>
      </div>
    )
  }

  if (!location) {
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

  // Ensure we have location data
  if (!locationData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-accent border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading safety data...</p>
        </div>
      </div>
    )
  }
  
  // Use default context data if not loaded yet
  const contextDataToUse = contextData || {
    language_rules: {
      never_use: [],
      translations: {}
    },
    advisory_levels: {},
    resident_messages: {},
    visitor_messages: {},
    transit_messages: {}
  }

  const riskColor = riskColors[location.risk_level] || riskColors.MODERATE
  const stateName = location.state ? states.find(s => s.id === location.state)?.name : undefined
  
  // Badge from locationData
  const badge = locationData.badge || '⚠️ Unknown Risk'
  const isSafeArea = location.risk_level === 'MODERATE' || location.risk_level === 'LOW'
  const isDangerousArea = location.risk_level === 'EXTREME' || location.risk_level === 'VERY HIGH' || location.risk_level === 'HIGH'
  const advisoryLevel = (contextDataToUse.advisory_levels as Record<string, Record<string, string>>)[location.risk_level]?.[userContext] || location.risk_level

  // Get context-specific message
  const getContextMessage = () => {
    const riskLevel = location.risk_level
    if (userContext === 'resident') {
      return (contextDataToUse.resident_messages as Record<string, string>)[riskLevel] || "Stay safe, stay connected."
    } else if (userContext === 'visitor') {
      return (contextDataToUse.visitor_messages as Record<string, string>)[riskLevel] || "Please review travel advisory."
    } else {
      return (contextDataToUse.transit_messages as Record<string, string>)[riskLevel] || "Review route safety information."
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

  // Get type label for display
  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'state': return 'State'
      case 'lga': return 'LGA'
      case 'city': return 'City'
      case 'area': return 'Area'
      case 'institution': return 'Institution'
      case 'market': return 'Market'
      case 'tourist': return 'Tourist Site'
      case 'airport': return 'Airport'
      case 'industrial': return 'Industrial Area'
      default: return type.charAt(0).toUpperCase() + type.slice(1)
    }
  }

  return (
    <div className="min-h-screen pb-20 w-full overflow-x-hidden">
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
            
            <div className="flex items-center gap-3 mb-4">
              <Logo 
                size="md" 
                variant="location" 
                locationName={location.name}
                userContext={userContext}
                riskLevel={location.risk_level}
              />
              <h1 className="text-2xl md:text-3xl font-bold">{getPageTitle()}</h1>
            </div>

            {/* Context Selector */}
            <div className="mb-4">
              <p className="text-sm font-medium text-muted-foreground mb-2">I am:</p>
              <div className="flex flex-wrap gap-2">
                <motion.button
                  onClick={() => handleContextChange('resident')}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`relative flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all overflow-hidden touch-target min-h-[44px] ${
                    userContext === 'resident'
                      ? 'text-white shadow-lg'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                  style={userContext === 'resident' ? {
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 50%, #047857 100%)',
                  } : {}}
                  aria-label="I live here"
                  aria-pressed={userContext === 'resident'}
                >
                  {userContext === 'resident' && (
                    <motion.div
                      className="absolute inset-0 bg-white/20"
                      animate={{
                        x: ['-100%', '100%'],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "linear"
                      }}
                    />
                  )}
                  <Home className="w-4 h-4 relative z-10" />
                  <span className="relative z-10">I live here</span>
                </motion.button>
                <motion.button
                  onClick={() => handleContextChange('visitor')}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`relative flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all overflow-hidden touch-target min-h-[44px] ${
                    userContext === 'visitor'
                      ? 'text-white shadow-lg'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                  style={userContext === 'visitor' ? {
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 50%, #047857 100%)',
                  } : {}}
                  aria-label="Traveling there"
                  aria-pressed={userContext === 'visitor'}
                >
                  {userContext === 'visitor' && (
                    <motion.div
                      className="absolute inset-0 bg-white/20"
                      animate={{
                        x: ['-100%', '100%'],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "linear"
                      }}
                    />
                  )}
                  <Plane className="w-4 h-4 relative z-10" />
                  <span className="relative z-10">Traveling there</span>
                </motion.button>
                <motion.button
                  onClick={() => handleContextChange('transit')}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`relative flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all overflow-hidden touch-target min-h-[44px] ${
                    userContext === 'transit'
                      ? 'text-white shadow-lg'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                  style={userContext === 'transit' ? {
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 50%, #047857 100%)',
                  } : {}}
                  aria-label="Passing through"
                  aria-pressed={userContext === 'transit'}
                >
                  {userContext === 'transit' && (
                    <motion.div
                      className="absolute inset-0 bg-white/20"
                      animate={{
                        x: ['-100%', '100%'],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "linear"
                      }}
                    />
                  )}
                  <Car className="w-4 h-4 relative z-10" />
                  <span className="relative z-10">Passing through</span>
                </motion.button>
              </div>
            </div>

            {/* Badge - Prominently displayed */}
            <div className="flex items-center gap-3 flex-wrap">
              {badge && (
                <motion.div 
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className={`px-5 py-3 rounded-xl font-bold text-base md:text-lg ${riskColor.text} shadow-lg border-2 flex items-center gap-2.5 justify-center relative overflow-hidden max-w-full`}
                  style={isSafeArea ? {
                    background: location.risk_level === 'MODERATE'
                      ? 'linear-gradient(135deg, #10b981 0%, #059669 50%, #047857 100%)'
                      : 'linear-gradient(135deg, #22c55e 0%, #16a34a 50%, #15803d 100%)',
                    borderColor: location.risk_level === 'MODERATE' ? '#059669' : '#16a34a',
                  } : {
                    background: riskColors[location.risk_level as keyof typeof riskColors]?.gradient || riskColor.bg,
                    borderColor: riskColors[location.risk_level as keyof typeof riskColors]?.borderColor || '#DC2626',
                  }}
                >
                  {isSafeArea && (
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                      animate={{
                        x: ['-100%', '100%'],
                      }}
                      transition={{
                        duration: 3,
                        repeat: Infinity,
                        ease: "linear",
                        repeatDelay: 1
                      }}
                    />
                  )}
                  <span className="relative z-10 text-lg md:text-xl leading-tight">{badge}</span>
                </motion.div>
              )}
              <motion.span 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/80 backdrop-blur-sm text-sm font-medium border border-border/50"
              >
                {getTypeLabel(location.type)}
              </motion.span>
              {stateName && (
                <motion.span 
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="inline-flex items-center gap-2 text-muted-foreground text-sm"
                >
                  <MapPin className="w-4 h-4" />
                  <span>{stateName} State</span>
                </motion.span>
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
              <motion.div 
                variants={itemVariants}
                className="p-6 md:p-8 border-2 rounded-xl shadow-lg relative overflow-hidden"
                style={{
                  background: location.risk_level === 'MODERATE' 
                    ? 'linear-gradient(135deg, #10b981 0%, #059669 50%, #047857 100%)'
                    : location.risk_level === 'LOW'
                    ? 'linear-gradient(135deg, #22c55e 0%, #16a34a 50%, #15803d 100%)'
                    : 'linear-gradient(135deg, #10b981 0%, #059669 50%, #047857 100%)',
                  borderColor: location.risk_level === 'MODERATE' ? '#059669' :
                               location.risk_level === 'LOW' ? '#16a34a' : '#059669',
                }}
              >
                {/* Subtle shine effect */}
                <motion.div
                  className="absolute inset-0 opacity-20"
                  animate={{
                    background: [
                      'radial-gradient(circle at 0% 0%, rgba(255,255,255,0.3) 0%, transparent 50%)',
                      'radial-gradient(circle at 100% 100%, rgba(255,255,255,0.3) 0%, transparent 50%)',
                      'radial-gradient(circle at 0% 0%, rgba(255,255,255,0.3) 0%, transparent 50%)',
                    ]
                  }}
                  transition={{
                    duration: 4,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                />
                <div className="text-center px-4 sm:px-0">
                  <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-full bg-white/20 backdrop-blur-sm mb-4 sm:mb-6 shadow-lg border border-white/30">
                    <LocationIcon
                      locationId={location.id}
                      locationName={location.name}
                      locationType={location.type}
                      stateId={location.state}
                      size={40}
                      variant="large"
                    />
                  </div>
                  <h2 className="text-lg sm:text-xl md:text-2xl font-bold mb-2 px-2 sm:px-0 leading-tight" style={{ color: 'white' }}>
                    {(() => {
                      // Get context-specific welcome message
                      if (userContext === 'resident') {
                        return locationData?.resident_welcome || `Safety Tips for ${location.name}`
                      } else if (userContext === 'visitor') {
                        return locationData?.visitor_welcome || `Travel Advisory: ${location.name}`
                      } else {
                        return locationData?.transit_welcome || `Route Safety: Through ${location.name}`
                      }
                    })()}
                  </h2>
                  <p className="text-sm sm:text-base md:text-lg opacity-95 px-2 sm:px-0 leading-relaxed" style={{ color: 'white' }}>
                    {locationData?.summary && typeof locationData.summary === 'string' && locationData.summary.trim().length > 0
                      ? locationData.summary
                      : 'This area has moderate security risks. Standard precautions advised.'}
                  </p>
                </div>
              </motion.div>

              {/* Highlights */}
              {locationData?.highlights && Array.isArray(locationData.highlights) && locationData.highlights.length > 0 && (
                <motion.div variants={itemVariants}>
                  <Card hover={false} className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="relative">
                        <Star className="w-5 h-5 text-accent fill-accent/20" />
                      </div>
                      <h3 className="font-bold text-lg">Highlights</h3>
                    </div>
                    <ul className="space-y-2">
                      {locationData.highlights.filter(h => h && typeof h === 'string').map((highlight, index) => (
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
              {userContext === 'visitor' && locationData?.visitor_tips && Array.isArray(locationData.visitor_tips) && locationData.visitor_tips.length > 0 && (
                <motion.div variants={itemVariants}>
                  <Card hover={false} className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <Info className="w-5 h-5 text-accent" />
                      <h3 className="font-bold text-lg">Tips for Visitors</h3>
                    </div>
                    <ul className="space-y-2">
                      {locationData.visitor_tips.filter(tip => tip && typeof tip === 'string').map((tip, index) => (
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
              {userContext === 'resident' && locationData?.resident_tips && Array.isArray(locationData.resident_tips) && locationData.resident_tips.length > 0 && (
                <motion.div variants={itemVariants}>
                  <Card hover={false} className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <Shield className="w-5 h-5 text-accent" />
                      <h3 className="font-bold text-lg">Daily Safety Tips</h3>
                    </div>
                    <ul className="space-y-2">
                      {locationData.resident_tips.filter(tip => tip && typeof tip === 'string').map((tip, index) => (
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
              <motion.div 
                variants={itemVariants}
                className="p-6 md:p-8 border-2 rounded-xl shadow-lg"
                style={{
                  backgroundColor: location.risk_level === 'EXTREME' ? '#DC2626' :
                                   location.risk_level === 'VERY HIGH' ? '#EA580C' :
                                   location.risk_level === 'HIGH' ? '#CA8A04' : '#DC2626',
                  borderColor: location.risk_level === 'EXTREME' ? '#DC2626' :
                               location.risk_level === 'VERY HIGH' ? '#EA580C' :
                               location.risk_level === 'HIGH' ? '#CA8A04' : '#DC2626',
                }}
              >
                <div className="text-center relative z-10 px-4 sm:px-0">
                  <motion.div 
                    className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-full bg-white/20 backdrop-blur-sm mb-4 sm:mb-6 shadow-lg border border-white/30 relative"
                    whileHover={{ scale: 1.05 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  >
                    {/* Pulsing ring effect for dangerous areas */}
                    <motion.div
                      className="absolute inset-0 rounded-full border-2 border-white/40"
                      animate={{
                        scale: [1, 1.3, 1],
                        opacity: [0.6, 0, 0.6],
                      }}
                      transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                    />
                    <LocationIcon
                      locationId={location.id}
                      locationName={location.name}
                      locationType={location.type}
                      stateId={location.state}
                      size={40}
                      variant="large"
                    />
                  </motion.div>
                  <h2 className="text-lg sm:text-xl md:text-2xl font-bold mb-2 px-2 sm:px-0 leading-tight" style={{ color: 'white' }}>
                    {location.risk_level === 'HIGH' 
                      ? (userContext === 'resident' ? '🔔 Stay Alert' : 
                         userContext === 'visitor' ? '⚠️ Exercise Caution' : 
                         '⚠️ Route Requires Caution')
                      : (userContext === 'resident' ? '⚠️ Heightened Alert' : 
                         userContext === 'visitor' ? '🔴 Do Not Travel' : 
                         '⚠️ Route Not Recommended')}
                  </h2>
                  <p className="text-sm sm:text-base md:text-lg opacity-95 px-2 sm:px-0 leading-relaxed" style={{ color: 'white' }}>
                    {getContextMessage()}
                  </p>
                </div>
              </motion.div>

              {/* Summary */}
              {locationData?.summary && typeof locationData.summary === 'string' && locationData.summary.trim().length > 0 && (
                <motion.div variants={itemVariants}>
                  <Card hover={false} className="p-6">
                    <h3 className="font-bold text-lg mb-3">Overview</h3>
                    <p className="text-sm text-foreground leading-relaxed">
                      {locationData.summary}
                    </p>
                  </Card>
                </motion.div>
              )}

              {/* Monday Warning - Special Case */}
              {locationData?.monday_warning && typeof locationData.monday_warning === 'object' && (
                <motion.div variants={itemVariants}>
                  <Card hover={false} className="p-6 bg-red-50 dark:bg-red-950/20 border-2 border-red-500">
                    <div className="flex items-center gap-3 mb-3">
                      <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
                      {locationData.monday_warning.status && typeof locationData.monday_warning.status === 'string' && (
                        <h3 className="font-bold text-lg text-red-900 dark:text-red-100">
                          {locationData.monday_warning.status}
                        </h3>
                      )}
                    </div>
                    {locationData.monday_warning.reason && typeof locationData.monday_warning.reason === 'string' && (
                      <p className="text-sm text-red-800 dark:text-red-200 mb-2">
                        {locationData.monday_warning.reason}
                      </p>
                    )}
                    {locationData.monday_warning.advice && typeof locationData.monday_warning.advice === 'string' && (
                      <p className="text-sm text-red-700 dark:text-red-300">
                        {locationData.monday_warning.advice}
                      </p>
                    )}
                  </Card>
                </motion.div>
              )}

              {/* Travel Advice - Special Case (e.g., Kaduna Train) */}
              {locationData?.travel_advice && typeof locationData.travel_advice === 'object' && locationData.travel_advice.abuja_to_kaduna && typeof locationData.travel_advice.abuja_to_kaduna === 'object' && (
                <motion.div variants={itemVariants}>
                  <Card hover={false} className="p-6 bg-blue-50 dark:bg-blue-950/20 border-2 border-blue-500">
                    <div className="flex items-center gap-3 mb-3">
                      <Train className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                      <h3 className="font-bold text-lg text-blue-900 dark:text-blue-100">
                        Travel Recommendation
                      </h3>
                    </div>
                    {locationData.travel_advice.abuja_to_kaduna.recommended && typeof locationData.travel_advice.abuja_to_kaduna.recommended === 'string' && (
                      <p className="text-sm text-blue-800 dark:text-blue-200 mb-2 font-medium">
                        ✅ {locationData.travel_advice.abuja_to_kaduna.recommended}
                      </p>
                    )}
                    {locationData.travel_advice.abuja_to_kaduna.avoid && typeof locationData.travel_advice.abuja_to_kaduna.avoid === 'string' && (
                      <p className="text-sm text-red-700 dark:text-red-300 mb-2">
                        ❌ {locationData.travel_advice.abuja_to_kaduna.avoid}
                      </p>
                    )}
                    {locationData.travel_advice.abuja_to_kaduna.flight && typeof locationData.travel_advice.abuja_to_kaduna.flight === 'string' && (
                      <p className="text-sm text-blue-700 dark:text-blue-300">
                        ✈️ {locationData.travel_advice.abuja_to_kaduna.flight}
                      </p>
                    )}
                  </Card>
                </motion.div>
              )}

              {/* Key Threats */}
              {locationData?.key_threats && Array.isArray(locationData.key_threats) && locationData.key_threats.length > 0 && (
                <motion.div variants={itemVariants}>
                  <Card hover={false} className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <AlertTriangle className="w-5 h-5 text-accent" />
                      <h3 className="font-bold text-lg">Key Threats</h3>
                    </div>
                    <ul className="space-y-2">
                      {locationData.key_threats.filter(threat => threat && typeof threat === 'string').map((threat, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <AlertTriangle className="w-4 h-4 text-orange-600 flex-shrink-0 mt-0.5" />
                          <span className="text-sm">{threat}</span>
                        </li>
                      ))}
                    </ul>
                  </Card>
                </motion.div>
              )}

              {/* Safer Zones */}
              {locationData?.safer_zones && Array.isArray(locationData.safer_zones) && locationData.safer_zones.length > 0 && (
                <motion.div variants={itemVariants}>
                  <Card hover={false} className="p-6 bg-green-50 dark:bg-green-950/20">
                    <div className="flex items-center gap-3 mb-4">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <h3 className="font-bold text-lg">Safer Zones</h3>
                    </div>
                    <ul className="space-y-2">
                      {locationData.safer_zones.filter(zone => zone && typeof zone === 'string').map((zone, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                          <span className="text-sm">{zone}</span>
                        </li>
                      ))}
                    </ul>
                  </Card>
                </motion.div>
              )}

              {/* Danger Zones */}
              {locationData?.danger_zones && Array.isArray(locationData.danger_zones) && locationData.danger_zones.length > 0 && (
                <motion.div variants={itemVariants}>
                  <Card hover={false} className="p-6 bg-red-50 dark:bg-red-950/20">
                    <div className="flex items-center gap-3 mb-4">
                      <AlertTriangle className="w-5 h-5 text-red-600" />
                      <h3 className="font-bold text-lg">Danger Zones</h3>
                    </div>
                    <ul className="space-y-2">
                      {locationData.danger_zones.filter(zone => zone && typeof zone === 'string').map((zone, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                          <span className="text-sm">{zone}</span>
                        </li>
                      ))}
                    </ul>
                  </Card>
                </motion.div>
              )}

              {/* Travel Windows */}
              {locationData?.travel_windows && typeof locationData.travel_windows === 'object' && (
                <motion.div variants={itemVariants}>
                  <Card hover={false} className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <Clock className="w-5 h-5 text-accent" />
                      <h3 className="font-bold text-lg">Travel Windows</h3>
                    </div>
                    {locationData.travel_windows.safest && typeof locationData.travel_windows.safest === 'string' && (
                      <p className="text-sm mb-2">
                        <span className="font-medium text-green-700 dark:text-green-400">✅ Safest:</span> {locationData.travel_windows.safest}
                      </p>
                    )}
                    {locationData.travel_windows.avoid && typeof locationData.travel_windows.avoid === 'string' && (
                      <p className="text-sm mb-2">
                        <span className="font-medium text-red-700 dark:text-red-400">❌ Avoid:</span> {locationData.travel_windows.avoid}
                      </p>
                    )}
                    {locationData.travel_windows.note && typeof locationData.travel_windows.note === 'string' && (
                      <p className="text-sm text-muted-foreground italic">
                        {locationData.travel_windows.note}
                      </p>
                    )}
                  </Card>
                </motion.div>
              )}

              {/* If You Must Go - Show for all contexts */}
              {locationData?.if_you_must_go && Array.isArray(locationData.if_you_must_go) && locationData.if_you_must_go.length > 0 && (
                <motion.div variants={itemVariants}>
                  <Card hover={false} className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <Info className="w-5 h-5 text-accent" />
                      <h3 className="font-bold text-lg">If You Must Go</h3>
                    </div>
                    <ul className="space-y-2">
                      {locationData.if_you_must_go.filter(tip => tip && typeof tip === 'string').map((tip, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <CheckCircle className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" />
                          <span className="text-sm">{tip}</span>
                        </li>
                      ))}
                    </ul>
                  </Card>
                </motion.div>
              )}

              {/* EXTREME Areas - Extra Info */}
              {location.risk_level === 'EXTREME' && (
                <>
                  {/* What Not To Do */}
                  {locationData?.what_not_to_do && Array.isArray(locationData.what_not_to_do) && locationData.what_not_to_do.length > 0 && (
                    <motion.div variants={itemVariants}>
                      <Card hover={false} className="p-6 bg-red-50 dark:bg-red-950/20">
                        <div className="flex items-center gap-3 mb-4">
                          <AlertTriangle className="w-5 h-5 text-red-600" />
                          <h3 className="font-bold text-lg">What NOT To Do</h3>
                        </div>
                        <ul className="space-y-2">
                          {locationData.what_not_to_do.filter(item => item && typeof item === 'string').map((item, index) => (
                            <li key={index} className="flex items-start gap-2">
                              <X className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                              <span className="text-sm">{item}</span>
                            </li>
                          ))}
                        </ul>
                      </Card>
                    </motion.div>
                  )}

                  {/* If Stranded */}
                  {locationData?.if_stranded && Array.isArray(locationData.if_stranded) && locationData.if_stranded.length > 0 && (
                    <motion.div variants={itemVariants}>
                      <Card hover={false} className="p-6 bg-orange-50 dark:bg-orange-950/20">
                        <div className="flex items-center gap-3 mb-4">
                          <Phone className="w-5 h-5 text-orange-600" />
                          <h3 className="font-bold text-lg">If Stranded</h3>
                        </div>
                        <ul className="space-y-2">
                          {locationData.if_stranded.filter(item => item && typeof item === 'string').map((item, index) => (
                            <li key={index} className="flex items-start gap-2">
                              <Phone className="w-4 h-4 text-orange-600 flex-shrink-0 mt-0.5" />
                              <span className="text-sm">{item}</span>
                            </li>
                          ))}
                        </ul>
                      </Card>
                    </motion.div>
                  )}

                  {/* Checkpoints */}
                  {locationData?.checkpoints && typeof locationData.checkpoints === 'object' && (
                    <motion.div variants={itemVariants}>
                      <Card hover={false} className="p-6">
                        <div className="flex items-center gap-3 mb-4">
                          <Shield className="w-5 h-5 text-accent" />
                          <h3 className="font-bold text-lg">At Checkpoints</h3>
                        </div>
                        {locationData.checkpoints.what_to_expect && typeof locationData.checkpoints.what_to_expect === 'string' && (
                          <p className="text-sm mb-2">
                            <span className="font-medium">What to expect:</span> {locationData.checkpoints.what_to_expect}
                          </p>
                        )}
                        {locationData.checkpoints.documents && typeof locationData.checkpoints.documents === 'string' && (
                          <p className="text-sm mb-2">
                            <span className="font-medium">Documents:</span> {locationData.checkpoints.documents}
                          </p>
                        )}
                        {locationData.checkpoints.behavior && typeof locationData.checkpoints.behavior === 'string' && (
                          <p className="text-sm">
                            <span className="font-medium">Behavior:</span> {locationData.checkpoints.behavior}
                          </p>
                        )}
                      </Card>
                    </motion.div>
                  )}

                  {/* Evacuation Routes */}
                  {locationData?.evacuation_routes && Array.isArray(locationData.evacuation_routes) && locationData.evacuation_routes.length > 0 && (
                    <motion.div variants={itemVariants}>
                      <Card hover={false} className="p-6">
                        <div className="flex items-center gap-3 mb-4">
                          <MapPin className="w-5 h-5 text-accent" />
                          <h3 className="font-bold text-lg">Evacuation Routes</h3>
                        </div>
                        <ul className="space-y-2">
                          {locationData.evacuation_routes.filter(route => route && typeof route === 'string').map((route, index) => (
                            <li key={index} className="flex items-start gap-2">
                              <MapPin className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" />
                              <span className="text-sm">{route}</span>
                            </li>
                          ))}
                        </ul>
                      </Card>
                    </motion.div>
                  )}
                </>
              )}

              {/* Resident View - Daily Safety Tips */}
              {userContext === 'resident' && locationData?.resident_tips && Array.isArray(locationData.resident_tips) && locationData.resident_tips.length > 0 && (
                <motion.div variants={itemVariants}>
                  <Card hover={false} className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <Shield className="w-5 h-5 text-accent" />
                      <h3 className="font-bold text-lg">Daily Safety Tips</h3>
                    </div>
                    <ul className="space-y-2">
                      {locationData.resident_tips.filter(tip => tip && typeof tip === 'string').map((tip, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <CheckCircle className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" />
                          <span className="text-sm">{tip}</span>
                        </li>
                      ))}
                    </ul>
                    {locationData?.safer_hours && typeof locationData.safer_hours === 'string' && locationData.safer_hours.trim().length > 0 && (
                      <div className="mt-4 p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                        <p className="text-sm font-medium text-green-700 dark:text-green-400">
                          Best movement times: {locationData.safer_hours}
                        </p>
                      </div>
                    )}
                  </Card>
                </motion.div>
              )}

              {/* Visitor View */}
              {userContext === 'visitor' && (
                <>
                  {locationData?.visitor_advice && typeof locationData.visitor_advice === 'string' && locationData.visitor_advice.trim().length > 0 && (
                    <motion.div variants={itemVariants}>
                      <Card hover={false} className="p-6">
                        <div className="flex items-center gap-3 mb-4">
                          <Info className="w-5 h-5 text-accent" />
                          <h3 className="font-bold text-lg">What You Should Know</h3>
                        </div>
                        <p className="text-sm text-foreground leading-relaxed">
                          {locationData.visitor_advice}
                        </p>
                      </Card>
                    </motion.div>
                  )}

                  {/* Alternatives */}
                  {locationData?.alternatives && Array.isArray(locationData.alternatives) && locationData.alternatives.length > 0 && (
                    <motion.div variants={itemVariants}>
                      <Card hover={false} className="p-6 bg-muted/50">
                        <div className="flex items-center gap-3 mb-4">
                          <MapPin className="w-5 h-5 text-accent" />
                          <h3 className="font-bold text-lg">Travel Alternatives</h3>
                        </div>
                        <ul className="space-y-2">
                          {locationData.alternatives.filter(alt => alt && typeof alt === 'string').map((alt, index) => (
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
                  {locationData?.transit_advice && typeof locationData.transit_advice === 'string' && locationData.transit_advice.trim().length > 0 && (
                    <motion.div variants={itemVariants}>
                      <Card hover={false} className="p-6">
                        <div className="flex items-center gap-3 mb-4">
                          <Car className="w-5 h-5 text-accent" />
                          <h3 className="font-bold text-lg">Route Information</h3>
                        </div>
                        <p className="text-sm text-foreground leading-relaxed">
                          {locationData.transit_advice}
                        </p>
                        {locationData?.safer_hours && typeof locationData.safer_hours === 'string' && locationData.safer_hours.trim().length > 0 && (
                          <div className="mt-4 p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                            <p className="text-sm font-medium text-green-700 dark:text-green-400">
                              Recommended travel times: {locationData.safer_hours}
                            </p>
                          </div>
                        )}
                      </Card>
                    </motion.div>
                  )}

                  {/* Alternatives */}
                  {locationData?.alternatives && Array.isArray(locationData.alternatives) && locationData.alternatives.length > 0 && (
                    <motion.div variants={itemVariants}>
                      <Card hover={false} className="p-6 bg-muted/50">
                        <div className="flex items-center gap-3 mb-4">
                          <MapPin className="w-5 h-5 text-accent" />
                          <h3 className="font-bold text-lg">Alternative Routes</h3>
                        </div>
                        <ul className="space-y-2">
                          {locationData.alternatives.filter(alt => alt && typeof alt === 'string').map((alt, index) => (
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
                      Stay safe, stay connected. We&apos;re here to help you navigate daily life safely.
                    </p>
                  </Card>
                </motion.div>
              )}
            </>
          )}

          {/* Emergency Contacts - Always shown */}
          {locationData?.emergency_contacts && typeof locationData.emergency_contacts === 'object' && (
            <motion.div variants={itemVariants}>
              <Card hover={false} className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Phone className="w-5 h-5 text-accent" />
                  <h3 className="font-bold text-lg">Emergency Contacts</h3>
                </div>
                <div className="space-y-3">
                  {/* National Emergency - Always show */}
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">National Emergency</p>
                    <a 
                      href="tel:112" 
                      onClick={() => analytics.trackEmergencyContact('national_emergency', location?.id)}
                      className="text-lg font-semibold text-accent hover:underline"
                    >
                      112
                    </a>
                  </div>
                  {locationData.emergency_contacts.police && typeof locationData.emergency_contacts.police === 'string' && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Police</p>
                      <a 
                        href={`tel:${locationData.emergency_contacts.police.replace(/\s/g, '')}`}
                        onClick={() => analytics.trackEmergencyContact('police', location?.id)}
                        className="text-lg font-semibold text-accent hover:underline"
                      >
                        {locationData.emergency_contacts.police}
                      </a>
                    </div>
                  )}
                  {locationData.emergency_contacts.emergency && typeof locationData.emergency_contacts.emergency === 'string' && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Emergency</p>
                      <a 
                        href={`tel:${locationData.emergency_contacts.emergency.replace(/\s/g, '')}`}
                        onClick={() => analytics.trackEmergencyContact('emergency', location?.id)}
                        className="text-lg font-semibold text-accent hover:underline"
                      >
                        {locationData.emergency_contacts.emergency}
                      </a>
                    </div>
                  )}
                  {/* Display other emergency contact fields */}
                  {Object.entries(locationData.emergency_contacts).map(([key, value]) => {
                    if (key === 'police' || key === 'emergency' || !value || typeof value !== 'string') return null
                    return (
                      <div key={key}>
                        <p className="text-xs text-muted-foreground mb-1 capitalize">{key.replace(/_/g, ' ')}</p>
                        <a 
                          href={`tel:${value.replace(/\s/g, '')}`}
                          onClick={() => analytics.trackEmergencyContact(key, location?.id)}
                          className="text-lg font-semibold text-accent hover:underline"
                        >
                          {value}
                        </a>
                      </div>
                    )
                  })}
                </div>
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
