'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, MapPin, ChevronRight } from 'lucide-react'
import { RiskBadge } from './RiskBadge'
import { analytics } from '@/lib/analytics'

interface Location {
  id: string
  name: string
  state?: string
  type: 'state' | 'lga' | 'city' | 'area' | 'institution' | 'market' | 'tourist' | 'airport' | 'industrial'
  risk_level: 'EXTREME' | 'VERY HIGH' | 'HIGH' | 'MODERATE' | 'LOW'
}

interface SearchResult {
  location: Location
  stateName?: string
  score: number
}

const placeholders = [
  'Search Victoria Island...',
  'Search Birnin Gwari...',
  'Search Lagos...',
  'Search Maitama...',
  'Search any location...',
]

export function AreaSearchBar({ 
  large = false, 
  onQueryChange, 
  onLocationSelect 
}: { 
  large?: boolean
  onQueryChange?: (query: string) => void
  onLocationSelect?: (locationId: string) => void
}) {
  const [query, setQuery] = useState('')
  const [isFocused, setIsFocused] = useState(false)
  const [results, setResults] = useState<SearchResult[]>([])
  const [locations, setLocations] = useState<Location[]>([])
  const [stateMap, setStateMap] = useState<Map<string, string>>(new Map())
  const [loading, setLoading] = useState(true)
  const [placeholderIndex, setPlaceholderIndex] = useState(0)
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  // Load locations and state data
  useEffect(() => {
    async function loadData() {
      try {
        const [finalRes, completeRes, statesRes] = await Promise.all([
          fetch('/data/locations-final-1098.json'),
          fetch('/data/locations-complete.json'),
          fetch('/data/states.json'),
        ])

        // Check if responses are ok
        if (!finalRes.ok) {
          throw new Error(`Failed to load locations-final-1098.json: ${finalRes.status}`)
        }
        if (!statesRes.ok) {
          throw new Error(`Failed to load states.json: ${statesRes.status}`)
        }

        const finalResponse = await finalRes.json()
        const statesData = await statesRes.json()
        
        // Handle both old format (array) and new format (object with locations array)
        const finalLocations = Array.isArray(finalResponse) 
          ? finalResponse 
          : finalResponse.locations || []
        
        // Try to load complete file, but don't fail if it doesn't exist
        let completeLocations: Location[] = []
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
        
        // Merge locations: use final-1098 as base, add any unique locations from complete
        const locationMap = new Map<string, Location>()
        
        // First, add all locations from final-1098 (these take priority)
        finalLocations.forEach((loc: Location) => {
          if (loc && loc.id && loc.name) {
            locationMap.set(loc.id, loc)
          }
        })
        
        // Then, add locations from complete that don't exist in final
        completeLocations.forEach((loc: Location) => {
          if (loc && loc.id && loc.name && !locationMap.has(loc.id)) {
            locationMap.set(loc.id, loc)
          }
        })
        
        // Convert map back to array
        const mergedLocations = Array.from(locationMap.values())
        
        console.log(`Loaded ${mergedLocations.length} locations (${finalLocations.length} from final-1098, ${completeLocations.length} from complete, ${mergedLocations.length - finalLocations.length} unique from complete)`)
        
        setLocations(mergedLocations)
        const map = new Map<string, string>(statesData.map((s: any) => [s.id, s.name] as [string, string]))
        setStateMap(map)
        setLoading(false)
      } catch (error) {
        console.error('Error loading data:', error)
        setLoading(false)
      }
    }
    loadData()
  }, [])

  // Cycle through placeholders
  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % placeholders.length)
    }, 3000)
    
    return () => clearInterval(interval) // Cleanup on unmount
  }, [])

  // Search logic with ranking
  useEffect(() => {
    if (query.length < 2 || loading || stateMap.size === 0 || !Array.isArray(locations) || locations.length === 0) {
      setResults([])
      return
    }

    const lowerQuery = query.toLowerCase().trim()
    if (!lowerQuery) {
      setResults([])
      return
    }

    const searchResults: SearchResult[] = []

    locations.forEach((location) => {
      if (!location || !location.id || !location.name || typeof location.name !== 'string') {
        return
      }

      const locationNameLower = location.name.toLowerCase()
      const stateName = location.state ? stateMap.get(location.state) : undefined
      const stateNameLower = stateName?.toLowerCase() || ''
      
      let score = 0
      let matches = false

      // 1. Exact name match (highest priority)
      if (locationNameLower === lowerQuery) {
        score = 1000
        matches = true
      }
      // 2. Name starts with query
      else if (locationNameLower.startsWith(lowerQuery)) {
        score = 500
        matches = true
      }
      // 3. Name contains query
      else if (locationNameLower.includes(lowerQuery)) {
        score = 200
        matches = true
      }
      // 4. State name contains query
      else if (stateNameLower.includes(lowerQuery)) {
        score = 100
        matches = true
      }

      if (matches) {
        searchResults.push({
          location,
          stateName,
          score,
        })
      }
    })

    // Sort by score (highest first), then by risk level (higher risk first)
    searchResults.sort((a, b) => {
      if (!a || !b || !a.location || !b.location) return 0
      if (b.score !== a.score) return b.score - a.score
      
      const riskOrder: Record<string, number> = { 'EXTREME': 0, 'VERY HIGH': 1, 'HIGH': 2, 'MODERATE': 3, 'LOW': 4 }
      const aRisk = a.location.risk_level || 'MODERATE'
      const bRisk = b.location.risk_level || 'MODERATE'
      return (riskOrder[aRisk] || 3) - (riskOrder[bRisk] || 3)
    })

    const finalResults = searchResults.slice(0, 8)
    setResults(finalResults)
    
    // Track search event
    if (finalResults.length > 0 && query.length >= 2) {
      analytics.trackLocationSearch(query, finalResults.length)
    }
  }, [query, locations, loading, stateMap])

  const handleSelect = (result: SearchResult) => {
    setSelectedLocationId(result.location.id)
    setQuery(result.location.name)
    setIsFocused(false)
    onLocationSelect?.(result.location.id)
  }

  const handleNavigate = () => {
    if (selectedLocationId) {
      router.push(`/area/${selectedLocationId}`)
    }
  }

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
      case 'industrial': return 'Industrial'
      default: return type.charAt(0).toUpperCase() + type.slice(1)
    }
  }

  return (
    <div className={`relative w-full ${large ? 'max-w-2xl' : 'max-w-md'}`}>
      <motion.div
        animate={{
          boxShadow: isFocused 
            ? '0 0 0 3px rgba(37, 99, 235, 0.1), 0 8px 24px rgba(0,0,0,0.12)' 
            : '0 2px 8px rgba(0,0,0,0.08)',
        }}
        className={`
          relative flex items-center bg-white/95 dark:bg-zinc-900/95 backdrop-blur-sm border-2 rounded-2xl overflow-hidden transition-all duration-200
          ${isFocused ? 'border-accent shadow-lg' : 'border-border/50 hover:border-border'}
          ${large ? 'h-16' : 'h-14'}
        `}
      >
        <Search 
          className={`
            ml-4 transition-colors
            ${isFocused ? 'text-accent' : 'text-muted-foreground'}
            ${large ? 'w-5 h-5' : 'w-4 h-4'}
          `} 
        />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            onQueryChange?.(e.target.value)
          }}
          style={{ fontSize: '16px' }} // Prevents zoom on iOS Safari
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck="false"
          onFocus={() => setIsFocused(true)}
          onBlur={() => setTimeout(() => setIsFocused(false), 200)}
          placeholder={placeholders[placeholderIndex]}
          className={`
            flex-1 bg-transparent outline-none px-3 text-foreground placeholder:text-muted-foreground
            ${large ? 'text-lg' : 'text-base'}
          `}
        />
      </motion.div>

      {/* Search Results Dropdown */}
      <AnimatePresence>
        {isFocused && query.length >= 2 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="absolute top-full left-0 right-0 mt-2 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border border-border/50 rounded-2xl shadow-2xl overflow-hidden z-50 max-h-[60vh] overflow-y-auto"
          >
            {Array.isArray(results) && results.length > 0 ? (
              results.map((result, index) => {
                if (!result || !result.location) return null
                return (
                  <motion.button
                    key={`${result.location.id}-${index}`}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.03 }}
                    onClick={() => handleSelect(result)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        handleSelect(result)
                      }
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted transition-colors text-left border-b border-border last:border-b-0 touch-target min-h-[44px] focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2"
                    aria-label={`Select ${result.location.name}${result.stateName ? ` in ${result.stateName}` : ''}`}
                  >
                    <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium truncate">{result.location.name || 'Unknown'}</span>
                        {result.stateName && (
                          <span className="text-sm text-muted-foreground">({result.stateName})</span>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {getTypeLabel(result.location.type || 'area')}
                      </span>
                    </div>
                    {result.location.risk_level && (
                      <RiskBadge level={result.location.risk_level} size="sm" showIcon={false} />
                    )}
                    <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  </motion.button>
                )
              })
            ) : (
              <div className="px-4 py-6 text-center">
                <MapPin className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-50" />
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  No locations found
                </p>
                <p className="text-xs text-muted-foreground">
                  Try searching with a different name or check the spelling
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

