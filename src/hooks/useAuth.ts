'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAppStore } from '@/lib/store'
import { getSupabase } from '@/lib/supabase'
import type { User } from '@/types'

interface AuthState {
  // State
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  error: string | null
  // Re-link state (for iOS PWA installs)
  needsRelink: boolean
  relinkPhone: string | null

  // Actions
  login: (phone: string, token: string, userId: string) => Promise<void>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
  updateProfile: (updates: Partial<User>) => Promise<void>
  attemptRelink: (pushEndpoint?: string) => Promise<boolean>
  clearRelinkState: () => void
}

interface StoredAuth {
  id: string
  phone: string
  token: string
}

/**
 * Authentication hook for SafetyAlerts
 * Handles phone-based auth with HTTP-only session cookies
 * Supports iOS PWA installs where localStorage is isolated
 */
export function useAuth(): AuthState {
  const { user, setUser, reset } = useAppStore()
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [needsRelink, setNeedsRelink] = useState(false)
  const [relinkPhone, setRelinkPhone] = useState<string | null>(null)

  // Initialize auth state - check server session first (survives iOS PWA installs)
  useEffect(() => {
    const initAuth = async () => {
      try {
        // 1. Check server session (HTTP-only cookie)
        // This works even after iOS PWA install because cookies survive
        const sessionRes = await fetch('/api/auth/session')

        if (sessionRes.ok) {
          const { user: sessionUser } = await sessionRes.json()

          // Valid server session - sync to local state
          const appUser: User = {
            id: sessionUser.id,
            phone: sessionUser.phone,
            phone_verified: sessionUser.phone_verified ?? false,
            trust_score: sessionUser.trust_score ?? 0,
            created_at: sessionUser.created_at,
            last_active: sessionUser.last_active ?? sessionUser.created_at,
          }

          setUser(appUser)

          // Sync to localStorage for fast subsequent reads
          localStorage.setItem('safety-alerts-user', JSON.stringify({
            id: sessionUser.id,
            phone: sessionUser.phone,
            token: 'session-cookie-auth',
          }))

          setIsLoading(false)
          return
        }

        // 2. No valid server session - check localStorage for re-link opportunity
        const stored = localStorage.getItem('safety-alerts-user')
        if (stored) {
          const authData: StoredAuth = JSON.parse(stored)

          // We have local data but no server session
          // This likely means session expired or iOS PWA fresh install
          // Offer re-link instead of full re-authentication
          setNeedsRelink(true)
          setRelinkPhone(authData.phone)
        }

        setIsLoading(false)
      } catch (err) {
        console.error('Auth init error:', err)
        setError('Failed to restore session')
        setIsLoading(false)
      }
    }

    initAuth()
  }, [setUser])

  // Login with phone OTP (called after successful OTP verification)
  // Session cookie is set by the server, we just need to sync local state
  const login = useCallback(async (phone: string, token: string, userId: string) => {
    setIsLoading(true)
    setError(null)

    try {
      // Fetch user profile from server session endpoint
      // This also validates the session cookie was set correctly
      const sessionRes = await fetch('/api/auth/session')

      if (sessionRes.ok) {
        const { user: sessionUser } = await sessionRes.json()

        const appUser: User = {
          id: sessionUser.id,
          phone: sessionUser.phone,
          phone_verified: sessionUser.phone_verified ?? false,
          trust_score: sessionUser.trust_score ?? 0,
          created_at: sessionUser.created_at,
          last_active: sessionUser.last_active ?? sessionUser.created_at,
        }

        // Store auth data for fast local reads
        localStorage.setItem('safety-alerts-user', JSON.stringify({
          id: sessionUser.id,
          phone: sessionUser.phone,
          token: 'session-cookie-auth',
        }))

        setUser(appUser)
        setNeedsRelink(false)
        setRelinkPhone(null)
      } else {
        // Fallback to provided data if session validation fails
        const appUser: User = {
          id: userId,
          phone: phone,
          phone_verified: true,
          trust_score: 0,
          created_at: new Date().toISOString(),
          last_active: new Date().toISOString(),
        }

        localStorage.setItem('safety-alerts-user', JSON.stringify({
          id: userId,
          phone,
          token: token || 'session-cookie-auth',
        }))

        setUser(appUser)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [setUser])

  // Attempt to re-link session using push subscription validation (no OTP needed)
  const attemptRelink = useCallback(async (pushEndpoint?: string): Promise<boolean> => {
    if (!relinkPhone) return false

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/auth/relink', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: relinkPhone,
          push_endpoint: pushEndpoint,
        }),
      })

      const data = await response.json()

      if (data.success && data.user) {
        // Re-link successful - session restored without OTP
        const appUser: User = {
          id: data.user.id,
          phone: data.user.phone,
          phone_verified: data.user.phone_verified ?? false,
          trust_score: data.user.trust_score ?? 0,
          created_at: data.user.created_at,
          last_active: data.user.last_active ?? data.user.created_at,
        }

        localStorage.setItem('safety-alerts-user', JSON.stringify({
          id: data.user.id,
          phone: data.user.phone,
          token: 'session-cookie-auth',
        }))

        setUser(appUser)
        setNeedsRelink(false)
        setRelinkPhone(null)
        setIsLoading(false)
        return true
      }

      // Re-link failed - will need OTP
      setIsLoading(false)
      return false
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Re-link failed')
      setIsLoading(false)
      return false
    }
  }, [relinkPhone, setUser])

  // Clear re-link state (user wants to use different account)
  const clearRelinkState = useCallback(() => {
    setNeedsRelink(false)
    setRelinkPhone(null)
    localStorage.removeItem('safety-alerts-user')
  }, [])

  // Logout - invalidate server session and clear local state
  const logout = useCallback(async () => {
    setIsLoading(true)

    try {
      // Invalidate server session
      await fetch('/api/auth/session', { method: 'DELETE' })

      // Clear local storage
      localStorage.removeItem('safety-alerts-user')

      // Reset entire app state
      reset()
      setNeedsRelink(false)
      setRelinkPhone(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Logout failed')
    } finally {
      setIsLoading(false)
    }
  }, [reset])

  // Refresh user data from server
  const refreshUser = useCallback(async () => {
    if (!user?.id) return

    try {
      const supabase = getSupabase()
      const { data: userData, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single()

      if (fetchError) {
        throw new Error('Failed to refresh user')
      }

      const appUser: User = {
        id: userData.id,
        phone: userData.phone,
        phone_verified: userData.phone_verified ?? false,
        trust_score: userData.trust_score ?? 0,
        created_at: userData.created_at,
        last_active: userData.last_active ?? userData.created_at,
      }

      setUser(appUser)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh user')
    }
  }, [user?.id, setUser])

  // Update user profile
  const updateProfile = useCallback(async (updates: Partial<User>) => {
    if (!user?.id) {
      setError('Not authenticated')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const supabase = getSupabase()

      // Map app User updates to DB columns
      const dbUpdates: Record<string, unknown> = {}
      if (updates.phone) dbUpdates.phone = updates.phone
      // Add more field mappings as needed

      const { error: updateError } = await supabase
        .from('users')
        .update(dbUpdates)
        .eq('id', user.id)

      if (updateError) {
        throw new Error('Failed to update profile')
      }

      // Refresh user data
      await refreshUser()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed')
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [user?.id, refreshUser])

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    error,
    needsRelink,
    relinkPhone,
    login,
    logout,
    refreshUser,
    updateProfile,
    attemptRelink,
    clearRelinkState,
  }
}

/**
 * Simple hook to check if user is authenticated
 * Use this for route protection
 */
export function useRequireAuth(): {
  isAuthenticated: boolean
  isLoading: boolean
  user: User | null
} {
  const { user, isLoading, isAuthenticated } = useAuth()

  return {
    isAuthenticated,
    isLoading,
    user,
  }
}

/**
 * Hook to get push notification subscription status
 */
export function usePushSubscription() {
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [isSupported, setIsSupported] = useState(false)
  const [subscription, setSubscription] = useState<PushSubscription | null>(null)

  useEffect(() => {
    const checkSubscription = async () => {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        setIsSupported(false)
        return
      }

      setIsSupported(true)

      try {
        const registration = await navigator.serviceWorker.ready
        const existingSub = await registration.pushManager.getSubscription()

        setSubscription(existingSub)
        setIsSubscribed(!!existingSub)
      } catch (err) {
        console.error('Error checking push subscription:', err)
      }
    }

    checkSubscription()
  }, [])

  const subscribe = useCallback(async () => {
    if (!isSupported) return null

    try {
      const registration = await navigator.serviceWorker.ready

      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      if (!vapidKey) {
        throw new Error('VAPID key not configured')
      }

      const newSubscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      })

      setSubscription(newSubscription)
      setIsSubscribed(true)

      // Send subscription to server
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSubscription.toJSON()),
      })

      return newSubscription
    } catch (err) {
      console.error('Failed to subscribe to push:', err)
      return null
    }
  }, [isSupported])

  const unsubscribe = useCallback(async () => {
    if (!subscription) return

    try {
      await subscription.unsubscribe()
      setSubscription(null)
      setIsSubscribed(false)

      // Notify server
      await fetch('/api/push/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: subscription.endpoint }),
      })
    } catch (err) {
      console.error('Failed to unsubscribe from push:', err)
    }
  }, [subscription])

  return {
    isSubscribed,
    isSupported,
    subscription,
    subscribe,
    unsubscribe,
  }
}

// Helper to convert VAPID key to ArrayBuffer for applicationServerKey
function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/')

  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray.buffer as ArrayBuffer
}
