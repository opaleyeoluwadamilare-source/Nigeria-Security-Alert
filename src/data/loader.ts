// Data loader that works in both server and client environments

let cachedData: {
  states?: any[]
  lgas?: any[]
  roads?: any[]
  incidents?: any[]
  emergency?: any
} = {}

export async function loadData() {
  if (Object.keys(cachedData).length > 0) {
    return cachedData
  }

  if (typeof window === 'undefined') {
    // Server-side: use require
    try {
      cachedData = {
        states: require('../../public/data/states.json'),
        lgas: require('../../public/data/lgas.json'),
        roads: require('../../public/data/roads.json'),
        incidents: require('../../public/data/incidents.json'),
        emergency: require('../../public/data/emergency-contacts.json'),
      }
    } catch (e) {
      console.error('Failed to load data on server:', e)
    }
  } else {
    // Client-side: fetch from public folder
    try {
      const [states, lgas, roads, incidents, emergency] = await Promise.all([
        fetch('/data/states.json').then(r => r.json()),
        fetch('/data/lgas.json').then(r => r.json()),
        fetch('/data/roads.json').then(r => r.json()),
        fetch('/data/incidents.json').then(r => r.json()),
        fetch('/data/emergency-contacts.json').then(r => r.json()),
      ])
      cachedData = { states, lgas, roads, incidents, emergency }
    } catch (e) {
      console.error('Failed to load data on client:', e)
    }
  }

  return cachedData
}


