'use client'

import { motion } from 'framer-motion'
import { Radio } from 'lucide-react'

export type LoadingStage = 
  | 'fetching' 
  | 'analyzing' 
  | 'generating' 
  | 'finalizing' 
  | 'complete'

interface LiveIntelligenceProgressBarProps {
  stage?: LoadingStage
  progress?: number
  className?: string
}

const stageProgress: Record<LoadingStage, number> = {
  fetching: 25,
  analyzing: 50,
  generating: 75,
  finalizing: 90,
  complete: 100,
}

export function LiveIntelligenceProgressBar({ 
  stage = 'fetching',
  progress,
  className = ''
}: LiveIntelligenceProgressBarProps) {
  const progressValue = progress ?? stageProgress[stage]
  
  return (
    <div className={`w-full ${className}`}>
      <div className="bg-gradient-to-r from-green-50 via-blue-50 to-green-50 dark:from-green-950/30 dark:via-blue-950/30 dark:to-green-950/30 border border-green-200 dark:border-green-800/50 rounded-lg backdrop-blur-sm shadow-sm">
        <div className="px-3 sm:px-4 py-2.5 sm:py-3">
          <div className="flex items-center gap-2 sm:gap-3">
            <Radio className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-600 dark:text-green-400 flex-shrink-0 animate-pulse" />
            <span className="text-[10px] sm:text-xs font-semibold text-green-700 dark:text-green-300 uppercase tracking-wider">
              Live Intelligence
            </span>
            <div className="flex-1 h-1.5 sm:h-2 bg-green-100 dark:bg-green-900/30 rounded-full overflow-hidden ml-1 sm:ml-2">
              <motion.div
                className="h-full bg-gradient-to-r from-green-500 via-green-600 to-green-700 rounded-full shadow-sm"
                initial={{ width: 0 }}
                animate={{ width: `${progressValue}%` }}
                transition={{ 
                  duration: 0.5, 
                  ease: 'easeOut' 
                }}
              />
            </div>
            <span className="text-[10px] sm:text-xs font-medium text-green-600 dark:text-green-400 tabular-nums min-w-[28px] sm:min-w-[36px] text-right">
              {progressValue}%
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
