export interface Incident {
  id: string
  date: string
  location: string
  state: string
  lgaSlug?: string
  description: string
  casualties: number
  type: 'attack' | 'kidnapping' | 'robbery' | 'communal' | 'insurgency'
  source?: string
}

// Empty array for now - will be populated via data hook
export const incidentsData: Incident[] = []

export function getIncidentsByState(stateId: string): Incident[] {
  return incidentsData.filter(incident => 
    incident.state.toLowerCase() === stateId.toLowerCase()
  )
}

export function getIncidentsByLGA(lgaId: string): Incident[] {
  return incidentsData.filter(incident => 
    incident.lgaSlug === lgaId
  )
}

export function getRecentIncidents(count: number = 5): Incident[] {
  return [...incidentsData]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, count)
}
