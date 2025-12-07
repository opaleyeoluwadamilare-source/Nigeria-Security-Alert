// GDELT API client for live security incident reports
// Direct client-side fetch with localStorage caching

import { getTimeWindowForRisk, getMaxArticlesForRisk } from './risk-time-windows'
import type { RoadInfo } from './road-mapping'

export interface GDELTArticle {
  title: string
  url: string
  seendate: string
  domain: string
}

export interface LiveReportsData {
  articles: GDELTArticle[]
  error: string | null
  cached: boolean
  lastUpdated: string
  level?: 'area' | 'zone' | 'state'
}

export interface RoadReportsData {
  name: string
  articles: GDELTArticle[]
  roadId: string
  roadName: string
  incidentCount: number
}

export interface RouteReportsData {
  roads: RoadReportsData[]
  error: string | null
  cached: boolean
  lastUpdated: string
  totalIncidents: number
}

const CACHE_DURATION = 60 * 60 * 1000 // 1 hour
const GDELT_API_BASE = 'https://api.gdeltproject.org/api/v2/doc/doc'
const REQUEST_DELAY = 300 // 300ms delay between requests

function getCacheKey(type: 'area' | 'route-states' | 'route-roads', ...args: string[]): string {
  return `live-reports-${type}-${args.join('-')}`
}

function getCachedData<T>(key: string): T | null {
  if (typeof window === 'undefined') return null
  
  try {
    const cached = localStorage.getItem(key)
    if (!cached) return null
    
    const { data, timestamp } = JSON.parse(cached)
    const now = Date.now()
    
    if (now - timestamp > CACHE_DURATION) {
      localStorage.removeItem(key)
      return null
    }
    
    return data
  } catch {
    return null
  }
}

function setCachedData<T>(key: string, data: T): void {
  if (typeof window === 'undefined') return
  
  try {
    const cacheEntry = {
      data,
      timestamp: Date.now(),
    }
    localStorage.setItem(key, JSON.stringify(cacheEntry))
  } catch (err) {
    // localStorage might be full, silently fail
  }
}

async function fetchGDELTArticles(
  query: string,
  maxArticles: number = 50
): Promise<GDELTArticle[]> {
  const params = new URLSearchParams({
    query: query,
    mode: 'artlist',
    maxrecords: maxArticles.toString(),
    format: 'json',
    timespan: '7d',
  })
  
  try {
    const response = await fetch(`${GDELT_API_BASE}?${params.toString()}`)
    
    if (!response.ok) {
      throw new Error(`GDELT API error: ${response.status}`)
    }
    
    const data = await response.json()
    
    if (!data.articles || !Array.isArray(data.articles)) {
      return []
    }
    
    return data.articles
      .filter((article: any) => article.title && article.url && article.seendate)
      .map((article: any) => ({
        title: article.title,
        url: article.url,
        seendate: article.seendate,
        domain: article.domain || new URL(article.url).hostname.replace('www.', ''),
      }))
      .slice(0, maxArticles)
  } catch (err) {
    console.error('GDELT fetch error:', err)
    return []
  }
}

export async function fetchAreaReports(
  locationId: string,
  zone: string | null,
  state: string,
  riskLevel?: string | null
): Promise<LiveReportsData> {
  const cacheKey = getCacheKey('area', locationId, state)
  const cached = getCachedData<LiveReportsData>(cacheKey)
  
  if (cached) {
    return { ...cached, cached: true }
  }
  
  const timeWindow = getTimeWindowForRisk(riskLevel)
  const maxArticles = getMaxArticlesForRisk(riskLevel)
  
  let articles: GDELTArticle[] = []
  let level: 'area' | 'zone' | 'state' = 'area'
  let error: string | null = null
  
  try {
    // Level 1: Area-specific query
    const areaQuery = `${locationId} Nigeria (security OR incident OR attack OR kidnapping OR robbery OR violence)`
    articles = await fetchGDELTArticles(areaQuery, maxArticles)
    
    // Level 2: Zone query if area has < 2 results
    if (articles.length < 2 && zone) {
      const zoneQuery = `${zone} Nigeria (security OR incident OR attack OR kidnapping OR robbery OR violence)`
      const zoneArticles = await fetchGDELTArticles(zoneQuery, maxArticles)
      if (zoneArticles.length >= 2) {
        articles = zoneArticles
        level = 'zone'
      }
    }
    
    // Level 3: State query if zone has < 2 results
    if (articles.length < 2) {
      const stateQuery = `${state} Nigeria (security OR incident OR attack OR kidnapping OR robbery OR violence)`
      const stateArticles = await fetchGDELTArticles(stateQuery, maxArticles)
      if (stateArticles.length >= 2) {
        articles = stateArticles
        level = 'state'
      }
    }
    
    // Sort by date (most recent first)
    articles.sort((a, b) => {
      const dateA = parseInt(a.seendate) || 0
      const dateB = parseInt(b.seendate) || 0
      return dateB - dateA
    })
    
    // Limit to 5 most recent
    articles = articles.slice(0, 5)
  } catch (err) {
    error = err instanceof Error ? err.message : 'Failed to fetch reports'
  }
  
  const result: LiveReportsData = {
    articles,
    error,
    cached: false,
    lastUpdated: new Date().toISOString(),
    level,
  }
  
  setCachedData(cacheKey, result)
  return result
}

export async function fetchRouteReports(
  roads: RoadInfo[]
): Promise<RouteReportsData> {
  if (roads.length === 0) {
    return {
      roads: [],
      error: null,
      cached: false,
      lastUpdated: new Date().toISOString(),
      totalIncidents: 0,
    }
  }
  
  const cacheKey = getCacheKey('route-roads', ...roads.map(r => r.id).sort())
  const cached = getCachedData<RouteReportsData>(cacheKey)
  
  if (cached) {
    return { ...cached, cached: true }
  }
  
  const roadReports: RoadReportsData[] = []
  let error: string | null = null
  
  try {
    for (let i = 0; i < roads.length; i++) {
      const road = roads[i]
      
      if (i > 0) {
        await new Promise(resolve => setTimeout(resolve, REQUEST_DELAY))
      }
      
      const queryTerms = road.queryTerms.join(' OR ')
      const query = `${queryTerms} Nigeria (security OR incident OR attack OR kidnapping OR robbery OR violence)`
      const articles = await fetchGDELTArticles(query, 50)
      
      // Sort by date (most recent first)
      articles.sort((a, b) => {
        const dateA = parseInt(a.seendate) || 0
        const dateB = parseInt(b.seendate) || 0
        return dateB - dateA
      })
      
      // Limit to 3 most recent per road
      const slicedArticles = articles.slice(0, 3)
      roadReports.push({
        name: road.name,
        articles: slicedArticles,
        roadId: road.id,
        roadName: road.name,
        incidentCount: slicedArticles.length,
      })
    }
  } catch (err) {
    error = err instanceof Error ? err.message : 'Failed to fetch route reports'
  }
  
  const totalIncidents = roadReports.reduce((sum, road) => sum + road.incidentCount, 0)
  
  const result: RouteReportsData = {
    roads: roadReports,
    error,
    cached: false,
    lastUpdated: new Date().toISOString(),
    totalIncidents,
  }
  
  setCachedData(cacheKey, result)
  return result
}

export async function fetchRouteReportsByStates(
  stateIds: string[],
  riskLevel?: string | null
): Promise<RouteReportsData> {
  if (stateIds.length === 0) {
    return {
      roads: [],
      error: null,
      cached: false,
      lastUpdated: new Date().toISOString(),
      totalIncidents: 0,
    }
  }
  
  const stateKey = stateIds.sort().join('-')
  const cacheKey = getCacheKey('route-states', stateKey)
  const cached = getCachedData<RouteReportsData>(cacheKey)
  
  if (cached) {
    return { ...cached, cached: true }
  }
  
  const timeWindow = getTimeWindowForRisk(riskLevel)
  const maxArticles = getMaxArticlesForRisk(riskLevel)
  
  const roadReports: RoadReportsData[] = []
  let error: string | null = null
  
  try {
    const stateNames = stateIds.map(id => id.charAt(0).toUpperCase() + id.slice(1)).join(' OR ')
    const query = `${stateNames} Nigeria (security OR incident OR attack OR kidnapping OR robbery OR violence)`
    const articles = await fetchGDELTArticles(query, maxArticles)
    
    // Sort by date (most recent first)
    articles.sort((a, b) => {
      const dateA = parseInt(a.seendate) || 0
      const dateB = parseInt(b.seendate) || 0
      return dateB - dateA
    })
    
    // Group by state (simplified - just create one entry for all states)
    const slicedArticles = articles.slice(0, 10)
    const roadName = `${stateIds.length} state${stateIds.length > 1 ? 's' : ''} along route`
    roadReports.push({
      name: roadName,
      articles: slicedArticles,
      roadId: `states-${stateIds.sort().join('-')}`,
      roadName,
      incidentCount: slicedArticles.length,
    })
  } catch (err) {
    error = err instanceof Error ? err.message : 'Failed to fetch route reports'
  }
  
  const totalIncidents = roadReports.reduce((sum, road) => sum + road.incidentCount, 0)
  
  const result: RouteReportsData = {
    roads: roadReports,
    error,
    cached: false,
    lastUpdated: new Date().toISOString(),
    totalIncidents,
  }
  
  setCachedData(cacheKey, result)
  return result
}

export function formatSeenDate(seendate: string): string {
  if (!seendate || seendate.length < 8) return 'Unknown date'
  
  try {
    const year = seendate.slice(0, 4)
    const month = seendate.slice(4, 6)
    const day = seendate.slice(6, 8)
    
    const date = new Date(`${year}-${month}-${day}`)
    if (isNaN(date.getTime())) return 'Unknown date'
    
    const now = new Date()
    const diffTime = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays} days ago`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`
    return `${Math.floor(diffDays / 365)} years ago`
  } catch {
    return 'Unknown date'
  }
}

export function formatLastUpdated(isoString: string): string {
  try {
    const date = new Date(isoString)
    if (isNaN(date.getTime())) return 'Unknown'
    
    const now = new Date()
    const diffTime = now.getTime() - date.getTime()
    const diffMinutes = Math.floor(diffTime / (1000 * 60))
    
    if (diffMinutes < 1) return 'Just now'
    if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`
    
    const diffHours = Math.floor(diffMinutes / 60)
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
    
    const diffDays = Math.floor(diffHours / 24)
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
    
    return date.toLocaleDateString()
  } catch {
    return 'Unknown'
  }
}

export function isBreakingNews(seendate: string): boolean {
  if (!seendate || seendate.length < 8) return false
  
  try {
    const year = seendate.slice(0, 4)
    const month = seendate.slice(4, 6)
    const day = seendate.slice(6, 8)
    
    const date = new Date(`${year}-${month}-${day}`)
    if (isNaN(date.getTime())) return false
    
    const now = new Date()
    const diffTime = now.getTime() - date.getTime()
    const diffHours = diffTime / (1000 * 60 * 60)
    
    // Breaking news = within last 24 hours
    return diffHours >= 0 && diffHours <= 24
  } catch {
    return false
  }
}
