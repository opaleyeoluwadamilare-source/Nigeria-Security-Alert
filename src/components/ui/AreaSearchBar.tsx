'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, MapPin, ChevronRight } from 'lucide-react'
import { RiskBadge } from './RiskBadge'

interface Location {
  id: string
  name: string
  state?: string
  type: 'state' | 'lga' | 'city' | 'area'
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

export function AreaSearchBar({ large = false, onQueryChange }: { large?: boolean; onQueryChange?: (query: string) => void }) {
  const [query, setQuery] = useState('')
  const [isFocused, setIsFocused] = useState(false)
  const [results, setResults] = useState<SearchResult[]>([])
  const [locations, setLocations] = useState<Location[]>([])
  const [stateMap, setStateMap] = useState<Map<string, string>>(new Map())
  const [loading, setLoading] = useState(true)
  const [placeholderIndex, setPlaceholderIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  // Load locations and state data
  useEffect(() => {
    async function loadData() {
      try {
        const [locationsRes, statesRes] = await Promise.all([
          fetch('/data/locations-complete.json'),
          fetch('/data/states.json'),
        ])

        const locationsData = await locationsRes.json()
        const statesData = await statesRes.json()
        
        setLocations(locationsData)
        const map = new Map(statesData.map((s: any) => [s.id, s.name]))
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
    return () => clearInterval(interval)
  }, [])

  // Search logic with ranking
  useEffect(() => {
    if (query.length < 2 || loading || stateMap.size === 0) {
      setResults([])
      return
    }

    const lowerQuery = query.toLowerCase().trim()
    const searchResults: SearchResult[] = []

    locations.forEach((location) => {
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
      if (b.score !== a.score) return b.score - a.score
      
      const riskOrder = { 'EXTREME': 0, 'VERY HIGH': 1, 'HIGH': 2, 'MODERATE': 3, 'LOW': 4 }
      return riskOrder[a.location.risk_level] - riskOrder[b.location.risk_level]
    })

    setResults(searchResults.slice(0, 8))
  }, [query, locations, loading, stateMap])

  const handleSelect = (result: SearchResult) => {
    router.push(`/area/${result.location.id}`)
    setQuery('')
    setIsFocused(false)
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'state': return 'State'
      case 'lga': return 'LGA'
      case 'city': return 'City'
      case 'area': return 'Area'
      default: return type
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
        {isFocused && results.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="absolute top-full left-0 right-0 mt-2 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border border-border/50 rounded-2xl shadow-2xl overflow-hidden z-40"
          >
            {results.map((result, index) => (
              <motion.button
                key={`${result.location.id}-${index}`}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.03 }}
                onClick={() => handleSelect(result)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted transition-colors text-left border-b border-border last:border-b-0"
              >
                <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium truncate">{result.location.name}</span>
                    {result.stateName && (
                      <span className="text-sm text-muted-foreground">({result.stateName})</span>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {getTypeLabel(result.location.type)}
                  </span>
                </div>
                <RiskBadge level={result.location.risk_level} size="sm" showIcon={false} />
                <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

