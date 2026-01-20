'use client'

import { useEffect, useState } from 'react'
import { useAppStore } from '@/lib/store'

/**
 * App initialization hook
 * Syncs user data from the database on app load
 * Ensures data persistence across sessions
 *
 * Note: Push notification management is handled by usePushManager hook
 */
export function useAppInit() {
  const [isInitialized, setIsInitialized] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const {
    user,
    setUser,
    savedLocations,
    setSavedLocations,
    hasCompletedOnboarding,
    setHasCompletedOnboarding,
  } = useAppStore()

  useEffect(() => {
    async function initializeApp() {
      // Skip if no user in store
      if (!user?.id) {
        setIsLoading(false)
        setIsInitialized(true)
        return
      }

      // Skip if user ID looks like a test/local ID
      if (user.id.startsWith('test-') || user.id.startsWith('local-')) {
        setIsLoading(false)
        setIsInitialized(true)
        return
      }

      try {
        // Fetch user data from database
        const userResponse = await fetch(`/api/user/profile?user_id=${user.id}`)

        if (userResponse.ok) {
          const userData = await userResponse.json()
          if (userData.user) {
            // Update user in store with fresh data
            setUser({
              ...user,
              ...userData.user,
            })
          }
        }

        // Fetch user locations from database
        const locationsResponse = await fetch(`/api/user/locations?user_id=${user.id}`)

        if (locationsResponse.ok) {
          const locationsData = await locationsResponse.json()
          const dbLocations = locationsData.locations || []

          // If database has locations, sync them to store
          if (dbLocations.length > 0) {
            setSavedLocations(dbLocations)

            // User has completed onboarding if they have saved locations
            if (!hasCompletedOnboarding) {
              setHasCompletedOnboarding(true)
            }
          }
        }
      } catch (error) {
        console.error('App initialization failed:', error)
      } finally {
        setIsLoading(false)
        setIsInitialized(true)
      }
    }

    initializeApp()
  }, []) // Only run once on mount

  return { isInitialized, isLoading }
}
