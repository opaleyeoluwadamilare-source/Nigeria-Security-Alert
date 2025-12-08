'use client'

import React from 'react'
import { cn } from '@/lib/utils'

interface RocketLoaderProps {
  className?: string
  locationName?: string
}

export function RocketLoader({ className, locationName }: RocketLoaderProps) {
  return (
    <div className={cn("loader-container", className)}>
      {/* Clouds - Subtle background animation */}
      <div className="clouds" aria-hidden="true">
        <div className="cloud cloud1" />
        <div className="cloud cloud2" />
        <div className="cloud cloud3" />
        <div className="cloud cloud4" />
        <div className="cloud cloud5" />
      </div>
      
      {/* Main Rocket Loader */}
      <div className="loader" aria-label="Loading">
        <span>
          <span />
          <span />
          <span />
          <span />
        </span>
        <div className="base">
          <span />
          <div className="face" />
        </div>
      </div>
      
      {/* Trailing Effects */}
      <div className="longfazers" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
      </div>
      
      {/* Location Name Display (if provided) */}
      {locationName && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-center z-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md border border-green-200 dark:border-green-800 shadow-lg">
            <span className="text-xs sm:text-sm font-medium text-green-700 dark:text-green-400 font-mono tracking-wider uppercase">
              Analyzing: {locationName}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

