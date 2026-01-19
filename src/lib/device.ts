/**
 * Comprehensive device and iOS version detection
 * Supports all iOS versions in use as of 2026
 */

export interface DeviceInfo {
  // Platform
  isIOS: boolean
  isAndroid: boolean
  isMobile: boolean
  isDesktop: boolean

  // iOS specific
  iOSVersion: number | null
  supportsWebPush: boolean
  isPWA: boolean
  needsPWAInstall: boolean

  // Browser
  browser: 'safari' | 'chrome' | 'firefox' | 'edge' | 'samsung' | 'other'

  // Capabilities
  canReceivePush: boolean
  canReceiveLocalNotifications: boolean
  fallbackMethod: 'push' | 'local' | 'polling' | 'sms' | 'none'

  // Install prompt
  showInstallPrompt: boolean
  installInstructions: string | null
}

/**
 * Parse iOS version from user agent
 */
function parseIOSVersion(userAgent: string): number | null {
  // Match patterns like "iPhone OS 16_4" or "CPU OS 17_0"
  const match = userAgent.match(/(?:iPhone|iPad|iPod).*?OS (\d+)[_.](\d+)/i)
  if (match) {
    return parseFloat(`${match[1]}.${match[2]}`)
  }
  return null
}

/**
 * Detect browser from user agent
 */
function detectBrowser(userAgent: string): DeviceInfo['browser'] {
  if (/SamsungBrowser/i.test(userAgent)) return 'samsung'
  if (/Edg/i.test(userAgent)) return 'edge'
  if (/Chrome/i.test(userAgent) && !/Edg/i.test(userAgent)) return 'chrome'
  if (/Firefox/i.test(userAgent)) return 'firefox'
  if (/Safari/i.test(userAgent) && !/Chrome/i.test(userAgent)) return 'safari'
  return 'other'
}

/**
 * Check if running as installed PWA
 */
function isPWAInstalled(): boolean {
  if (typeof window === 'undefined') return false

  // Check display mode
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches

  // Check iOS standalone mode
  const isIOSStandalone = (window.navigator as any).standalone === true

  // Check if launched from home screen
  const isFullscreen = window.matchMedia('(display-mode: fullscreen)').matches

  return isStandalone || isIOSStandalone || isFullscreen
}

/**
 * Get comprehensive device information
 */
export function getDeviceInfo(): DeviceInfo {
  if (typeof window === 'undefined') {
    return {
      isIOS: false,
      isAndroid: false,
      isMobile: false,
      isDesktop: true,
      iOSVersion: null,
      supportsWebPush: false,
      isPWA: false,
      needsPWAInstall: false,
      browser: 'other',
      canReceivePush: false,
      canReceiveLocalNotifications: false,
      fallbackMethod: 'none',
      showInstallPrompt: false,
      installInstructions: null,
    }
  }

  const ua = navigator.userAgent

  // Platform detection
  const isIOS = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream
  const isAndroid = /Android/i.test(ua)
  const isMobile = isIOS || isAndroid || /Mobile/i.test(ua)
  const isDesktop = !isMobile

  // iOS version
  const iOSVersion = isIOS ? parseIOSVersion(ua) : null

  // Browser
  const browser = detectBrowser(ua)

  // PWA status
  const isPWA = isPWAInstalled()

  // Push support detection
  const hasPushManager = 'PushManager' in window
  const hasNotification = 'Notification' in window
  const hasServiceWorker = 'serviceWorker' in navigator

  // iOS push support:
  // - iOS 16.4+ supports web push BUT only when installed as PWA
  // - iOS < 16.4 does not support web push at all
  const iOSSupportsWebPush = iOSVersion !== null && iOSVersion >= 16.4

  // Can receive push?
  let canReceivePush = false
  if (isIOS) {
    // iOS needs to be 16.4+ AND installed as PWA
    canReceivePush = iOSSupportsWebPush && isPWA && hasPushManager && hasNotification
  } else {
    // Other platforms just need the APIs
    canReceivePush = hasPushManager && hasNotification && hasServiceWorker
  }

  // Can receive local notifications?
  const canReceiveLocalNotifications = hasNotification && Notification.permission === 'granted'

  // Needs PWA install?
  const needsPWAInstall = isIOS && !isPWA && iOSSupportsWebPush

  // Determine fallback method
  let fallbackMethod: DeviceInfo['fallbackMethod'] = 'none'
  if (canReceivePush) {
    fallbackMethod = 'push'
  } else if (canReceiveLocalNotifications) {
    fallbackMethod = 'local'
  } else if (isIOS && !iOSSupportsWebPush) {
    // Old iOS - use SMS for critical alerts
    fallbackMethod = 'sms'
  } else if (isMobile) {
    // Mobile without push - poll for alerts
    fallbackMethod = 'polling'
  } else {
    fallbackMethod = 'polling'
  }

  // Install prompt
  let showInstallPrompt = false
  let installInstructions: string | null = null

  if (isIOS && !isPWA) {
    showInstallPrompt = true
    if (iOSVersion && iOSVersion >= 16.4) {
      installInstructions = 'Tap the Share button (⬆️) at the bottom of Safari, then tap "Add to Home Screen" to enable push notifications.'
    } else {
      installInstructions = 'Tap the Share button (⬆️) at the bottom of Safari, then tap "Add to Home Screen" for the best experience. Note: Your iOS version doesn\'t support push notifications, but you\'ll receive SMS alerts for critical incidents.'
    }
  } else if (isAndroid && !isPWA && browser === 'chrome') {
    showInstallPrompt = true
    installInstructions = 'Tap the menu (⋮) and select "Add to Home screen" or "Install app" for the best experience.'
  }

  return {
    isIOS,
    isAndroid,
    isMobile,
    isDesktop,
    iOSVersion,
    supportsWebPush: canReceivePush,
    isPWA,
    needsPWAInstall,
    browser,
    canReceivePush,
    canReceiveLocalNotifications,
    fallbackMethod,
    showInstallPrompt,
    installInstructions,
  }
}

/**
 * Get human-readable iOS version info
 */
export function getIOSVersionInfo(version: number | null): string {
  if (version === null) return 'Not iOS'

  if (version >= 18) return `iOS ${version} - Full push support`
  if (version >= 17) return `iOS ${version} - Full push support (when installed as app)`
  if (version >= 16.4) return `iOS ${version} - Push support (when installed as app)`
  if (version >= 16) return `iOS ${version} - No push support, SMS fallback available`
  if (version >= 15) return `iOS ${version} - No push support, SMS fallback available`
  if (version >= 14) return `iOS ${version} - Limited support, SMS fallback recommended`
  return `iOS ${version} - Legacy version, SMS fallback required`
}

/**
 * Check if SMS fallback should be offered
 */
export function shouldOfferSMSFallback(deviceInfo: DeviceInfo): boolean {
  // Offer SMS if:
  // 1. iOS without push support
  // 2. Any device that can't receive push and user hasn't enabled notifications
  return (
    deviceInfo.fallbackMethod === 'sms' ||
    (!deviceInfo.canReceivePush && !deviceInfo.canReceiveLocalNotifications)
  )
}
