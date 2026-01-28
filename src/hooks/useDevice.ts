'use client'

import { useState, useEffect } from 'react'
import { getDeviceInfo, type DeviceInfo } from '@/lib/device'

/**
 * Hook to access device capabilities and info
 * Updates when PWA install status changes
 */
export function useDevice(): DeviceInfo & { isLoading: boolean } {
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>({
    isIOS: false,
    isAndroid: false,
    isMobile: false,
    isDesktop: true,
    iOSVersion: null,
    supportsWebPush: false,
    isPWA: false,
    needsPWAInstall: false,
    browser: 'other',
    isInAppBrowser: false,
    inAppBrowserName: null,
    canReceivePush: false,
    canReceiveLocalNotifications: false,
    fallbackMethod: 'none',
    showInstallPrompt: false,
    installInstructions: null,
  })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Get initial device info
    const info = getDeviceInfo()
    setDeviceInfo(info)
    setIsLoading(false)

    // Listen for display mode changes (PWA install)
    const mediaQuery = window.matchMedia('(display-mode: standalone)')
    const handleChange = () => {
      setDeviceInfo(getDeviceInfo())
    }

    mediaQuery.addEventListener('change', handleChange)

    // Also check periodically for PWA install (some browsers don't fire the event)
    const interval = setInterval(() => {
      const newInfo = getDeviceInfo()
      if (newInfo.isPWA !== deviceInfo.isPWA) {
        setDeviceInfo(newInfo)
      }
    }, 5000)

    return () => {
      mediaQuery.removeEventListener('change', handleChange)
      clearInterval(interval)
    }
  }, [])

  return { ...deviceInfo, isLoading }
}
