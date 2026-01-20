'use client'

import { useEffect } from 'react'
import { useAppStore } from '@/lib/store'
import { useNetworkStatus } from '@/hooks/useNetworkStatus'
import { useAppInit } from '@/hooks/useAppInit'
import { usePushManager } from '@/hooks/usePushManager'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { setIsOnline } = useAppStore()
  const { isOnline } = useNetworkStatus()
  const { isInitialized, isLoading } = useAppInit()

  // Automatically manage push notifications
  // This ensures subscriptions persist and are restored if lost
  usePushManager()

  useEffect(() => {
    setIsOnline(isOnline)
  }, [isOnline, setIsOnline])

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Offline Banner */}
      {!isOnline && (
        <div className="fixed top-0 left-0 right-0 bg-yellow-500 text-white text-center py-2 text-sm z-50">
          You&apos;re offline. Some features may be limited.
        </div>
      )}
      {/* Loading state while initializing */}
      {isLoading && (
        <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-gray-600">Loading your data...</p>
          </div>
        </div>
      )}
      {children}
    </div>
  )
}
