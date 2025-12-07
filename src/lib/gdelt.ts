// GDELT API client for live security incident reports
// Direct client-side fetch with localStorage caching
// Enhanced with intelligent incident filtering to ensure quality reports

import { getTimeWindowForRisk, getMaxArticlesForRisk } from './risk-time-windows'
import type { RoadInfo } from './road-mapping'

export interface GDELTArticle {
  title: string
  url: string
  seendate: string
  domain: string
  incidentScore?: number // Score indicating likelihood of being a real incident
}

// ============================================================================
// INCIDENT KEYWORD SCORING SYSTEM
// Comprehensive coverage of Nigerian security incident types
// ============================================================================

// Incident-specific keywords for GDELT query (replaces generic "security")
const GDELT_INCIDENT_KEYWORDS = [
  'killed', 'kidnapped', 'attacked', 'robbery', 'gunmen', 'bandits',
  'explosion', 'kidnapping', 'abducted', 'shot', 'shooting', 'bombing',
  'cultists', 'terrorists', 'insurgents', 'Boko Haram', 'ISWAP',
  'murdered', 'hostage', 'ransom', 'ambush', 'clash', 'violence'
].join(' OR ')

/**
 * Calculate incident relevance score for a headline
 * Higher score = more likely to be a real security incident
 * Returns score from -100 to +100
 */
export function calculateIncidentScore(headline: string): number {
  if (!headline) return -100
  
  const h = headline.toLowerCase()
  let score = 0
  
  // ========== STRONG INCIDENT INDICATORS (+25-35 points each) ==========
  
  // Killings/Deaths (highest signal)
  if (/\b(killed|kills|killing)\b/.test(h)) score += 35
  if (/\b(dead|death|dies|died)\b/.test(h)) score += 30
  if (/\b(murdered|murder|slain)\b/.test(h)) score += 35
  if (/\bgunned down\b/.test(h)) score += 35
  if (/\bshot dead\b/.test(h)) score += 35
  if (/\b(beheaded|dismembered|executed)\b/.test(h)) score += 35
  if (/\b(lynched|mob justice)\b/.test(h)) score += 30
  
  // Kidnapping/Abduction
  if (/\b(kidnap|kidnapped|kidnapping|kidnaps)\b/.test(h)) score += 35
  if (/\b(abduct|abducted|abduction|abducts)\b/.test(h)) score += 35
  if (/\bhostage\b/.test(h)) score += 30
  if (/\bransom\b/.test(h)) score += 30
  if (/\b(rescued|freed|released)\b/.test(h) && /\b(victim|hostage|kidnap)\b/.test(h)) score += 25
  
  // Armed Robbery
  if (/\b(robbery|robbed|robbers|robbing)\b/.test(h)) score += 30
  if (/\barmed robbery\b/.test(h)) score += 35
  if (/\b(thieves|stolen|theft)\b/.test(h)) score += 20
  if (/\bcar snatching\b/.test(h)) score += 30
  if (/\bcarjack/.test(h)) score += 30
  if (/\bone chance\b/.test(h)) score += 30 // Nigerian term
  
  // Armed Groups/Actors
  if (/\b(gunmen|gunman)\b/.test(h)) score += 35
  if (/\b(bandits|banditry)\b/.test(h)) score += 35
  if (/\b(cultists|cultist)\b/.test(h)) score += 30
  if (/\bcult clash\b/.test(h)) score += 35
  if (/\b(insurgents|insurgent|insurgency)\b/.test(h)) score += 30
  if (/\b(terrorists|terrorist|terrorism)\b/.test(h)) score += 30
  if (/\b(hoodlums|miscreants)\b/.test(h)) score += 25
  if (/\barmed (men|gang)\b/.test(h)) score += 30
  
  // Specific Terror Groups
  if (/\bboko haram\b/.test(h)) score += 35
  if (/\biswap\b/.test(h)) score += 35
  if (/\bjihadist/.test(h)) score += 30
  
  // Cult Names (Nigerian university/street cults)
  if (/\b(eiye|black axe|buccaneer|vikings|aye|neo black)\b/.test(h)) score += 30
  
  // Attack Types
  if (/\b(attack|attacked|attacking|attacks)\b/.test(h)) score += 25
  if (/\b(ambush|ambushed)\b/.test(h)) score += 30
  if (/\b(raid|raided|raiding)\b/.test(h)) score += 25
  if (/\b(invasion|invaded)\b/.test(h)) score += 25
  if (/\b(explosion|exploded|explodes)\b/.test(h)) score += 30
  if (/\b(bomb|bombing|bombed|bomber)\b/.test(h)) score += 35
  if (/\b(blast|blasts)\b/.test(h)) score += 30
  if (/\bied\b/.test(h)) score += 35
  if (/\bsuicide bomb/.test(h)) score += 35
  if (/\b(shot|shooting|shots fired|gunfire|gunshot)\b/.test(h)) score += 30
  if (/\b(stabbed|stabbing|machete|cutlass)\b/.test(h)) score += 25
  
  // ========== MEDIUM INCIDENT INDICATORS (+15-20 points each) ==========
  
  // Outcomes/Results
  if (/\b(injured|injuries|wounded)\b/.test(h)) score += 20
  if (/\b(hospitalized|hospital)\b/.test(h) && /\b(victim|attack|shot|stab)\b/.test(h)) score += 15
  if (/\b(arrested|apprehended|nabbed|caught)\b/.test(h)) score += 15
  if (/\b(rescued|saved|freed)\b/.test(h)) score += 15
  if (/\b(fled|escape|escaped)\b/.test(h)) score += 10
  
  // Herder-Farmer Conflicts
  if (/\b(herders|herdsmen)\b/.test(h)) score += 20
  if (/\bfulani\b/.test(h) && /\b(attack|clash|kill|herd)\b/.test(h)) score += 25
  if (/\b(farmers|herders) clash\b/.test(h)) score += 30
  if (/\bcattle rustl/.test(h)) score += 25
  
  // Communal/Ethnic Violence
  if (/\bcommunal clash\b/.test(h)) score += 25
  if (/\bethnic (clash|violence|crisis)\b/.test(h)) score += 25
  if (/\btribal (war|clash)\b/.test(h)) score += 25
  
  // Civil Unrest
  if (/\b(clash|clashes|clashed)\b/.test(h)) score += 20
  if (/\b(riot|riots|rioting)\b/.test(h)) score += 20
  if (/\b(protest|protesters)\b/.test(h) && /\b(kill|shot|injur|violen|clash)\b/.test(h)) score += 20
  if (/\b(unrest|crisis)\b/.test(h)) score += 15
  if (/\bendsars\b/.test(h)) score += 20
  if (/\bpolice brutal/.test(h)) score += 20
  
  // Accidents/Disasters
  if (/\b(accident|accidents)\b/.test(h)) score += 20
  if (/\b(crash|crashed|crashes)\b/.test(h)) score += 20
  if (/\b(collision|collided)\b/.test(h)) score += 20
  if (/\bfire outbreak\b/.test(h)) score += 25
  if (/\b(inferno|burnt|gutted|engulfed)\b/.test(h)) score += 20
  if (/\b(collapse|collapsed)\b/.test(h)) score += 20
  if (/\btanker (explosion|fire)\b/.test(h)) score += 25
  
  // Maritime/Oil
  if (/\b(pirates|piracy|pirate)\b/.test(h)) score += 25
  if (/\bsea pirates\b/.test(h)) score += 30
  if (/\bpipeline (vandal|explosion|fire)\b/.test(h)) score += 25
  if (/\billegal refin/.test(h)) score += 20
  if (/\bbunker/.test(h) && /\b(oil|crude|explo)\b/.test(h)) score += 20
  
  // ========== WEAK BUT RELEVANT INDICATORS (+5-10 points each) ==========
  
  if (/\b(police|army|military|soldiers|troops)\b/.test(h)) score += 5
  if (/\b(victim|victims)\b/.test(h)) score += 10
  if (/\b(suspect|suspects)\b/.test(h)) score += 10
  if (/\b(corpse|body found|bodies)\b/.test(h)) score += 15
  if (/\b(missing|disappear)\b/.test(h)) score += 10
  if (/\b(threat|threatened)\b/.test(h)) score += 5
  if (/\b(violence|violent)\b/.test(h)) score += 10
  if (/\b(danger|dangerous)\b/.test(h)) score += 5
  if (/\b(emergency|rescue)\b/.test(h)) score += 10
  
  // ========== STRONG NON-INCIDENT PENALTIES (-30 to -50 points each) ==========
  
  // Political/Government (NOT incidents unless someone was attacked)
  if (/\bminister\b/.test(h) && !/\b(attack|kill|kidnap|shot)\b/.test(h)) score -= 50
  if (/\bministry\b/.test(h) && !/\b(attack|bomb|fire)\b/.test(h)) score -= 40
  if (/\b(policy|policies)\b/.test(h)) score -= 50
  if (/\bblueprint\b/.test(h)) score -= 50
  if (/\b(parliament|assembly|senate)\b/.test(h) && !/\b(attack|bomb)\b/.test(h)) score -= 40
  if (/\b(election|electoral|campaign|vote|ballot|poll)\b/.test(h) && !/\b(violen|kill|attack)\b/.test(h)) score -= 45
  if (/\b(inaugurate|swear.?in|appointment|appointed|nominated)\b/.test(h)) score -= 50
  if (/\b(budget|appropriation)\b/.test(h)) score -= 40
  
  // Opinion/Praise Articles (definitely NOT incidents)
  if (/\b(hails|commends|praises|lauds|applauds)\b/.test(h)) score -= 50
  if (/\b(opinion|editorial|commentary)\b/.test(h)) score -= 50
  if (/\burged\b/.test(h) && !/\b(flee|evacuat)\b/.test(h)) score -= 40
  if (/\bcalls on\b/.test(h)) score -= 40
  if (/\badvises\b/.test(h)) score -= 35
  if (/what .{1,40} must/i.test(headline)) score -= 50
  if (/how to (tackle|fight|address|solve|curb|end)/i.test(headline)) score -= 50
  if (/challenges (before|facing|of)/i.test(headline)) score -= 50
  if (/need to (address|tackle|fight)/i.test(headline)) score -= 45
  if (/\bway forward\b/.test(h)) score -= 40
  if (/\bsolution to\b/.test(h)) score -= 40
  
  // Military/Security Praise (NOT incidents)
  if (/\b(hails|commends|praises) (troops|military|army|police|soldiers)\b/.test(h)) score -= 50
  if (/\bwar on terror\b/.test(h) && !/\b(kill|attack|bomb|casualt)\b/.test(h)) score -= 40
  if (/\btackling insecurity\b/.test(h) && !/\b(kill|attack)\b/.test(h)) score -= 40
  if (/\b(boost|strengthen|enhance) security\b/.test(h)) score -= 35
  
  // Sports/Entertainment
  if (/\b(football|soccer|super eagles|match|fifa|league|goal|scored)\b/.test(h)) score -= 50
  if (/\b(nollywood|movie|film|actor|actress)\b/.test(h)) score -= 50
  if (/\b(bbnaija|big brother|concert|music|album|song)\b/.test(h)) score -= 50
  if (/\b(wedding|birthday|celebration|festival)\b/.test(h) && !/\b(attack|bomb|kill)\b/.test(h)) score -= 40
  
  // Economic/Business (unless incident-related)
  if (/\b(naira|dollar|exchange rate|forex)\b/.test(h) && !/\b(rob|stolen|fraud)\b/.test(h)) score -= 40
  if (/\b(stock|market|trading|shares)\b/.test(h)) score -= 40
  if (/\b(gdp|inflation|economy|economic)\b/.test(h) && !/\b(crisis|violen)\b/.test(h)) score -= 35
  if (/\boil price\b/.test(h)) score -= 35
  
  // Awards/Achievements
  if (/\b(award|awarded|wins|winner|honour|honored)\b/.test(h) && !/\b(rescue|brav)\b/.test(h)) score -= 45
  if (/\b(achievement|achieves|success|successful)\b/.test(h)) score -= 40
  
  // Religious (unless incident)
  if (/\b(sermon|preach|pastor|imam|church|mosque)\b/.test(h) && !/\b(attack|bomb|burn|kill)\b/.test(h)) score -= 35
  
  // International Relations (unless incident)
  if (/\b(diplomat|embassy|ambassador)\b/.test(h) && !/\b(attack|kidnap|threat)\b/.test(h)) score -= 30
  if (/\b(visit|meets|summit|conference)\b/.test(h) && !/\b(attack|secur incident)\b/.test(h)) score -= 30
  
  return score
}

/**
 * Filter articles to only include likely security incidents
 * Uses scoring threshold to maintain quality
 */
export function filterIncidentArticles(articles: GDELTArticle[], minScore: number = 15): GDELTArticle[] {
  return articles
    .map(article => ({
      ...article,
      incidentScore: calculateIncidentScore(article.title)
    }))
    .filter(article => (article.incidentScore ?? 0) >= minScore)
    .sort((a, b) => {
      // Sort by score first (higher = more relevant), then by date
      const scoreDiff = (b.incidentScore ?? 0) - (a.incidentScore ?? 0)
      if (scoreDiff !== 0) return scoreDiff
      const dateA = parseInt(a.seendate) || 0
      const dateB = parseInt(b.seendate) || 0
      return dateB - dateA
    })
}

/**
 * Check if a headline is likely a real incident (quick boolean check)
 */
export function isLikelyIncident(headline: string): boolean {
  return calculateIncidentScore(headline) >= 15
}

export interface LiveReportsData {
  articles: GDELTArticle[]
  error: string | null
  cached: boolean
  lastUpdated: string
  level?: 'area' | 'zone' | 'state'
  query?: string
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
  let query: string = locationId
  let error: string | null = null
  
  try {
    // Level 1: Area-specific query with incident-focused keywords
    const areaQuery = `${locationId} Nigeria (${GDELT_INCIDENT_KEYWORDS})`
    let rawArticles = await fetchGDELTArticles(areaQuery, maxArticles * 2) // Fetch more to allow filtering
    articles = filterIncidentArticles(rawArticles, 15) // Filter to real incidents
    
    // Level 2: Zone query if area has < 2 quality results
    if (articles.length < 2 && zone) {
      const zoneQuery = `${zone} Nigeria (${GDELT_INCIDENT_KEYWORDS})`
      rawArticles = await fetchGDELTArticles(zoneQuery, maxArticles * 2)
      const zoneArticles = filterIncidentArticles(rawArticles, 15)
      if (zoneArticles.length >= 2) {
        articles = zoneArticles
        level = 'zone'
        query = zone
      }
    }
    
    // Level 3: State query if zone has < 2 quality results
    if (articles.length < 2) {
      const stateQuery = `${state} Nigeria (${GDELT_INCIDENT_KEYWORDS})`
      rawArticles = await fetchGDELTArticles(stateQuery, maxArticles * 2)
      const stateArticles = filterIncidentArticles(rawArticles, 15)
      if (stateArticles.length >= 2) {
        articles = stateArticles
        level = 'state'
        query = state
      }
    }
    
    // Sort by incident score (most relevant first), then by date
    articles.sort((a, b) => {
      const scoreDiff = (b.incidentScore ?? 0) - (a.incidentScore ?? 0)
      if (Math.abs(scoreDiff) > 10) return scoreDiff // Prioritize higher scoring
      const dateA = parseInt(a.seendate) || 0
      const dateB = parseInt(b.seendate) || 0
      return dateB - dateA
    })
    
    // Limit to 5 most relevant incidents
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
    query,
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
      const query = `${queryTerms} Nigeria (${GDELT_INCIDENT_KEYWORDS})`
      const rawArticles = await fetchGDELTArticles(query, 50)
      
      // Filter to real incidents and sort by relevance
      const filteredArticles = filterIncidentArticles(rawArticles, 15)
      
      // Limit to 3 most relevant per road
      const slicedArticles = filteredArticles.slice(0, 3)
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
    const query = `${stateNames} Nigeria (${GDELT_INCIDENT_KEYWORDS})`
    const rawArticles = await fetchGDELTArticles(query, maxArticles * 2)
    
    // Filter to real incidents and sort by relevance
    const filteredArticles = filterIncidentArticles(rawArticles, 15)
    
    // Group by state (simplified - just create one entry for all states)
    const slicedArticles = filteredArticles.slice(0, 10)
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
