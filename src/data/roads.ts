export interface RoadData {
  name: string
  slug: string
  alias?: string
  states: string[]
  riskLevel: 'EXTREME' | 'VERY HIGH' | 'HIGH' | 'MODERATE'
  description: string
  dangerZones: string[]
  alternative?: string
}

// Empty array for now - will be populated via data hook
export const roadsData: RoadData[] = []

export function getRoadBySlug(slug: string): RoadData | undefined {
  return roadsData.find(road => road.slug === slug)
}

export function getRoadsByState(stateName: string): RoadData[] {
  return roadsData.filter(road => 
    road.states.some(s => s.toLowerCase().includes(stateName.toLowerCase()))
  )
}
