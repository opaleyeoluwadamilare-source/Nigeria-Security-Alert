// Statistics data - will be calculated from fetched data
// For now, provide default values so page doesn't break

export interface Statistics {
  totalDeaths2025: number
  dangerousRoadsMapped: number
  highRiskLGAs: number
  lastUpdated: string
}

export const statisticsData: Statistics = {
  totalDeaths2025: 0, // Will be updated when data loads
  dangerousRoadsMapped: 0,
  highRiskLGAs: 0,
  lastUpdated: '2025-11-28',
}

export const frequentlySearched = [
  { name: 'Zamfara', href: '/location/zamfara' },
  { name: 'Bukkuyum', href: '/location/zamfara/bukkuyum' },
  { name: 'Kaduna', href: '/location/kaduna' },
  { name: 'Birnin Gwari', href: '/location/kaduna/birnin-gwari' },
  { name: 'Borno', href: '/location/borno' },
  { name: 'Niger', href: '/location/niger' },
]
