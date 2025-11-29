export interface NationalContact {
  name: string
  number: string
}

export interface StateEmergencyContacts {
  police?: string[]
  frsc?: string
  hospital?: string
}

// Empty object for now - will be populated via data hook
export const nationalContacts: NationalContact[] = [
  { name: 'Emergency', number: '112' },
  { name: 'Police', number: '199' },
  { name: 'FRSC', number: '122' },
]

export const stateEmergencyContacts: Record<string, StateEmergencyContacts> = {}
