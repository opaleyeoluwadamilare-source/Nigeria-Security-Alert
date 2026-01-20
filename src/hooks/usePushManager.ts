'use client'

import { useEffect, useCallback, useRef } from 'react'
import { useAppStore } from '@/lib/store'
import {
  checkPushSupport,
  getNotificationPermission,
  subscribeToPush,
  getExistingSubscription,
  subscriptionToJSON,
  type PushSupport,
} from '@/lib/push'

/**
 * Push Notification Manager Hook
 *
 * This hook automatically manages push notification subscriptions:
 * 1. If user has granted permission, ensures subscription exists
 * 2. Auto-restores subscriptions if they were lost (browser update, cache clear, etc.)
 * 3. Syncs subscription state to database
 * 4. Keeps local state (isPushEnabled) in sync with actual browser state
 *
 * The principle: Once a user grants notification permission, we maintain
 * their subscription automatically unless they explicitly disable it.
 */
export function usePushManager() {
  const { user, isPushEnabled, setIsPushEnabled } = useAppStore()
  const isManagingRef = useRef(false)
  const hasRunRef = useRef(false)

  /**
   * Save subscription to database
   */
  const saveSubscriptionToDatabase = useCallback(async (
    subscription: PushSubscription,
    userId: string
  ): Promise<boolean> => {
    try {
      const subscriptionData = subscriptionToJSON(subscription)

      const response = await fetch('/api/user/push-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          subscription: {
            endpoint: subscriptionData.endpoint,
            keys: subscriptionData.keys,
          },
        }),
      })

      if (!response.ok) {
        console.error('Failed to save subscription to database:', await response.text())
        return false
      }

      console.log('Push subscription saved to database')
      return true
    } catch (error) {
      console.error('Error saving subscription to database:', error)
      return false
    }
  }, [])

  /**
   * Main push management function
   * Ensures push subscription is active and synced if permission is granted
   */
  const managePushSubscription = useCallback(async () => {
    // Prevent concurrent execution
    if (isManagingRef.current) return
    isManagingRef.current = true

    try {
      // Check if push is supported
      const support: PushSupport = checkPushSupport()
      if (!support.supported) {
        // Push not supported - ensure state reflects this
        if (isPushEnabled) {
          setIsPushEnabled(false)
        }
        return
      }

      // Check current permission
      const permission = getNotificationPermission()

      // If permission is denied or default, user hasn't enabled push
      if (permission === 'denied') {
        if (isPushEnabled) {
          setIsPushEnabled(false)
        }
        return
      }

      if (permission === 'default') {
        // User hasn't been asked yet - don't auto-enable
        // They need to explicitly enable through UI
        return
      }

      // Permission is GRANTED - ensure we have an active subscription
      console.log('Push permission is granted, checking subscription...')

      // Check for existing subscription
      let subscription = await getExistingSubscription()

      if (!subscription) {
        // Subscription lost - auto-restore it
        console.log('No active subscription found, auto-restoring...')
        subscription = await subscribeToPush()

        if (!subscription) {
          console.error('Failed to restore push subscription')
          // Even if subscription fails, permission is granted
          // Keep isPushEnabled true so user knows they enabled it
          // The subscription might work on next app load
          return
        }

        console.log('Push subscription auto-restored successfully')
      }

      // We have an active subscription - ensure state is correct
      if (!isPushEnabled) {
        setIsPushEnabled(true)
      }

      // Save to database if user is authenticated
      if (user?.id && !user.id.startsWith('test-') && !user.id.startsWith('local-')) {
        await saveSubscriptionToDatabase(subscription, user.id)
      }

    } catch (error) {
      console.error('Push management error:', error)
    } finally {
      isManagingRef.current = false
    }
  }, [user?.id, isPushEnabled, setIsPushEnabled, saveSubscriptionToDatabase])

  // Run push management on mount and when user changes
  useEffect(() => {
    // Small delay to ensure service worker is registered
    const timer = setTimeout(() => {
      managePushSubscription()
    }, 1000)

    return () => clearTimeout(timer)
  }, [managePushSubscription])

  // Also run when app becomes visible (user returns to app)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !isManagingRef.current) {
        // User returned to app - re-check push status
        managePushSubscription()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [managePushSubscription])

  // Run when service worker updates
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    const handleControllerChange = () => {
      console.log('Service worker updated, re-checking push subscription...')
      // Delay to let new SW settle
      setTimeout(() => {
        managePushSubscription()
      }, 2000)
    }

    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange)
    return () => navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange)
  }, [managePushSubscription])

  return {
    refreshPushStatus: managePushSubscription,
  }
}
