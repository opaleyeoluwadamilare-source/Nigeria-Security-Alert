// Raw JSON types (as stored in files)
interface StateJson {
  id: string
  name: string
  risk_level: 'EXTREME' | 'VERY HIGH' | 'HIGH' | 'MODERATE'
  risk_description: string
  deaths_2025: number
  incidents_2025: number
  high_risk_lgas: number
  key_stat: string
  region: string
}

interface LgaJson {
  id: string
  name: string
  state: string
  state_name: string
  risk_level: 'EXTREME' | 'VERY HIGH' | 'HIGH' | 'MODERATE'
  incidents_2025: string
  description: string
}

// App-facing types
export interface LGA {
  id: string
  name: string
  stateId: string
  stateName: string
  riskLevel: 'EXTREME' | 'VERY HIGH' | 'HIGH' | 'MODERATE'
  incidents: string
  description: string
}

export interface StateData {
  id: string
  name: string
  riskLevel: 'EXTREME' | 'VERY HIGH' | 'HIGH' | 'MODERATE'
  riskDescription: string
  deaths2025: number
  incidents2025: number
  highRiskLGAs: number
  keyStat: string
  region: string
  lgas?: LGA[]
  emergencyContacts?: {
    police?: string[]
    frsc?: string
    hospital?: string
  }
}

// For now, export empty arrays - data will be loaded via hooks in components
// This prevents build-time errors
export const statesData: StateData[] = []
export const getAllLGAs = (): LGA[] => []

export function getStateById(id: string): StateData | undefined {
  return statesData.find(state => state.id === id)
}

export function getLGAById(stateId: string, lgaId: string): { state: StateData; lga: LGA } | undefined {
  const state = getStateById(stateId)
  if (!state || !state.lgas) return undefined
  
  const lga = state.lgas.find(l => l.id === lgaId)
  if (!lga) return undefined
  
  return { state, lga }
}

// Backwards compatibility aliases
export const getStateBySlug = getStateById
export const getLGABySlug = getLGAById
