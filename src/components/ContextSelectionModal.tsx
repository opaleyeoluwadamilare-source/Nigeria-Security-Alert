'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Home, Plane, Car } from 'lucide-react'

type UserContext = 'resident' | 'visitor' | 'transit'

interface ContextSelectionModalProps {
  isOpen: boolean
  onSelect: (context: UserContext) => void
  locationName?: string
}

export function ContextSelectionModal({ isOpen, onSelect, locationName }: ContextSelectionModalProps) {
  const contexts: Array<{ 
    value: UserContext
    label: string
    icon: typeof Home
    description: string
    gradient: string
    hoverBorder: string
  }> = [
    {
      value: 'resident',
      label: 'Resident',
      icon: Home,
      description: 'I live here or spend significant time in this area',
      gradient: 'from-blue-500 to-blue-600',
      hoverBorder: 'hover:border-blue-400 dark:hover:border-blue-500',
    },
    {
      value: 'visitor',
      label: 'Visitor',
      icon: Plane,
      description: 'I\'m visiting or planning to visit this location',
      gradient: 'from-green-500 to-green-600',
      hoverBorder: 'hover:border-green-400 dark:hover:border-green-500',
    },
    {
      value: 'transit',
      label: 'Transit',
      icon: Car,
      description: 'I\'m passing through or traveling via this area',
      gradient: 'from-green-600 to-green-700',
      hoverBorder: 'hover:border-green-400 dark:hover:border-green-600',
    },
  ]

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 dark:bg-black/90 backdrop-blur-md z-[200]"
            onClick={() => {}}
          />
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ type: 'spring', duration: 0.3, bounce: 0.15 }}
            className="fixed inset-0 z-[201] flex items-start justify-center p-0 sm:p-4 sm:items-center overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-full sm:max-w-md bg-white dark:bg-zinc-900 rounded-none sm:rounded-2xl shadow-2xl border-0 sm:border border-gray-200 dark:border-zinc-800 overflow-hidden min-h-screen sm:min-h-0">
              <div className="bg-gradient-to-r from-green-500 via-green-600 to-green-700 px-4 sm:px-6 py-4 sm:py-5">
                <h2 className="text-lg sm:text-xl font-bold text-white">
                  Choose Your Perspective
                </h2>
                {locationName && (
                  <p className="text-green-50 text-xs sm:text-sm mt-1 font-medium">
                    {locationName}
                  </p>
                )}
              </div>

              <div className="p-4 sm:p-6 space-y-2.5 sm:space-y-3">
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 text-center mb-1 sm:mb-2 leading-relaxed">
                  Select how you'll be using this location to get personalized safety information
                </p>

                <div className="space-y-2 sm:space-y-2.5">
                  {contexts.map((context) => {
                    const Icon = context.icon
                    
                    return (
                      <motion.button
                        key={context.value}
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        onClick={() => onSelect(context.value)}
                        className={`w-full p-3.5 sm:p-4 rounded-xl border-2 border-gray-200 dark:border-zinc-700 ${context.hoverBorder} transition-all text-left group bg-white dark:bg-zinc-800 hover:shadow-md active:shadow-sm`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-lg bg-gradient-to-br ${context.gradient} text-white flex-shrink-0 shadow-sm`}>
                            <Icon className="w-5 h-5" />
                          </div>
                          <div className="flex-1 min-w-0 pt-0.5">
                            <h3 className="font-semibold text-sm sm:text-base text-gray-900 dark:text-white mb-0.5">
                              {context.label}
                            </h3>
                            <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                              {context.description}
                            </p>
                          </div>
                        </div>
                      </motion.button>
                    )
                  })}
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
