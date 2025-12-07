'use client'

import { useState, useEffect, useCallback } from 'react'
import { fetchAreaReports, GDELTArticle } from '@/lib/gdelt'
import { getRelevanceZone, getRelevanceScore, getZoneLabel } from '@/lib/location-relevance'
import { 
  calculateRiskScore, 
  groupIncidentsByZone, 
  parseGDELTDate, 
  calculateDynamicRisk,
  ClassifiedIncident, 
  RiskScoreResult,
  DynamicRiskResult 
} from '@/lib/risk-scoring'
import { getTimeWindowForRisk } from '@/lib/risk-time-windows'

interface AreaProfile {
  riskLevel?: string
  keyThreats?: string[]
  saferZones?: string[]
  dangerZones?: string[]
  travelWindow?: string
}

interface Briefing {
  summary: string
  for_travelers: {
    headline: string
    tips: string[]
  }
  for_residents: {
    headline: string
    tips: string[]
    neighborhood_status?: string
  }
  recent_developments: string[]
  positive_notes: string[]
  bottom_line: string
}

interface LiveIntelligenceData {
  incidents: ClassifiedIncident[]
  groupedIncidents: {
    immediate: ClassifiedIncident[]
    nearby: ClassifiedIncident[]
    regional: ClassifiedIncident[]
    stateWide: ClassifiedIncident[]
  }
  riskScore: RiskScoreResult
  dynamicRisk?: DynamicRiskResult  // NEW: Dynamic risk adjustment
  briefing: Briefing | null
  loading: boolean
  error: string | null
  lastUpdated: string | null
  fallbackToRaw: boolean // If LLM failed, show raw articles
  rawArticles?: GDELTArticle[] // Fallback raw articles
}

const CACHE_DURATION = 2 * 60 * 60 * 1000 // 2 hours (longer for LLM results)

function getCacheKey(location: string, state: string): string {
  return `live-intel-${location.toLowerCase().replace(/\s+/g, '-')}-${state.toLowerCase()}`
}

function getCache(key: string): LiveIntelligenceData | null {
  if (typeof window === 'undefined') return null

  try {
    const cached = localStorage.getItem(key)
    if (!cached) return null

    const { data, timestamp } = JSON.parse(cached)
    if (Date.now() - timestamp > CACHE_DURATION) {
      localStorage.removeItem(key)
      return null
    }

    return data
  } catch {
    return null
  }
}

function setCache(key: string, data: LiveIntelligenceData): void {
  if (typeof window === 'undefined') return

  try {
    localStorage.setItem(key, JSON.stringify({
      data,
      timestamp: Date.now(),
    }))
  } catch (error) {
    // Storage full or unavailable - silently fail
    console.warn('Failed to cache intelligence data:', error)
  }
}

export function useLiveIntelligence(
  location: string,
  state: string,
  areaProfile?: AreaProfile,
  staticRiskLevel?: string | null  // NEW: Static risk level for time window and dynamic adjustment
): LiveIntelligenceData & { refresh: () => Promise<void> } {

  const [data, setData] = useState<LiveIntelligenceData>({
    incidents: [],
    groupedIncidents: { immediate: [], nearby: [], regional: [], stateWide: [] },
    riskScore: { 
      score: 0, 
      level: 'low', 
      confidence: 'low', 
      methodology: '', 
      breakdown: { 
        immediateCount: 0, 
        nearbyCount: 0, 
        regionalCount: 0, 
        stateCount: 0, 
        weightedTotal: 0, 
        dominantType: 'none', 
        hasFatalities: false 
      } 
    },
    briefing: null,
    loading: true,
    error: null,
    lastUpdated: null,
    fallbackToRaw: false,
  })

  const fetchIntelligenceFresh = useCallback(async () => {
    const cacheKey = getCacheKey(location, state)
    
    setData(prev => ({ ...prev, loading: true, error: null }))

    try {
      // Step 1: Fetch raw articles from GDELT (use existing function)
      const reports = await fetchAreaReports(location, null, state)
      const articles = reports.articles || []

      // Step 2: Analyze incidents with LLM (even if no articles, we'll generate a briefing)
      let classifiedIncidents: ClassifiedIncident[] = []
      let briefing: Briefing | null = null
      let llmError = false

      // Only analyze if we have articles
      if (articles.length > 0) {
        try {
          // Run LLM analysis
          const analyzeResponse = await fetch('/api/analyze-incidents', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              headlines: articles.map(a => ({
                title: a.title,
                url: a.url,
                seendate: a.seendate,
              }))
            }),
          })

          if (analyzeResponse.ok) {
            const { incidents: analyzed } = await analyzeResponse.json()
            
          if (Array.isArray(analyzed) && analyzed.length > 0) {
            // Step 3: Add relevance scoring to each incident
            classifiedIncidents = analyzed.map((incident: any) => {
              const zone = incident.location_extracted 
                ? getRelevanceZone(location, incident.location_extracted, state)
                : 'same_state'

              return {
                ...incident,
                relevance: {
                  zone,
                  score: getRelevanceScore(zone),
                  label: getZoneLabel(zone),
                },
              }
            })
            
            // Sort by full timestamp (date + time) - most recent first
            // This ensures proper ordering before grouping
            classifiedIncidents.sort((a, b) => {
              const dateA = parseGDELTDate(a.date)
              const dateB = parseGDELTDate(b.date)
              return dateB.getTime() - dateA.getTime() // Descending (newest first)
            })
            }
            // Note: If analyzed.length === 0, classifiedIncidents stays empty
            // We'll still generate a briefing below
          } else {
            // LLM API failed - will still try to generate briefing
            llmError = true
          }
        } catch (error) {
          console.warn('LLM analysis failed, will still attempt briefing:', error)
          llmError = true
        }
      }

      // Step 3: Group incidents by zone (always do this, even with 0 incidents)
      const groupedIncidents = groupIncidentsByZone(classifiedIncidents)

      // Step 4: Calculate risk score (or default if no incidents)
      const riskScore = classifiedIncidents.length > 0
        ? calculateRiskScore(classifiedIncidents)
        : {
            score: 1.5,
            level: 'low' as const,
            confidence: 'medium' as const,
            methodology: 'No incidents found',
            breakdown: {
              immediateCount: 0,
              nearbyCount: 0,
              regionalCount: 0,
              stateCount: 0,
              weightedTotal: 0,
              dominantType: 'none',
              hasFatalities: false,
            },
          }

      // Step 4.5: Calculate dynamic risk adjustment (if static risk level provided)
      let dynamicRisk: DynamicRiskResult | undefined = undefined
      if (staticRiskLevel) {
        // Determine time window days from risk level
        const timeWindow = getTimeWindowForRisk(staticRiskLevel)
        const timeWindowDays = timeWindow === '30d' ? 30 : 
                              timeWindow === '21d' ? 21 : 
                              timeWindow === '14d' ? 14 : 7
        
        dynamicRisk = calculateDynamicRisk(
          staticRiskLevel,
          classifiedIncidents,
          timeWindowDays
        )
      }

      // Step 5: ALWAYS generate briefing with LLM (even with 0 incidents)
      // This ensures consistent intelligence display for all locations
      // Pass dynamicRisk for historical context in briefing
      try {
        const briefingResponse = await fetch('/api/generate-briefing', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'area',
            location,
            incidents: classifiedIncidents, // Can be empty array
            riskScore,
            staticProfile: areaProfile,
            dynamicRisk,  // Pass dynamic risk for historical context
          }),
        })

        if (briefingResponse.ok) {
          const { briefing: briefingData } = await briefingResponse.json()
          if (briefingData) {
            briefing = briefingData
          }
        } else {
          console.warn('Briefing generation failed with status:', briefingResponse.status)
          // Continue without briefing (will show fallback)
        }
      } catch (briefingError) {
        console.warn('Briefing generation failed, continuing without it:', briefingError)
        // Continue without briefing (will show fallback)
      }

      const result: LiveIntelligenceData = {
        incidents: classifiedIncidents,
        groupedIncidents,
        riskScore,
        dynamicRisk,  // Include dynamic risk adjustment
        briefing,
        loading: false,
        error: llmError ? 'LLM intelligence unavailable, showing raw reports.' : null,
        lastUpdated: new Date().toISOString(),
        fallbackToRaw: llmError,
        rawArticles: llmError ? articles : undefined,
      }

      // Cache the result
      setCache(cacheKey, result)
      setData(result)

    } catch (error) {
      console.error('Intelligence fetch error:', error)
      setData(prev => ({
        ...prev,
        loading: false,
        error: 'Failed to load intelligence',
        fallbackToRaw: true,
      }))
    }
  }, [location, state, areaProfile, staticRiskLevel])

  const fetchIntelligence = useCallback(async () => {
    const cacheKey = getCacheKey(location, state)

    // Check cache first
    const cached = getCache(cacheKey)
    if (cached) {
      setData({ ...cached, loading: false })
      // Still refresh in background if stale (older than 30 min)
      const cacheAge = cached.lastUpdated 
        ? Date.now() - new Date(cached.lastUpdated).getTime()
        : Infinity
      if (cacheAge > 30 * 60 * 1000) {
        // Refresh in background (don't await)
        fetchIntelligenceFresh().catch(() => {})
      }
      return
    }

    await fetchIntelligenceFresh()
  }, [location, state, fetchIntelligenceFresh])

  useEffect(() => {
    if (location && state) {
      fetchIntelligence()
    }
  }, [location, state, fetchIntelligence])

  return {
    ...data,
    refresh: fetchIntelligenceFresh,
  }
}

