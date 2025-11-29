'use client'

import { useState, useEffect } from 'react'
import type { StateData, LGA } from '@/data/states'
import type { RoadData } from '@/data/roads'
import type { Incident } from '@/data/incidents'

interface DataState {
  states: StateData[]
  lgas: LGA[]
  roads: RoadData[]
  incidents: Incident[]
  emergency: any
  loading: boolean
  error: Error | null
}

export function useData() {
  const [data, setData] = useState<DataState>({
    states: [],
    lgas: [],
    roads: [],
    incidents: [],
    emergency: { states: {} },
    loading: true,
    error: null,
  })

  useEffect(() => {
    async function loadData() {
      try {
        // Check if responses are ok before parsing
        const [statesRes, lgasRes, roadsRes, incidentsRes, emergencyRes] = await Promise.all([
          fetch('/data/states.json'),
          fetch('/data/lgas.json'),
          fetch('/data/roads.json'),
          fetch('/data/incidents.json'),
          fetch('/data/emergency-contacts.json'),
        ])

        // Check for errors
        if (!statesRes.ok) throw new Error(`Failed to load states: ${statesRes.status}`)
        if (!lgasRes.ok) throw new Error(`Failed to load lgas: ${lgasRes.status}`)
        if (!roadsRes.ok) throw new Error(`Failed to load roads: ${roadsRes.status}`)
        if (!incidentsRes.ok) throw new Error(`Failed to load incidents: ${incidentsRes.status}`)
        if (!emergencyRes.ok) throw new Error(`Failed to load emergency: ${emergencyRes.status}`)

        const [states, lgas, roads, incidents, emergency] = await Promise.all([
          statesRes.json(),
          lgasRes.json(),
          roadsRes.json(),
          incidentsRes.json(),
          emergencyRes.json(),
        ])

        console.log('Data loaded:', { 
          statesCount: states.length, 
          lgasCount: lgas.length, 
          roadsCount: roads.length 
        })

        // Transform states
        const transformedLgas: LGA[] = lgas.map((lga: any) => ({
          id: lga.id,
          name: lga.name,
          stateId: lga.state,
          stateName: lga.state_name,
          riskLevel: lga.risk_level,
          incidents: lga.incidents_2025,
          description: lga.description,
        }))

        const transformedStates: StateData[] = states.map((state: any) => {
          const stateLgas = transformedLgas.filter((lga: LGA) => lga.stateId === state.id)
          // Handle both old and new emergency structure
          const stateEmergency = emergency.states?.[state.id]
          
          return {
            id: state.id,
            name: state.name,
            riskLevel: state.risk_level,
            riskDescription: state.risk_description,
            deaths2025: state.deaths_2025 || 0,
            incidents2025: state.incidents_2025 || 0,
            highRiskLGAs: state.high_risk_lgas || 0,
            keyStat: state.key_stat,
            region: state.region,
            lgas: stateLgas.length > 0 ? stateLgas : undefined,
            emergencyContacts: stateEmergency ? {
              police: stateEmergency.numbers || stateEmergency.police || [],
              frsc: emergency.national?.frsc?.number || stateEmergency.frsc,
              hospital: stateEmergency.hospital,
            } : undefined,
          }
        })

        // Transform roads
        const transformedRoads: RoadData[] = roads.map((road: any) => ({
          name: road.name,
          slug: road.id,
          alias: road.alias || undefined,
          states: road.states,
          riskLevel: road.risk_level,
          description: road.description,
          dangerZones: road.danger_zones || [],
          alternative: road.alternative,
        }))

        // Transform incidents (ensure they match the Incident interface)
        const transformedIncidents: Incident[] = incidents.map((incident: any) => ({
          id: incident.id || `${incident.date}-${incident.location}`,
          date: incident.date,
          location: incident.location,
          state: incident.state,
          lgaSlug: incident.lga || incident.lga_slug || incident.lgaSlug,
          description: incident.description || incident.what_happened || '',
          casualties: incident.casualties || 0,
          type: incident.type || 'attack',
          source: incident.source,
        }))

        console.log('Transformed data:', {
          states: transformedStates.length,
          totalDeaths: transformedStates.reduce((sum, s) => sum + (s.deaths2025 || 0), 0),
          roads: transformedRoads.length,
          highRiskLGAs: transformedLgas.filter(l => ['EXTREME', 'VERY HIGH', 'HIGH'].includes(l.riskLevel)).length
        })

        setData({
          states: transformedStates,
          lgas: transformedLgas,
          roads: transformedRoads,
          incidents: transformedIncidents,
          emergency: emergency,
          loading: false,
          error: null,
        })
      } catch (err) {
        console.error('Error loading data:', err)
        setData(prev => ({
          ...prev,
          loading: false,
          error: err as Error,
        }))
      }
    }

    loadData()
  }, [])

  return data
}

