// ============================================
// DATABASE TYPES
// ============================================

export interface User {
  id: string
  phone: string | null
  phone_verified: boolean
  trust_score: number
  created_at: string
  last_active: string
}

export interface UserLocation {
  id: string
  user_id: string
  area_name: string
  area_slug: string
  state: string
  is_primary: boolean
  created_at: string
}

export interface Report {
  id: string
  user_id: string | null
  incident_type: IncidentType
  landmark: string | null
  description: string | null
  photo_url: string | null
  latitude: number
  longitude: number
  area_name: string
  area_slug: string
  state: string
  status: ReportStatus
  confirmation_count: number
  denial_count: number
  created_at: string
  ended_at: string | null
}

export interface Confirmation {
  id: string
  report_id: string
  user_id: string | null
  latitude: number
  longitude: number
  distance_km: number
  confirmation_type: ConfirmationType
  created_at: string
}

export interface PushSubscription {
  id: string
  user_id: string
  endpoint: string
  keys: {
    p256dh: string
    auth: string
  }
  created_at: string
}

export interface OtpCode {
  id: string
  phone: string
  code: string
  expires_at: string
  used: boolean
  created_at: string
}

// ============================================
// ENUMS
// ============================================

export type IncidentType =
  | 'robbery'
  | 'attack'
  | 'gunshots'
  | 'kidnapping'
  | 'checkpoint'
  | 'fire'
  | 'accident'
  | 'traffic'
  | 'suspicious'
  | 'other'
  | 'official'

export type ReportStatus = 'active' | 'ended' | 'removed'

export type ConfirmationType = 'confirm' | 'deny' | 'ended'

export type RiskLevel = 'EXTREME' | 'VERY HIGH' | 'HIGH' | 'MODERATE' | 'LOW'

// ============================================
// UI TYPES
// ============================================

export interface LocationResult {
  success: boolean
  coords?: { lat: number; lng: number }
  area?: {
    name: string
    slug: string
    state: string
  }
  error?: string
}

export interface AreaSearchResult {
  name: string
  slug: string
  state: string
}

export interface Coordinates {
  lat: number
  lng: number
  accuracy?: number
}

// Incident type config for UI
export interface IncidentTypeConfig {
  type: IncidentType
  label: string
  icon: string
  color: 'red' | 'orange' | 'yellow'
  severity: number
}

export const INCIDENT_TYPES: IncidentTypeConfig[] = [
  { type: 'robbery', label: 'Robbery', icon: '🔴', color: 'red', severity: 5 },
  { type: 'attack', label: 'Attack', icon: '🔪', color: 'red', severity: 5 },
  { type: 'gunshots', label: 'Gunshots', icon: '🔫', color: 'red', severity: 5 },
  { type: 'kidnapping', label: 'Kidnapping', icon: '🚨', color: 'red', severity: 5 },
  { type: 'checkpoint', label: 'Checkpoint', icon: '🚔', color: 'yellow', severity: 2 },
  { type: 'fire', label: 'Fire', icon: '🔥', color: 'orange', severity: 4 },
  { type: 'accident', label: 'Accident', icon: '🚗', color: 'orange', severity: 3 },
  { type: 'traffic', label: 'Traffic', icon: '🚧', color: 'yellow', severity: 1 },
  { type: 'suspicious', label: 'Suspicious', icon: '👀', color: 'orange', severity: 3 },
  { type: 'other', label: 'Other', icon: '⚠️', color: 'yellow', severity: 2 },
  { type: 'official', label: 'Official Alert', icon: '📢', color: 'red', severity: 5 },
]

// Alert for display (Report with computed fields)
export interface Alert extends Report {
  distance_km?: number
  time_ago: string
  risk_level: RiskLevel
}

// ============================================
// STORE TYPES
// ============================================

export interface AppState {
  // User
  user: User | null
  setUser: (user: User | null) => void

  // User's saved locations
  savedLocations: UserLocation[]
  setSavedLocations: (locations: UserLocation[]) => void
  addLocation: (location: UserLocation) => void
  removeLocation: (id: string) => void

  // Current GPS location
  currentLocation: Coordinates | null
  currentArea: AreaSearchResult | null
  setCurrentLocation: (coords: Coordinates | null, area: AreaSearchResult | null) => void

  // Alerts/Reports
  reports: Report[]
  setReports: (reports: Report[]) => void

  // Onboarding
  hasCompletedOnboarding: boolean
  setHasCompletedOnboarding: (value: boolean) => void

  // UI State
  isOnline: boolean
  setIsOnline: (value: boolean) => void
  isPushEnabled: boolean
  setIsPushEnabled: (value: boolean) => void
}

// ============================================
// NIGERIAN LOCATION TYPES
// ============================================

export interface NigerianLocation {
  slug: string
  name: string
  state: string
  aliases: string[]
  nearby: string[]
  popular?: boolean
}

// ============================================
// API RESPONSE TYPES
// ============================================

export interface ApiResponse<T> {
  data?: T
  error?: string
}

export interface ReportsResponse {
  reports: Report[]
}

export interface ReportResponse {
  report: Report
}

export interface LocationsResponse {
  locations: AreaSearchResult[]
}

export interface ReverseGeocodeResponse {
  success: boolean
  area?: AreaSearchResult
  raw?: {
    suburb?: string
    neighbourhood?: string
    city_district?: string
    town?: string
    city?: string
    state?: string
  }
  error?: string
}
