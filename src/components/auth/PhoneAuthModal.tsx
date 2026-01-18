'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Phone, Shield, ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { NigerianShield } from '@/components/landing/NigerianShield'

interface PhoneAuthModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (user: { id: string; phone: string }) => void
}

type AuthStep = 'phone' | 'otp' | 'success'

/**
 * Phone OTP Authentication Modal
 * Optimized for Nigerian phone numbers with Africa's Talking integration
 */
export function PhoneAuthModal({ isOpen, onClose, onSuccess }: PhoneAuthModalProps) {
  const [step, setStep] = useState<AuthStep>('phone')
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const [sandboxCode, setSandboxCode] = useState<string | null>(null)

  const otpRefs = useRef<(HTMLInputElement | null)[]>([])

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep('phone')
      setPhone('')
      setOtp(['', '', '', '', '', ''])
      setError('')
      setLoading(false)
      setCountdown(0)
      setSandboxCode(null)
    }
  }, [isOpen])

  // Countdown timer for resend
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [countdown])

  // Format Nigerian phone number
  const formatPhone = (value: string) => {
    // Remove all non-digits
    const digits = value.replace(/\D/g, '')

    // Handle various formats
    if (digits.startsWith('234')) {
      return '+' + digits.slice(0, 13)
    } else if (digits.startsWith('0')) {
      return '+234' + digits.slice(1, 11)
    } else if (digits.length <= 10) {
      return '+234' + digits.slice(0, 10)
    }
    return '+234' + digits.slice(0, 10)
  }

  // Validate phone number
  const isValidPhone = (phone: string) => {
    const cleaned = phone.replace(/\D/g, '')
    return cleaned.length >= 10 && cleaned.length <= 13
  }

  // Handle phone submission
  const handleSendOTP = async () => {
    const formattedPhone = formatPhone(phone)

    if (!isValidPhone(phone)) {
      setError('Please enter a valid Nigerian phone number')
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: formattedPhone }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send OTP')
      }

      // In sandbox mode, the code is returned for testing
      if (data.code) {
        setSandboxCode(data.code)
      }

      setStep('otp')
      setCountdown(60) // 60 second cooldown for resend
      // Focus first OTP input
      setTimeout(() => otpRefs.current[0]?.focus(), 100)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send OTP. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Handle OTP input
  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return

    const newOtp = [...otp]
    newOtp[index] = value.slice(-1) // Only take last digit

    setOtp(newOtp)
    setError('')

    // Auto-advance to next input
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus()
    }

    // Auto-submit when complete
    if (value && index === 5 && newOtp.every(d => d)) {
      handleVerifyOTP(newOtp.join(''))
    }
  }

  // Handle OTP keydown (backspace)
  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus()
    }
  }

  // Handle OTP paste
  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (pastedData.length === 6) {
      const newOtp = pastedData.split('')
      setOtp(newOtp)
      handleVerifyOTP(pastedData)
    }
  }

  // Verify OTP
  const handleVerifyOTP = async (otpCode: string) => {
    const formattedPhone = formatPhone(phone)

    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: formattedPhone, code: otpCode }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Invalid OTP')
      }

      setStep('success')

      // Store auth data
      localStorage.setItem('safety-alerts-user', JSON.stringify({
        id: data.userId,
        phone: formattedPhone,
        token: data.token,
      }))

      // Notify parent after brief success animation
      setTimeout(() => {
        onSuccess({ id: data.userId, phone: formattedPhone })
      }, 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid OTP. Please try again.')
      setOtp(['', '', '', '', '', ''])
      otpRefs.current[0]?.focus()
    } finally {
      setLoading(false)
    }
  }

  // Resend OTP
  const handleResend = () => {
    if (countdown === 0) {
      setOtp(['', '', '', '', '', ''])
      handleSendOTP()
    }
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          transition={{ type: 'spring', damping: 25 }}
          className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl overflow-hidden safe-bottom"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="relative px-6 pt-6 pb-4">
            {step === 'otp' && (
              <button
                onClick={() => setStep('phone')}
                className="absolute left-4 top-4 p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <button
              onClick={onClose}
              className="absolute right-4 top-4 p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="px-6 pb-8">
            <AnimatePresence mode="wait">
              {/* Phone Step */}
              {step === 'phone' && (
                <motion.div
                  key="phone"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                >
                  <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <NigerianShield className="w-10 h-10" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900">Welcome to SafetyAlerts</h2>
                    <p className="text-gray-500 mt-2">Enter your phone number to get started</p>
                  </div>

                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phone Number
                    </label>
                    <div className={cn(
                      'flex items-center rounded-xl border overflow-hidden',
                      'focus-within:ring-2 focus-within:ring-emerald-500/20 focus-within:border-emerald-500',
                      error ? 'border-red-500' : 'border-gray-200'
                    )}>
                      <div className="flex items-center gap-2 px-4 py-3.5 bg-gray-50 border-r border-gray-200">
                        <span className="text-lg">🇳🇬</span>
                        <span className="text-sm font-semibold text-gray-600">+234</span>
                      </div>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => {
                          setPhone(e.target.value)
                          setError('')
                        }}
                        placeholder="812 345 6789"
                        className="flex-1 px-4 py-3.5 text-lg bg-transparent focus:outline-none"
                        autoFocus
                      />
                    </div>
                    {error && (
                      <p className="mt-2 text-sm text-red-500">{error}</p>
                    )}
                  </div>

                  <button
                    onClick={handleSendOTP}
                    disabled={loading || !phone}
                    className="w-full py-3.5 bg-emerald-600 text-white font-semibold rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Phone className="w-5 h-5" />
                        Send Verification Code
                      </>
                    )}
                  </button>

                  <p className="text-center text-xs text-gray-400 mt-4">
                    By continuing, you agree to our Terms of Service and Privacy Policy
                  </p>
                </motion.div>
              )}

              {/* OTP Step */}
              {step === 'otp' && (
                <motion.div
                  key="otp"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                >
                  <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <Shield className="w-8 h-8 text-blue-600" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900">Enter Verification Code</h2>
                    <p className="text-gray-500 mt-2">
                      We sent a 6-digit code to<br />
                      <span className="font-medium text-gray-700">{formatPhone(phone)}</span>
                    </p>
                    {sandboxCode && (
                      <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                        <p className="text-xs text-amber-600 font-medium">TEST MODE</p>
                        <p className="text-2xl font-bold text-amber-700 tracking-widest mb-2">{sandboxCode}</p>
                        <button
                          onClick={() => {
                            const codeArray = sandboxCode.split('')
                            setOtp(codeArray)
                            handleVerifyOTP(sandboxCode)
                          }}
                          className="text-xs bg-amber-600 text-white px-3 py-1.5 rounded-lg hover:bg-amber-700 transition-colors"
                        >
                          Use Test Code
                        </button>
                      </div>
                    )}
                  </div>

                  {/* OTP Input */}
                  <div className="mb-6">
                    <div className="flex gap-2 justify-center" onPaste={handleOtpPaste}>
                      {otp.map((digit, index) => (
                        <input
                          key={index}
                          ref={(el) => { otpRefs.current[index] = el }}
                          type="text"
                          inputMode="numeric"
                          maxLength={1}
                          value={digit}
                          onChange={(e) => handleOtpChange(index, e.target.value)}
                          onKeyDown={(e) => handleOtpKeyDown(index, e)}
                          className={cn(
                            'w-12 h-14 text-center text-2xl font-bold rounded-xl border',
                            'focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500',
                            error ? 'border-red-500 bg-red-50' : 'border-gray-200 bg-gray-50'
                          )}
                          disabled={loading}
                        />
                      ))}
                    </div>
                    {error && (
                      <p className="mt-3 text-sm text-red-500 text-center">{error}</p>
                    )}
                  </div>

                  {/* Verify Button */}
                  <button
                    onClick={() => handleVerifyOTP(otp.join(''))}
                    disabled={loading || otp.some(d => !d)}
                    className="w-full py-3.5 bg-emerald-600 text-white font-semibold rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Verifying...
                      </>
                    ) : (
                      'Verify Code'
                    )}
                  </button>

                  {/* Resend */}
                  <div className="text-center mt-4">
                    {countdown > 0 ? (
                      <p className="text-sm text-gray-500">
                        Resend code in <span className="font-medium">{countdown}s</span>
                      </p>
                    ) : (
                      <button
                        onClick={handleResend}
                        className="text-sm text-emerald-600 font-medium hover:text-emerald-700"
                      >
                        Resend code
                      </button>
                    )}
                  </div>
                </motion.div>
              )}

              {/* Success Step */}
              {step === 'success' && (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-8"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', delay: 0.2 }}
                    className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6"
                  >
                    <CheckCircle2 className="w-10 h-10 text-emerald-600" />
                  </motion.div>
                  <h2 className="text-xl font-bold text-gray-900">You&apos;re all set!</h2>
                  <p className="text-gray-500 mt-2">Welcome to SafetyAlerts</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
