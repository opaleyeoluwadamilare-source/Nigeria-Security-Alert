'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, Radio, Sparkles, X } from 'lucide-react'

interface LiveReportsScrollHintProps {
  targetId?: string
  onDismiss?: () => void
}

export function LiveReportsScrollHint({ 
  targetId = 'live-reports-section',
  onDismiss 
}: LiveReportsScrollHintProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [isDismissed, setIsDismissed] = useState(false)
  const [hasScrolled, setHasScrolled] = useState(false)
  const observerRef = useRef<IntersectionObserver | null>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const dismissedKey = `scroll-hint-dismissed-${targetId}`

  // Check if user has already dismissed this hint
  useEffect(() => {
    const dismissed = localStorage.getItem(dismissedKey)
    if (dismissed === 'true') {
      setIsDismissed(true)
    }
  }, [dismissedKey])

  // Intersection Observer to detect when target section is visible
  useEffect(() => {
    if (isDismissed) return

    const targetElement = document.getElementById(targetId)
    if (!targetElement) return

    // Check initial position - only show if target is below viewport
    const checkInitialPosition = () => {
      const rect = targetElement.getBoundingClientRect()
      const isBelowFold = rect.top > window.innerHeight * 0.8
      
      if (isBelowFold && !hasScrolled) {
        // Delay appearance for better UX (let page settle)
        const delayTimeout = setTimeout(() => {
          setIsVisible(true)
          // Auto-dismiss after 8 seconds if user doesn't interact
          timeoutRef.current = setTimeout(() => {
            handleDismiss()
          }, 8000)
        }, 1500)
        
        return () => clearTimeout(delayTimeout)
      }
    }

    checkInitialPosition()

    // Create Intersection Observer
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          // If target is visible (even partially), hide the hint
          if (entry.isIntersecting) {
            setIsVisible(false)
            if (timeoutRef.current) {
              clearTimeout(timeoutRef.current)
            }
          } else {
            // Only show if target is below viewport and user hasn't scrolled much
            const rect = entry.boundingClientRect
            if (rect.top > window.innerHeight * 0.7 && !hasScrolled) {
              setIsVisible(true)
            }
          }
        })
      },
      {
        root: null,
        rootMargin: '-20% 0px -20% 0px', // Trigger when section is 20% from top/bottom
        threshold: 0.1
      }
    )

    observerRef.current.observe(targetElement)

    // Track scroll to detect user interaction
    let scrollTimeout: NodeJS.Timeout
    const handleScroll = () => {
      setHasScrolled(true)
      // Hide hint if user scrolls significantly
      if (window.scrollY > 200) {
        setIsVisible(false)
      }
      
      clearTimeout(scrollTimeout)
      scrollTimeout = setTimeout(() => {
        // Re-check after scroll settles
        const rect = targetElement.getBoundingClientRect()
        if (rect.top > window.innerHeight * 0.8 && !isDismissed) {
          setIsVisible(true)
        }
      }, 500)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      window.removeEventListener('scroll', handleScroll)
      clearTimeout(scrollTimeout)
    }
  }, [targetId, isDismissed, hasScrolled])

  const handleDismiss = useCallback(() => {
    setIsVisible(false)
    setIsDismissed(true)
    localStorage.setItem(dismissedKey, 'true')
    if (onDismiss) {
      onDismiss()
    }
  }, [dismissedKey, onDismiss])

  const handleScrollToTarget = useCallback(() => {
    const targetElement = document.getElementById(targetId)
    if (targetElement) {
      const headerOffset = 80 // Account for sticky header
      const elementPosition = targetElement.getBoundingClientRect().top
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      })

      // Dismiss after scrolling
      setTimeout(() => {
        handleDismiss()
      }, 500)
    }
  }, [targetId, handleDismiss])

  // Don't show on desktop if screen is large enough to see content
  const [isMobile, setIsMobile] = useState(true)
  
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024 || window.innerHeight < 700)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  if (isDismissed || !isMobile) return null

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.9 }}
          transition={{
            type: 'spring',
            stiffness: 300,
            damping: 30,
            mass: 0.8
          }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] pointer-events-none sm:bottom-8"
          style={{
            paddingLeft: 'max(1rem, env(safe-area-inset-left))',
            paddingRight: 'max(1rem, env(safe-area-inset-right))',
            paddingBottom: 'max(1rem, env(safe-area-inset-bottom))'
          }}
        >
          <motion.div
            className="relative bg-gradient-to-br from-green-500 via-green-600 to-green-700 text-white rounded-2xl shadow-2xl backdrop-blur-xl border border-green-400/30 overflow-hidden pointer-events-auto max-w-[calc(100vw-2rem)] sm:max-w-md"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleScrollToTarget}
          >
            {/* Animated background shimmer */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
              animate={{
                x: ['-100%', '200%']
              }}
              transition={{
                duration: 2.5,
                repeat: Infinity,
                ease: 'linear',
                repeatDelay: 1
              }}
            />

            {/* Pulsing ring effect */}
            <motion.div
              className="absolute inset-0 rounded-2xl border-2 border-white/40"
              animate={{
                scale: [1, 1.05, 1],
                opacity: [0.6, 0.3, 0.6]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut'
              }}
            />

            <div className="relative z-10 px-4 py-3.5 sm:px-5 sm:py-4 flex items-center gap-3 sm:gap-4">
              {/* Icon with pulse animation */}
              <div className="relative flex-shrink-0">
                <motion.div
                  className="absolute inset-0 bg-white/30 rounded-full blur-md"
                  animate={{
                    scale: [1, 1.3, 1],
                    opacity: [0.5, 0, 0.5]
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: 'easeInOut'
                  }}
                />
                <div className="relative bg-white/20 backdrop-blur-sm rounded-full p-2 border border-white/30">
                  <Radio className="w-4 h-4 sm:w-5 sm:h-5 animate-pulse" />
                </div>
              </div>

              {/* Text content */}
              <div className="flex-1 min-w-0">
                <motion.p
                  className="text-sm sm:text-base font-semibold leading-tight mb-0.5"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  Live Intelligence Below
                </motion.p>
                <motion.p
                  className="text-xs sm:text-sm text-green-50/90 leading-tight"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  Today&apos;s updated reports
                </motion.p>
              </div>

              {/* Scroll down icon */}
              <motion.div
                className="flex-shrink-0"
                animate={{
                  y: [0, 4, 0]
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: 'easeInOut'
                }}
              >
                <ChevronDown className="w-5 h-5 sm:w-6 sm:h-6" />
              </motion.div>

              {/* Dismiss button */}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleDismiss()
                }}
                className="flex-shrink-0 p-1 rounded-lg hover:bg-white/20 transition-colors touch-target"
                aria-label="Dismiss"
              >
                <X className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>

            {/* Progress indicator (subtle) */}
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/20">
              <motion.div
                className="h-full bg-white/60"
                initial={{ width: '0%' }}
                animate={{ width: '100%' }}
                transition={{
                  duration: 8,
                  ease: 'linear'
                }}
                onAnimationComplete={() => {
                  if (isVisible) {
                    handleDismiss()
                  }
                }}
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
