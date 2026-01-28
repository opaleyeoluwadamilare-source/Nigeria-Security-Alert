'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Download, ExternalLink, ArrowRight, Smartphone } from 'lucide-react'
import { useDevice } from '@/hooks/useDevice'

/**
 * Context-aware button that changes based on:
 * - In-app browser (Instagram, TikTok, etc.) → "Open in Safari/Chrome"
 * - PWA already installed → "Open App"
 * - Installable on mobile → "Install App"
 * - Default → "Try the App"
 */
export function SmartAppButton() {
  const device = useDevice()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Server-side render a default state
  if (!mounted || device.isLoading) {
    return (
      <Link
        href="/app"
        className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-full transition-colors"
      >
        <span>Open App</span>
        <ArrowRight className="w-4 h-4" />
      </Link>
    )
  }

  // Case 1: In-app browser (Instagram, TikTok, Facebook, etc.)
  if (device.isInAppBrowser) {
    const browserName = device.isIOS ? 'Safari' : 'Chrome'
    const appName = device.inAppBrowserName
      ? device.inAppBrowserName.charAt(0).toUpperCase() + device.inAppBrowserName.slice(1)
      : 'this app'

    return (
      <button
        onClick={() => {
          // Try to open in external browser
          // On iOS, we can try to use the Safari scheme
          // On Android, we can try intent URLs
          const url = window.location.href

          if (device.isIOS) {
            // Try to open in Safari - this works from some in-app browsers
            window.location.href = url
          } else {
            // For Android, try intent URL
            window.location.href = `intent://${url.replace(/^https?:\/\//, '')}#Intent;scheme=https;package=com.android.chrome;end`
          }
        }}
        className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-full transition-colors shadow-sm"
      >
        <ExternalLink className="w-4 h-4" />
        <span>Open in {browserName}</span>
      </button>
    )
  }

  // Case 2: Already running as PWA
  if (device.isPWA) {
    return (
      <Link
        href="/app"
        className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-full transition-colors"
      >
        <span>Go to Feed</span>
        <ArrowRight className="w-4 h-4" />
      </Link>
    )
  }

  // Case 3: Mobile, not installed, can install
  if (device.isMobile && device.showInstallPrompt) {
    return (
      <Link
        href="/app"
        className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-full transition-colors shadow-sm"
      >
        <Download className="w-4 h-4" />
        <span>Install App</span>
      </Link>
    )
  }

  // Case 4: Desktop browser
  if (device.isDesktop) {
    return (
      <Link
        href="/app"
        className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-full transition-colors"
      >
        <Smartphone className="w-4 h-4" />
        <span>Try the App</span>
      </Link>
    )
  }

  // Default: Mobile browser, generic
  return (
    <Link
      href="/app"
      className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-full transition-colors"
    >
      <span>Open App</span>
      <ArrowRight className="w-4 h-4" />
    </Link>
  )
}

/**
 * Banner component shown when user is in an in-app browser
 * Prompts them to open in Safari/Chrome for best experience
 */
export function InAppBrowserBanner() {
  const device = useDevice()
  const [dismissed, setDismissed] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted || !device.isInAppBrowser || dismissed) {
    return null
  }

  const browserName = device.isIOS ? 'Safari' : 'Chrome'
  const appName = device.inAppBrowserName
    ? device.inAppBrowserName.charAt(0).toUpperCase() + device.inAppBrowserName.slice(1)
    : 'This app'

  return (
    <div className="bg-amber-50 border-b border-amber-200 px-4 py-3">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
            <ExternalLink className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-sm text-amber-800">
            <span className="font-medium">For the best experience,</span>{' '}
            <span className="hidden sm:inline">open this page in {browserName} to install the app.</span>
            <span className="sm:hidden">open in {browserName}.</span>
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => {
              // Copy URL to clipboard for easy pasting
              navigator.clipboard?.writeText(window.location.href)

              if (device.isIOS) {
                // Show instruction to open in Safari
                alert(`To open in Safari:\n\n1. Tap the "..." menu at the bottom right\n2. Select "Open in Safari"\n\nOr copy this link and paste in Safari:\n${window.location.href}`)
              } else {
                // Show instruction for Android
                alert(`To open in Chrome:\n\n1. Tap the "⋮" menu\n2. Select "Open in Chrome"\n\nOr copy this link and paste in Chrome:\n${window.location.href}`)
              }
            }}
            className="px-3 py-1.5 text-sm font-medium text-amber-700 hover:text-amber-800 hover:bg-amber-100 rounded-lg transition-colors"
          >
            How?
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="p-1.5 text-amber-500 hover:text-amber-700 hover:bg-amber-100 rounded-lg transition-colors"
            aria-label="Dismiss"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
