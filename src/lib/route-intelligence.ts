// ROUTE INTELLIGENCE SYSTEM - Implementation for Next.js

'use client'

// Type definitions
interface StateRisk {
  risk_level: string
  risk_score: number
}

interface DangerousRoad {
  name: string
  risk: string
  danger_zones: string[]
  alternative: string
}

interface SafetyRecommendation {
  summary: string
  recommendations: string[]
  travel_advisory: string
}

interface RoutingData {
  state_adjacency: Record<string, string[]>
  cities_to_states?: Record<string, string>
}

interface StateRisksData {
  [stateId: string]: StateRisk
}

interface DangerousRoadsData {
  [key: string]: DangerousRoad
}

interface SafetyRecommendationsData {
  [riskLevel: string]: SafetyRecommendation
}

// Cache for loaded data
let routingData: RoutingData | null = null
let stateRisksData: StateRisksData | null = null
let dangerousRoadsData: DangerousRoadsData | null = null
let safetyRecommendationsData: SafetyRecommendationsData | null = null

async function loadData() {
  if (routingData && stateRisksData && dangerousRoadsData && safetyRecommendationsData) {
    return { routingData, stateRisksData, dangerousRoadsData, safetyRecommendationsData }
  }

  const [routing, stateRisks, dangerousRoads, safetyRecommendations] = await Promise.all([
    fetch('/data/routing.json').then(r => r.json()),
    fetch('/data/state-risks.json').then(r => r.json()),
    fetch('/data/dangerous-roads-lookup.json').then(r => r.json()),
    fetch('/data/safety-recommendations.json').then(r => r.json()),
  ])

  routingData = routing
  stateRisksData = stateRisks
  dangerousRoadsData = dangerousRoads
  safetyRecommendationsData = safetyRecommendations

  return { routingData, stateRisksData, dangerousRoadsData, safetyRecommendationsData }
}

// 1. PATHFINDING FUNCTION
function findRoute(fromState: string, toState: string, adjacency: Record<string, string[]>): string[] | null {
  if (fromState === toState) return [fromState]

  const visited = new Set<string>()
  const queue: [string, string[]][] = [[fromState, [fromState]]]

  while (queue.length > 0) {
    const [current, path] = queue.shift()!

    if (visited.has(current)) continue
    visited.add(current)

    const neighbors = adjacency[current] || []
    for (const neighbor of neighbors) {
      if (neighbor === toState) {
        return [...path, neighbor]
      }
      if (!visited.has(neighbor)) {
        queue.push([neighbor, [...path, neighbor]])
      }
    }
  }

  return null
}

// 2. RISK CALCULATION
function calculateRouteRisk(route: string[], risks: StateRisksData) {
  const riskScoreMap: Record<string, number> = {
    "EXTREME": 100,
    "VERY HIGH": 80,
    "HIGH": 60,
    "MODERATE": 40,
    "LOW": 20
  }

  const routeRisks = route.map(state => ({
    state,
    riskLevel: risks[state]?.risk_level || "MODERATE",
    riskScore: risks[state]?.risk_score || riskScoreMap[risks[state]?.risk_level || "MODERATE"] || 40
  }))

  const scores = routeRisks.map(r => r.riskScore)
  const maxRisk = Math.max(...scores)
  const avgRisk = scores.reduce((a, b) => a + b, 0) / scores.length
  const highRiskCount = routeRisks.filter(r =>
    ["EXTREME", "VERY HIGH"].includes(r.riskLevel)
  ).length

  const compositeScore = (maxRisk * 0.6) + (avgRisk * 0.3) + (highRiskCount * 5 * 0.1)

  let overallRisk: string
  if (compositeScore >= 85) overallRisk = "EXTREME"
  else if (compositeScore >= 70) overallRisk = "VERY HIGH"
  else if (compositeScore >= 55) overallRisk = "HIGH"
  else if (compositeScore >= 40) overallRisk = "MODERATE"
  else overallRisk = "LOW"

  return {
    overallRisk,
    riskScore: Math.round(compositeScore),
    routeRisks,
    highestRisk: routeRisks.reduce((max, r) => r.riskScore > max.riskScore ? r : max)
  }
}

// 3. CHECK FOR KNOWN DANGEROUS ROADS
function getDangerousRoadsOnRoute(route: string[], roads: DangerousRoadsData): DangerousRoad[] {
  const dangerous: DangerousRoad[] = []

  for (let i = 0; i < route.length - 1; i++) {
    const key = `${route[i]}_${route[i + 1]}`
    if (roads[key]) {
      dangerous.push(roads[key])
    }
  }

  return dangerous
}

// 4. MAIN ROUTE CHECK FUNCTION
export async function checkRouteSafety(from: string, to: string) {
  try {
    const { routingData, stateRisksData, dangerousRoadsData, safetyRecommendationsData } = await loadData()

    if (!routingData || !stateRisksData || !dangerousRoadsData || !safetyRecommendationsData) {
      return null
    }

    const citiesToStates = routingData.cities_to_states || {}
    const adjacency = routingData.state_adjacency || {}

    // Normalize inputs - handle city names and state IDs
    const fromNorm = from.toLowerCase().replace(/ /g, "-")
    const toNorm = to.toLowerCase().replace(/ /g, "-")

    // Get states - check cities first, then try direct match
    let fromState = citiesToStates[fromNorm] || fromNorm
    let toState = citiesToStates[toNorm] || toNorm

    // Validate
    if (!adjacency[fromState]) {
      return null
    }
    if (!adjacency[toState]) {
      return null
    }

    // Find route
    const route = findRoute(fromState, toState, adjacency)
    if (!route) return null

    // Calculate risk
    const riskAssessment = calculateRouteRisk(route, stateRisksData)

    // Check for known dangerous roads
    const dangerousRoadsOnRoute = getDangerousRoadsOnRoute(route, dangerousRoadsData)

    // Escalate if known dangerous road
    let finalRisk = riskAssessment.overallRisk
    let finalScore = riskAssessment.riskScore

    if (dangerousRoadsOnRoute.length > 0) {
      const riskScoreMap: Record<string, number> = { "EXTREME": 100, "VERY HIGH": 80, "HIGH": 60 }
      type RoadWithScore = DangerousRoad & { score: number }
      const mostDangerous = dangerousRoadsOnRoute.reduce<RoadWithScore>((max, road) => {
        const score = riskScoreMap[road.risk] || 40
        return score > max.score ? { ...road, score } : max
      }, { score: 0, risk: "", name: "", danger_zones: [] as string[], alternative: "" } as RoadWithScore)

      if (mostDangerous.score > finalScore) {
        finalRisk = mostDangerous.risk
        finalScore = mostDangerous.score
      }
    }

    // Get recommendations
    const safetyRecommendations = safetyRecommendationsData[finalRisk]

    // Determine confidence
    const confidence = route.length <= 4 ? "VERIFIED" : route.length <= 6 ? "ESTIMATED" : "LOW_CONFIDENCE"

    // Format state names
    const formatName = (s: string) => s.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")

    return {
      from,
      to,
      route: route.map(formatName),
      routeDisplay: route.map(formatName).join(" → "),
      routeSummary: route.map(formatName).join(" → "),
      overallRisk: finalRisk,
      riskScore: finalScore,
      confidence,
      stateBreakdown: riskAssessment.routeRisks.map(r => ({
        state: formatName(r.state),
        name: formatName(r.state),
        stateId: r.state,
        id: r.state,
        riskLevel: r.riskLevel
      })),
      highestRiskState: {
        state: formatName(riskAssessment.highestRisk.state),
        name: formatName(riskAssessment.highestRisk.state),
        id: riskAssessment.highestRisk.state,
        riskLevel: riskAssessment.highestRisk.riskLevel
      },
      highestRiskSegment: {
        state: formatName(riskAssessment.highestRisk.state),
        riskLevel: riskAssessment.highestRisk.riskLevel
      },
      dangerousRoads: dangerousRoadsOnRoute.map(road => ({
        name: road.name,
        roadId: road.name.toLowerCase().replace(/ /g, "-"),
        riskLevel: road.risk as any,
        dangerZones: road.danger_zones,
        recommendation: road.alternative
      })),
      recommendations: safetyRecommendations ? {
        primary: safetyRecommendations.summary || "Take standard travel precautions.",
        alternatives: safetyRecommendations.recommendations || [],
        ifMustTravel: safetyRecommendations.travel_advisory 
          ? [safetyRecommendations.travel_advisory]
          : []
      } : {
        primary: "Take standard travel precautions.",
        alternatives: [],
        ifMustTravel: []
      },
      methodology: "Risk calculated based on state risk levels, known dangerous roads, and verified incident data."
    }
  } catch (error) {
    console.error('Error checking route safety:', error)
    return null
  }
}
