'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, MapPin, Route, ChevronRight } from 'lucide-react'
import { useData } from '@/hooks/useData'
import { RiskBadge } from './RiskBadge'

const placeholders = [
  'Search Bukkuyum...',
  'Search Zamfara...',
  'Search Birnin Gwari...',
  'Search Kaduna...',
  'Search Abuja-Kaduna Road...',
]

interface SearchResult {
  type: 'state' | 'lga' | 'road'
  name: string
  href: string
  parent?: string
  riskLevel: 'EXTREME' | 'VERY HIGH' | 'HIGH' | 'MODERATE'
}

export function SearchBar({ large = false, onQueryChange }: { large?: boolean; onQueryChange?: (query: string) => void }) {
  const [query, setQuery] = useState('')
  const [isFocused, setIsFocused] = useState(false)
  const [results, setResults] = useState<SearchResult[]>([])
  const [placeholderIndex, setPlaceholderIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const { states, lgas, roads } = useData()

  // Cycle through placeholders
  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % placeholders.length)
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  // Search logic
  useEffect(() => {
    if (query.length < 2) {
      setResults([])
      return
    }

    const searchResults: SearchResult[] = []
    const lowerQuery = query.toLowerCase()

    // Search states
    states.forEach((state) => {
      if (state.name.toLowerCase().includes(lowerQuery)) {
        searchResults.push({
          type: 'state',
          name: state.name,
          href: `/location/${state.id}`,
          riskLevel: state.riskLevel,
        })
      }
    })

    // Search LGAs
    lgas.forEach((lga) => {
      if (lga.name.toLowerCase().includes(lowerQuery)) {
        searchResults.push({
          type: 'lga',
          name: lga.name,
          href: `/location/${lga.stateId}/${lga.id}`,
          parent: lga.stateName,
          riskLevel: lga.riskLevel,
        })
      }
    })

    // Search roads
    roads.forEach((road) => {
      if (road.name.toLowerCase().includes(lowerQuery)) {
        searchResults.push({
          type: 'road',
          name: road.name,
          href: `/road/${road.slug}`,
          riskLevel: road.riskLevel,
        })
      }
    })

    // Sort by relevance (exact matches first, then by risk level)
    searchResults.sort((a, b) => {
      const aExact = a.name.toLowerCase() === lowerQuery
      const bExact = b.name.toLowerCase() === lowerQuery
      if (aExact && !bExact) return -1
      if (!aExact && bExact) return 1
      
      // Prioritize higher risk items
      const riskOrder = { 'EXTREME': 0, 'VERY HIGH': 1, 'HIGH': 2, 'MODERATE': 3 }
      return riskOrder[a.riskLevel] - riskOrder[b.riskLevel]
    })

    setResults(searchResults.slice(0, 6))
  }, [query])

  const handleSelect = (result: SearchResult) => {
    router.push(result.href)
    setQuery('')
    setIsFocused(false)
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'state': return 'State'
      case 'lga': return 'LGA'
      case 'road': return 'Road'
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
                key={`${result.type}-${result.name}-${index}`}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.03 }}
                onClick={() => handleSelect(result)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted transition-colors text-left border-b border-border last:border-b-0"
              >
                {result.type === 'road' ? (
                  <Route className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                ) : (
                  <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">{result.name}</span>
                    {result.parent && (
                      <span className="text-sm text-muted-foreground">, {result.parent}</span>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {getTypeLabel(result.type)}
                  </span>
                </div>
                <RiskBadge level={result.riskLevel} size="sm" showIcon={false} />
                <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
