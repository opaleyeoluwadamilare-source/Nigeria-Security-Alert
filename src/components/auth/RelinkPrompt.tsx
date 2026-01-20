'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Loader2, CheckCircle2, User, LogIn } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getExistingSubscription } from '@/lib/push'

interface RelinkPromptProps {
  phone: string
  onRelink: (pushEndpoint?: string) => Promise<boolean>
  onUseOtherAccount: () => void
  onNeedsOTP: () => void
}

/**
 * Welcome Back Prompt for iOS PWA Re-authentication
 *
 * This shows when a user has localStorage data but no server session.
 * Typically happens after iOS PWA install (storage isolation) or session expiry.
 *
 * Attempts to re-link using push subscription validation (no OTP needed).
 * Falls back to OTP if push validation fails.
 */
export function RelinkPrompt({
  phone,
  onRelink,
  onUseOtherAccount,
  onNeedsOTP,
}: RelinkPromptProps) {
  const [isAttempting, setIsAttempting] = useState(false)
  const [status, setStatus] = useState<'idle' | 'checking' | 'success' | 'need-otp'>('idle')

  // Mask phone number for display
  const maskedPhone = phone.replace(/(\+234)(\d{3})(\d{3})(\d{4})/, '$1 $2 *** $4')

  // Auto-attempt re-link on mount
  useEffect(() => {
    const autoRelink = async () => {
      setStatus('checking')
      setIsAttempting(true)

      try {
        // Get push subscription endpoint if available
        const subscription = await getExistingSubscription()
        const pushEndpoint = subscription?.endpoint

        // Attempt re-link
        const success = await onRelink(pushEndpoint)

        if (success) {
          setStatus('success')
          // Component will unmount after successful relink
        } else {
          setStatus('need-otp')
        }
      } catch (err) {
        console.error('Auto-relink failed:', err)
        setStatus('need-otp')
      } finally {
        setIsAttempting(false)
      }
    }

    // Small delay to let component render first
    const timer = setTimeout(autoRelink, 500)
    return () => clearTimeout(timer)
  }, [onRelink])

  const handleContinueWithOTP = () => {
    onNeedsOTP()
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
    >
      <motion.div
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        className="bg-white rounded-2xl shadow-xl max-w-sm w-full overflow-hidden"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 p-6 text-white text-center">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
            <User className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold">Welcome Back!</h2>
          <p className="text-emerald-100 text-sm mt-1">{maskedPhone}</p>
        </div>

        {/* Content */}
        <div className="p-6">
          {status === 'checking' && (
            <div className="text-center py-4">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-600 mx-auto mb-3" />
              <p className="text-gray-600">Restoring your session...</p>
              <p className="text-gray-400 text-sm mt-1">This will only take a moment</p>
            </div>
          )}

          {status === 'success' && (
            <div className="text-center py-4">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
              <p className="text-gray-800 font-medium">Session Restored!</p>
              <p className="text-gray-500 text-sm mt-1">Redirecting you now...</p>
            </div>
          )}

          {status === 'need-otp' && (
            <div className="space-y-4">
              <p className="text-gray-600 text-center">
                For your security, please verify your phone number to continue.
              </p>

              <button
                onClick={handleContinueWithOTP}
                className={cn(
                  "w-full py-3 px-4 rounded-xl font-medium transition-all",
                  "bg-emerald-600 text-white hover:bg-emerald-700",
                  "flex items-center justify-center gap-2"
                )}
              >
                <LogIn className="w-5 h-5" />
                Continue with OTP
              </button>

              <button
                onClick={onUseOtherAccount}
                className="w-full py-2 text-gray-500 text-sm hover:text-gray-700 transition-colors"
              >
                Use a different account
              </button>
            </div>
          )}

          {status === 'idle' && (
            <div className="text-center py-4">
              <p className="text-gray-600">Preparing to restore your session...</p>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}
