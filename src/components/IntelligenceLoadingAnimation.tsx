'use client'

import { useState, useEffect } from 'react'
import { RocketLoader } from '@/components/ui/rocket-loader'
import { LoadingStage } from '@/components/ui/LiveIntelligenceProgressBar'

interface IntelligenceLoadingAnimationProps {
  locationName?: string
  className?: string
  loadingStage?: LoadingStage
}

const intelligentMessages: Record<LoadingStage, string[]> = {
  fetching: [
    'Gathering the latest security reports...',
    'Checking recent activity in your area...',
    'Scanning for the most current information...',
  ],
  analyzing: [
    'Reviewing incidents and patterns...',
    'Analyzing what matters most to you...',
    'Identifying relevant security updates...',
  ],
  generating: [
    'Preparing your personalized safety report...',
    'Putting together the key insights...',
    'Creating your tailored intelligence briefing...',
  ],
  finalizing: [
    'Almost ready! Finalizing details...',
    'Just a moment, adding the finishing touches...',
    'Nearly done! Preparing your report...',
  ],
  complete: [
    'Your intelligence report is ready!',
    'All set! Here\'s what you need to know...',
    'Complete! Your safety information is ready...',
  ],
}

export function IntelligenceLoadingAnimation({ 
  locationName,
  className = '',
  loadingStage = 'fetching'
}: IntelligenceLoadingAnimationProps) {
  const [currentMessage, setCurrentMessage] = useState<string>('')
  const [messageIndex, setMessageIndex] = useState(0)

  useEffect(() => {
    const messages = intelligentMessages[loadingStage]
    if (messages && messages.length > 0) {
      setCurrentMessage(messages[messageIndex % messages.length])
    }
  }, [loadingStage, messageIndex])

  useEffect(() => {
    const messages = intelligentMessages[loadingStage]
    if (messages && messages.length > 1) {
      const interval = setInterval(() => {
        setMessageIndex(prev => (prev + 1) % messages.length)
      }, 3000)
      return () => clearInterval(interval)
    }
  }, [loadingStage])

  return (
    <div className={`w-full h-[400px] sm:h-[500px] md:h-[600px] relative ${className}`}>
      <RocketLoader locationName={locationName} />
      
      {/* Intelligent Feedback Message */}
      <div className="absolute bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 w-full max-w-md px-4 z-20">
        <div className="bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border border-green-200 dark:border-green-800 rounded-lg shadow-lg px-4 py-3 sm:px-5 sm:py-3.5">
          <p className="text-xs sm:text-sm text-center text-gray-700 dark:text-gray-300 font-medium leading-relaxed">
            {currentMessage}
          </p>
        </div>
      </div>
    </div>
  )
}
