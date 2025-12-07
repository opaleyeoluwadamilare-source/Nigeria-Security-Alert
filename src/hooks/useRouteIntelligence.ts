'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { fetchRouteReportsByStates, fetchRouteReports, GDELTArticle } from '@/lib/gdelt'
import { getRouteRelevanceZone, getRouteRelevanceScore, getRouteZoneLabel, getRouteRoadNamesForStates } from '@/lib/route-relevance'
import { 
  calculateRiskScore, 
  groupIncidentsByRouteZone, 
  parseGDELTDate, 
  calculateDynamicRisk,
  ClassifiedIncident, 
  RiskScoreResult,
  DynamicRiskResult 
} from '@/lib/risk-scoring'
import { getRoadsForRoute } from '@/lib/road-mapping'
import { getTimeWindowForRisk } from '@/lib/risk-time-windows'

interface RouteProfile {
  routeDisplay?: string
  overallRisk?: string
  dangerousRoads?: Array<{ name: string; riskLevel: string }>
  recommendations?: {
    primary: string
    alternatives: string[]
  }
}

interface RouteBriefing {
  summary: string
  for_travelers: {
    headline: string
    tips: string[]
    best_times?: string
    alternatives?: string[]
  }
  route_segments?: Array<{
    segment: string
    status: string
    incidents: string[]
  }>
  recent_developments: string[]
  positive_notes: string[]
  bottom_line: string
}

interface RouteIntelligenceData {
  incidents: ClassifiedIncident[]
  groupedIncidents: {
    onRoute: ClassifiedIncident[]
    routeState: ClassifiedIncident[]
    offRoute: ClassifiedIncident[]
  }
  riskScore: RiskScoreResult
  briefing: RouteBriefing | null
  loading: boolean
  error: string | null
  lastUpdated: string | null
  fallbackToRaw: boolean
  rawArticles?: GDELTArticle[]
  routeRoadNames: string[]
}

const CACHE_DURATION = 2 * 60 * 60 * 1000 // 2 hours (longer for LLM results)

function getCacheKey(stateIds: string[], routeDisplay: string): string {
  const stateKey = stateIds.sort().join('-')
  const routeKey = routeDisplay.toLowerCase().replace(/\s+/g, '-')
  return `route-intel-${stateKey}-${routeKey}`
}

function getCache(key: string): RouteIntelligenceData | null {
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

function setCache(key: string, data: RouteIntelligenceData): void {
  if (typeof window === 'undefined') return

  try {
    localStorage.setItem(key, JSON.stringify({
      data,
      timestamp: Date.now(),
    }))
  } catch (error) {
    // Storage full or unavailable - silently fail
    console.warn('Failed to cache route intelligence data:', error)
  }
}

export function useRouteIntelligence(
  stateIds: string[],
  routeDisplay: string,
  routeProfile?: RouteProfile,
  highestRiskLevel?: string | null
): RouteIntelligenceData & { refresh: () => Promise<void> } {

  const [data, setData] = useState<RouteIntelligenceData>({
    incidents: [],
    groupedIncidents: { onRoute: [], routeState: [], offRoute: [] },
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
    routeRoadNames: [],
  })

  const fetchIntelligenceFresh = useCallback(async () => {
    if (stateIds.length === 0) {
      setData(prev => ({ ...prev, loading: false }))
      return
    }

    const cacheKey = getCacheKey(stateIds, routeDisplay)
    
    setData(prev => ({ ...prev, loading: true, error: null }))

    try {
      // Step 1: Get route road names for relevance calculation
      const roads = getRoadsForRoute(stateIds)
      const routeRoadNames = getRouteRoadNamesForStates(stateIds)

      // Step 2: Fetch raw articles from GDELT
      // Try explicit road mappings first, fallback to state-based
      let reports
      if (roads.length > 0) {
        // Use explicit road mappings
        const { fetchRouteReports } = await import('@/lib/gdelt')
        reports = await fetchRouteReports(roads)
      } else {
        // Use state-based fallback
        reports = await fetchRouteReportsByStates(stateIds, highestRiskLevel || null)
      }

      // Collect all articles from all roads/states
      const allArticles: GDELTArticle[] = []
      if (reports.roads) {
        reports.roads.forEach((road: any) => {
          if (road.articles) {
            allArticles.push(...road.articles)
          }
        })
      }

      // Deduplicate by URL
      const articleMap = new Map<string, GDELTArticle>()
      allArticles.forEach(article => {
        if (!articleMap.has(article.url)) {
          articleMap.set(article.url, article)
        }
      })
      const uniqueArticles = Array.from(articleMap.values())

      if (uniqueArticles.length === 0) {
        const emptyResult: RouteIntelligenceData = {
          incidents: [],
          groupedIncidents: { onRoute: [], routeState: [], offRoute: [] },
          riskScore: { 
            score: 1.5, 
            level: 'low', 
            confidence: 'medium', 
            methodology: 'No incidents found', 
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
          loading: false,
          error: null,
          lastUpdated: new Date().toISOString(),
          fallbackToRaw: false,
          routeRoadNames,
        }
        setCache(cacheKey, emptyResult)
        setData(emptyResult)
        return
      }

      // Step 3: Analyze incidents with LLM
      let classifiedIncidents: ClassifiedIncident[] = []
      let briefing: RouteBriefing | null = null
      let llmError = false

      try {
        // Run LLM analysis
        const analyzeResponse = await fetch('/api/analyze-incidents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            headlines: uniqueArticles.map(a => ({
              title: a.title,
              url: a.url,
              seendate: a.seendate,
            }))
          }),
        })

        if (analyzeResponse.ok) {
          const { incidents: analyzed } = await analyzeResponse.json()
          
            if (Array.isArray(analyzed) && analyzed.length > 0) {
            // Step 4: Add route-specific relevance scoring to each incident
            classifiedIncidents = analyzed.map((incident: any) => {
              const zone = incident.location_extracted 
                ? getRouteRelevanceZone(incident.location_extracted, stateIds, routeRoadNames)
                : 'route_state'

              return {
                ...incident,
                relevance: {
                  zone,
                  score: getRouteRelevanceScore(zone),
                  label: getRouteZoneLabel(zone),
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

            // Step 5: Calculate risk score (using area function - works for routes too)
            const riskScore = calculateRiskScore(classifiedIncidents)

            // Step 5.5: Calculate dynamic risk adjustment for route (if highest risk level provided)
            let dynamicRisk: DynamicRiskResult | undefined = undefined
            if (highestRiskLevel) {
              // Determine time window days from risk level
              const timeWindow = getTimeWindowForRisk(highestRiskLevel)
              const timeWindowDays = timeWindow === '30d' ? 30 : 
                                    timeWindow === '21d' ? 21 : 
                                    timeWindow === '14d' ? 14 : 7
              
              dynamicRisk = calculateDynamicRisk(
                highestRiskLevel,
                classifiedIncidents,
                timeWindowDays
              )
            }

            // Step 6: Generate route briefing with LLM (pass dynamicRisk for historical context)
            try {
              const briefingResponse = await fetch('/api/generate-briefing', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  type: 'route',
                  location: routeDisplay,
                  incidents: classifiedIncidents,
                  riskScore,
                  staticProfile: routeProfile,
                  dynamicRisk,  // Pass dynamic risk for historical context
                  routeStateIds: stateIds,
                }),
              })

              if (briefingResponse.ok) {
                const { briefing: briefingData } = await briefingResponse.json()
                if (briefingData) {
                  briefing = briefingData
                }
              }
            } catch (briefingError) {
              console.warn('Route briefing generation failed, continuing without it:', briefingError)
              // Continue without briefing
            }
          } else {
            // LLM returned no valid incidents - use raw articles as fallback
            llmError = true
          }
        } else {
          // LLM API failed - use raw articles as fallback
          llmError = true
        }
      } catch (error) {
        console.warn('LLM analysis failed, falling back to raw articles:', error)
        llmError = true
      }

      // Step 7: Group incidents by route zone
      const groupedIncidents = groupIncidentsByRouteZone(classifiedIncidents)

      // Step 8: Calculate risk score (or default if no incidents)
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

      const result: RouteIntelligenceData = {
        incidents: classifiedIncidents,
        groupedIncidents,
        riskScore,
        briefing,
        loading: false,
        error: null,
        lastUpdated: new Date().toISOString(),
        fallbackToRaw: llmError,
        rawArticles: llmError ? uniqueArticles : undefined,
        routeRoadNames,
      }

      // Cache the result
      setCache(cacheKey, result)
      setData(result)

    } catch (error) {
      console.error('Route intelligence fetch error:', error)
      setData(prev => ({
        ...prev,
        loading: false,
        error: 'Failed to load route intelligence',
        fallbackToRaw: true,
      }))
    }
  }, [stateIds, routeDisplay, routeProfile, highestRiskLevel])

  const fetchIntelligence = useCallback(async () => {
    if (stateIds.length === 0) {
      setData(prev => ({ ...prev, loading: false }))
      return
    }

    const cacheKey = getCacheKey(stateIds, routeDisplay)

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
  }, [stateIds, routeDisplay, fetchIntelligenceFresh])

  const stateIdsKey = useMemo(() => stateIds.join(','), [stateIds])

  useEffect(() => {
    if (stateIds.length > 0) {
      fetchIntelligence()
    }
  }, [stateIdsKey, routeDisplay, fetchIntelligence])

  return {
    ...data,
    refresh: fetchIntelligenceFresh,
  }
}

