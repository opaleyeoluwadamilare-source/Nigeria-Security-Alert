'use client'

import { WifiOff, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/Button'

export default function OfflinePage() {
  const handleRetry = () => {
    window.location.reload()
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-muted rounded-full mb-6">
          <WifiOff className="w-10 h-10 text-muted-foreground" />
        </div>

        <h1 className="text-2xl font-bold text-foreground mb-3">
          You&apos;re offline
        </h1>

        <p className="text-muted-foreground mb-6">
          Check your internet connection and try again. SafetyAlerts needs an internet connection to show you the latest alerts.
        </p>

        <Button onClick={handleRetry} className="btn-primary">
          <RefreshCw className="w-5 h-5 mr-2" />
          Try Again
        </Button>

        <p className="text-xs text-muted-foreground mt-6">
          Don&apos;t worry - you&apos;ll still receive push notifications for critical alerts even while offline.
        </p>
      </div>
    </div>
  )
}
