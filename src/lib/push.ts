/**
 * Web Push Notifications - Robust cross-device implementation
 * Supports: Chrome, Firefox, Edge, Safari (macOS), Safari iOS 16.4+ (PWA only)
 */

export interface PushSupport {
  supported: boolean
  reason?: string
  isIOS: boolean
  isIOSPWA: boolean
  needsPWAInstall: boolean
}

/**
 * Comprehensive check for push notification support
 */
export function checkPushSupport(): PushSupport {
  // Server-side rendering check
  if (typeof window === 'undefined') {
    return { supported: false, reason: 'Server-side rendering', isIOS: false, isIOSPWA: false, needsPWAInstall: false }
  }

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true
  const isIOSPWA = isIOS && isStandalone

  // Check basic requirements
  if (!('serviceWorker' in navigator)) {
    return { supported: false, reason: 'Service workers not supported', isIOS, isIOSPWA, needsPWAInstall: false }
  }

  if (!('PushManager' in window)) {
    // iOS Safari without PWA install
    if (isIOS && !isStandalone) {
      return {
        supported: false,
        reason: 'Install as app for notifications',
        isIOS,
        isIOSPWA: false,
        needsPWAInstall: true
      }
    }
    return { supported: false, reason: 'Push notifications not supported', isIOS, isIOSPWA, needsPWAInstall: false }
  }

  if (!('Notification' in window)) {
    return { supported: false, reason: 'Notifications API not supported', isIOS, isIOSPWA, needsPWAInstall: false }
  }

  return { supported: true, isIOS, isIOSPWA, needsPWAInstall: false }
}

/**
 * Simple check if push is supported (backwards compatible)
 */
export function isPushSupported(): boolean {
  return checkPushSupport().supported
}

/**
 * Request notification permission with user-friendly handling
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) return 'denied'

  // Already granted or denied
  if (Notification.permission !== 'default') {
    return Notification.permission
  }

  try {
    // Request permission
    const permission = await Notification.requestPermission()
    return permission
  } catch (error) {
    console.error('Permission request failed:', error)
    return 'denied'
  }
}

/**
 * Get current notification permission
 */
export function getNotificationPermission(): NotificationPermission {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'denied'
  return Notification.permission
}

/**
 * Wait for service worker to be ready with timeout
 */
async function waitForServiceWorker(timeoutMs: number = 10000): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null

  try {
    // First, ensure a service worker is registered
    const registrations = await navigator.serviceWorker.getRegistrations()

    if (registrations.length === 0) {
      // Try to register the service worker manually
      console.log('No service worker found, attempting to register...')
      try {
        await navigator.serviceWorker.register('/sw.js', { scope: '/' })
      } catch (regError) {
        console.error('Service worker registration failed:', regError)
        return null
      }
    }

    // Wait for the service worker to be ready
    const readyPromise = navigator.serviceWorker.ready
    const timeoutPromise = new Promise<null>((resolve) =>
      setTimeout(() => resolve(null), timeoutMs)
    )

    const result = await Promise.race([readyPromise, timeoutPromise])
    return result as ServiceWorkerRegistration | null
  } catch (error) {
    console.error('Service worker wait failed:', error)
    return null
  }
}

/**
 * Subscribe to push notifications with comprehensive error handling
 */
export async function subscribeToPush(): Promise<PushSubscription | null> {
  const support = checkPushSupport()

  if (!support.supported) {
    console.warn('Push not supported:', support.reason)
    return null
  }

  // Check for VAPID key
  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  if (!vapidKey) {
    console.error('VAPID public key not configured')
    return null
  }

  try {
    // Wait for service worker
    const registration = await waitForServiceWorker(15000)
    if (!registration) {
      console.error('Service worker not available')
      return null
    }

    // Check for existing subscription
    let subscription = await registration.pushManager.getSubscription()

    if (subscription) {
      console.log('Using existing push subscription')
      return subscription
    }

    // Create new subscription
    console.log('Creating new push subscription...')
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey),
    })

    console.log('Push subscription created successfully')
    return subscription
  } catch (error: any) {
    // Handle specific errors
    if (error.name === 'NotAllowedError') {
      console.error('Push permission denied by user')
    } else if (error.name === 'AbortError') {
      console.error('Push subscription was aborted')
    } else if (error.message?.includes('applicationServerKey')) {
      console.error('Invalid VAPID key format')
    } else {
      console.error('Push subscription failed:', error)
    }
    return null
  }
}

/**
 * Unsubscribe from push notifications
 */
export async function unsubscribeFromPush(): Promise<boolean> {
  try {
    const registration = await waitForServiceWorker(5000)
    if (!registration) return true // No registration = nothing to unsubscribe

    const subscription = await registration.pushManager.getSubscription()
    if (subscription) {
      await subscription.unsubscribe()
      console.log('Unsubscribed from push notifications')
    }
    return true
  } catch (error) {
    console.error('Push unsubscribe failed:', error)
    return false
  }
}

/**
 * Get existing push subscription
 */
export async function getExistingSubscription(): Promise<PushSubscription | null> {
  try {
    const registration = await waitForServiceWorker(5000)
    if (!registration) return null
    return await registration.pushManager.getSubscription()
  } catch {
    return null
  }
}

/**
 * Show a local/fallback notification (works even without push subscription)
 */
export function showLocalNotification(
  title: string,
  body: string,
  options?: NotificationOptions & { url?: string }
): boolean {
  if (typeof window === 'undefined' || !('Notification' in window)) return false

  if (Notification.permission !== 'granted') return false

  try {
    const notification = new Notification(title, {
      body,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-72.png',
      tag: options?.tag || `local-${Date.now()}`,
      ...options,
    })

    if (options?.url) {
      notification.onclick = () => {
        window.focus()
        window.location.href = options.url!
        notification.close()
      }
    }

    return true
  } catch (error) {
    console.error('Local notification failed:', error)
    return false
  }
}

/**
 * Convert VAPID key from base64 to Uint8Array
 */
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

  return outputArray.buffer
}

/**
 * Convert subscription keys to base64 for storage
 */
export function subscriptionToJSON(subscription: PushSubscription): {
  endpoint: string
  keys: { p256dh: string; auth: string }
} {
  const p256dh = subscription.getKey('p256dh')
  const auth = subscription.getKey('auth')

  return {
    endpoint: subscription.endpoint,
    keys: {
      p256dh: p256dh ? arrayBufferToBase64(p256dh) : '',
      auth: auth ? arrayBufferToBase64(auth) : '',
    },
  }
}

/**
 * Convert ArrayBuffer to base64
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

/**
 * Test if notifications are working by showing a test notification
 */
export async function testNotification(): Promise<boolean> {
  const permission = await requestNotificationPermission()
  if (permission !== 'granted') return false

  return showLocalNotification(
    '🔔 Test Successful!',
    'Push notifications are working on this device.',
    { tag: 'test-notification' }
  )
}
