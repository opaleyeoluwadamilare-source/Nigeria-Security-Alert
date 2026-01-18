'use client'

import { useState, useEffect, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import { X, Share, Plus, MoreVertical, Download, Smartphone, CheckCircle2 } from 'lucide-react'
import { useDeviceDetect, getInstallInstructions } from '@/hooks/useDeviceDetect'
import { NigerianShield } from '@/components/landing/NigerianShield'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

type PromptStage = 'hidden' | 'teaser' | 'full' | 'instructions' | 'success'

/**
 * Smart PWA Install Prompt
 * Adapts to device type and shows contextual installation guidance
 */
export function SmartInstallPrompt() {
  const device = useDeviceDetect()
  const pathname = usePathname()
  const [stage, setStage] = useState<PromptStage>('hidden')
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [dismissed, setDismissed] = useState(false)

  // Don't show during onboarding - let user complete setup first
  const isOnboarding = pathname?.includes('/onboarding')

  // Check dismissal state
  useEffect(() => {
    if (typeof window === 'undefined') return

    // Already installed as PWA
    if (device.isStandalone) {
      setStage('hidden')
      return
    }

    // Don't show during onboarding
    if (isOnboarding) {
      setStage('hidden')
      return
    }

    // Check dismissal time
    const dismissedAt = localStorage.getItem('pwa-smart-dismissed')
    if (dismissedAt) {
      const hoursSince = (Date.now() - parseInt(dismissedAt)) / (1000 * 60 * 60)
      if (hoursSince < 48) {
        setDismissed(true)
        return
      }
    }

    // Show teaser after user has been on site briefly
    const timer = setTimeout(() => {
      if (!dismissed && !device.isStandalone && !isOnboarding) {
        setStage('teaser')
      }
    }, 2000)

    return () => clearTimeout(timer)
  }, [device.isStandalone, dismissed, isOnboarding])

  // Listen for native install prompt (Android/Desktop Chrome)
  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault()
      setInstallPrompt(e as BeforeInstallPromptEvent)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstall)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall)
    }
  }, [])

  // Handle native install
  const handleNativeInstall = useCallback(async () => {
    if (!installPrompt) return

    try {
      await installPrompt.prompt()
      const { outcome } = await installPrompt.userChoice

      if (outcome === 'accepted') {
        setStage('success')
        setTimeout(() => setStage('hidden'), 3000)
      } else {
        setStage('hidden')
      }
    } catch (error) {
      console.error('Install prompt error:', error)
    }
    setInstallPrompt(null)
  }, [installPrompt])

  // Handle dismiss
  const handleDismiss = useCallback(() => {
    setStage('hidden')
    setDismissed(true)
    localStorage.setItem('pwa-smart-dismissed', Date.now().toString())
  }, [])

  // Handle expand from teaser
  const handleExpand = useCallback(() => {
    if (installPrompt) {
      // Native prompt available, just show it
      handleNativeInstall()
    } else if (device.isIOS) {
      // iOS needs manual instructions
      setStage('instructions')
    } else {
      setStage('full')
    }
  }, [installPrompt, device.isIOS, handleNativeInstall])

  const instructions = getInstallInstructions(device)

  // Already installed, dismissed, or during onboarding
  if (stage === 'hidden' || dismissed || device.isStandalone || isOnboarding) {
    return null
  }

  // Success state
  if (stage === 'success') {
    return (
      <div className="fixed bottom-4 left-4 right-4 z-40 animate-slide-up">
        <div className="bg-emerald-600 text-white rounded-2xl p-4 shadow-lg max-w-md mx-auto">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-6 h-6" />
            <div>
              <p className="font-semibold">SafetyAlerts Installed!</p>
              <p className="text-sm text-emerald-100">Find it on your home screen</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Teaser - minimal prompt
  if (stage === 'teaser') {
    return (
      <div className="fixed bottom-4 left-4 right-4 z-40 animate-slide-up">
        <button
          onClick={handleExpand}
          className="w-full max-w-md mx-auto bg-white rounded-2xl p-4 shadow-lg border border-gray-100 flex items-center gap-3 hover:bg-gray-50 transition-colors"
        >
          <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center flex-shrink-0">
            <NigerianShield className="w-6 h-6" />
          </div>
          <div className="flex-1 text-left">
            <p className="font-medium text-gray-900 text-sm">Get instant safety alerts</p>
            <p className="text-xs text-gray-500">Install app for faster access</p>
          </div>
          <Download className="w-5 h-5 text-emerald-600" />
        </button>
        <button
          onClick={handleDismiss}
          className="absolute -top-2 -right-2 w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center hover:bg-gray-300"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4 text-gray-600" />
        </button>
      </div>
    )
  }

  // Full prompt or Instructions
  return (
    <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center bg-black/50 animate-fade-in">
      <div className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-6 animate-slide-up safe-bottom">
        <button
          onClick={handleDismiss}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg">
            <NigerianShield className="w-10 h-10 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">SafetyAlerts</h2>
            <p className="text-sm text-gray-500">Your community safety companion</p>
          </div>
        </div>

        {/* Benefits */}
        <div className="space-y-3 mb-6">
          <div className="flex items-center gap-3 text-sm">
            <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
              <Smartphone className="w-4 h-4 text-blue-600" />
            </div>
            <span className="text-gray-700">Works offline - no internet needed</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center">
              <span className="text-amber-600 text-lg">⚡</span>
            </div>
            <span className="text-gray-700">Instant push notifications</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center">
              <span className="text-emerald-600 text-lg">🔒</span>
            </div>
            <span className="text-gray-700">Private and secure</span>
          </div>
        </div>

        {/* Install instructions or button */}
        {stage === 'instructions' ? (
          <div className="mb-6">
            <h3 className="font-semibold text-gray-900 mb-3">{instructions.title}</h3>
            <ol className="space-y-3">
              {instructions.steps.map((step, index) => (
                <li key={index} className="flex items-start gap-3">
                  <span className="w-6 h-6 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0">
                    {index + 1}
                  </span>
                  <span className="text-gray-700 text-sm pt-0.5">{step}</span>
                </li>
              ))}
            </ol>

            {/* Visual hint for iOS */}
            {device.isIOS && (
              <div className="mt-4 p-3 bg-gray-50 rounded-xl flex items-center justify-center gap-2">
                <Share className="w-5 h-5 text-blue-500" />
                <span className="text-sm text-gray-600">Look for this Share icon</span>
              </div>
            )}
          </div>
        ) : (
          /* Native install button for Android/Desktop */
          installPrompt && (
            <button
              onClick={handleNativeInstall}
              className="w-full py-3 px-4 bg-emerald-600 text-white font-semibold rounded-xl hover:bg-emerald-700 transition-colors mb-4"
            >
              Install SafetyAlerts
            </button>
          )
        )}

        {/* Dismiss option */}
        <button
          onClick={handleDismiss}
          className="w-full py-2 text-gray-500 text-sm hover:text-gray-700"
        >
          Maybe later
        </button>
      </div>
    </div>
  )
}
