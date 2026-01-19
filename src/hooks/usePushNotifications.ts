'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  checkPushSupport,
  requestNotificationPermission,
  subscribeToPush,
  unsubscribeFromPush,
  getNotificationPermission,
  subscriptionToJSON,
  showLocalNotification,
  type PushSupport,
} from '@/lib/push'
import { useAppStore } from '@/lib/store'
import { getSupabase } from '@/lib/supabase'

// Check if Supabase is configured
function isSupabaseConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}

interface UsePushNotificationsReturn {
  // Support info
  isSupported: boolean
  support: PushSupport
  permission: NotificationPermission
  isEnabled: boolean
  isLoading: boolean
  error: string | null

  // Actions
  enable: () => Promise<boolean>
  disable: () => Promise<boolean>
  testNotification: () => Promise<boolean>
}

export function usePushNotifications(): UsePushNotificationsReturn {
  const { user, isPushEnabled, setIsPushEnabled } = useAppStore()
  const [support, setSupport] = useState<PushSupport>({
    supported: false,
    isIOS: false,
    isIOSPWA: false,
    needsPWAInstall: false,
  })
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Check support on mount
  useEffect(() => {
    const pushSupport = checkPushSupport()
    setSupport(pushSupport)
    setPermission(getNotificationPermission())
  }, [])

  // Enable push notifications
  const enable = useCallback(async (): Promise<boolean> => {
    setIsLoading(true)
    setError(null)

    try {
      // Check support first
      const pushSupport = checkPushSupport()
      setSupport(pushSupport)

      if (!pushSupport.supported) {
        if (pushSupport.needsPWAInstall) {
          setError('Please install SafetyAlerts as an app to enable notifications')
        } else {
          setError(pushSupport.reason || 'Push notifications not supported')
        }
        setIsLoading(false)
        return false
      }

      // Request permission
      const perm = await requestNotificationPermission()
      setPermission(perm)

      if (perm === 'denied') {
        setError('Notifications blocked. Please enable in browser settings.')
        setIsLoading(false)
        return false
      }

      if (perm !== 'granted') {
        setError('Notification permission not granted')
        setIsLoading(false)
        return false
      }

      // Subscribe to push
      const subscription = await subscribeToPush()

      if (!subscription) {
        // Even without push subscription, local notifications can work
        // So we'll consider this a partial success
        console.warn('Push subscription failed, but local notifications may still work')
        setIsPushEnabled(true)
        setIsLoading(false)
        return true
      }

      // Save subscription to database if user is authenticated
      if (user && isSupabaseConfigured()) {
        try {
          const supabase = getSupabase()
          const subscriptionData = subscriptionToJSON(subscription)
          const { error: dbError } = await supabase.from('push_subscriptions').upsert(
            {
              user_id: user.id,
              endpoint: subscriptionData.endpoint,
              keys: subscriptionData.keys,
            },
            { onConflict: 'endpoint' }
          )

          if (dbError) {
            console.warn('Failed to save push subscription to database:', dbError)
            // Continue anyway - local push will still work
          }
        } catch (dbErr) {
          console.warn('Database save failed:', dbErr)
        }
      }

      setIsPushEnabled(true)
      setIsLoading(false)
      return true
    } catch (err) {
      console.error('Enable push failed:', err)
      setError('Failed to enable notifications. Please try again.')
      setIsLoading(false)
      return false
    }
  }, [user, setIsPushEnabled])

  // Disable push notifications
  const disable = useCallback(async (): Promise<boolean> => {
    setIsLoading(true)
    setError(null)

    try {
      await unsubscribeFromPush()

      if (user && isSupabaseConfigured()) {
        try {
          const supabase = getSupabase()
          await supabase
            .from('push_subscriptions')
            .delete()
            .eq('user_id', user.id)
        } catch (dbErr) {
          console.warn('Failed to remove subscription from database:', dbErr)
        }
      }

      setIsPushEnabled(false)
      setIsLoading(false)
      return true
    } catch (err) {
      console.error('Disable push failed:', err)
      setError('Failed to disable notifications')
      setIsLoading(false)
      return false
    }
  }, [user, setIsPushEnabled])

  // Test notification
  const testNotification = useCallback(async (): Promise<boolean> => {
    if (permission !== 'granted') {
      const perm = await requestNotificationPermission()
      setPermission(perm)
      if (perm !== 'granted') return false
    }

    return showLocalNotification(
      '🔔 Test Alert - SafetyAlerts',
      'Notifications are working! You\'ll receive alerts for incidents in your areas.',
      { tag: 'test-notification' }
    )
  }, [permission])

  return {
    isSupported: support.supported,
    support,
    permission,
    isEnabled: isPushEnabled,
    isLoading,
    error,
    enable,
    disable,
    testNotification,
  }
}

/**
 * Show a local notification (exported for direct use)
 */
export { showLocalNotification }
