'use client'

import { motion } from 'framer-motion'
import { Shield, Star, CheckCircle, User, Sparkles } from 'lucide-react'
import { getTrustScoreDisplay, TrustLevel } from '@/lib/trust-score'

interface TrustScoreBadgeProps {
  score: number
  showDetails?: boolean
  size?: 'sm' | 'md' | 'lg'
}

const levelIcons: Record<TrustLevel, React.ReactNode> = {
  'Guardian': <Shield className="w-full h-full" />,
  'Verified': <CheckCircle className="w-full h-full" />,
  'Trusted': <Star className="w-full h-full" />,
  'Member': <User className="w-full h-full" />,
  'New': <Sparkles className="w-full h-full" />,
}

const levelColors: Record<TrustLevel, { bg: string; text: string; border: string }> = {
  'Guardian': { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200' },
  'Verified': { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200' },
  'Trusted': { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200' },
  'Member': { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-200' },
  'New': { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-200' },
}

export function TrustScoreBadge({ score, showDetails = false, size = 'md' }: TrustScoreBadgeProps) {
  const display = getTrustScoreDisplay(score)
  const colors = levelColors[display.level]

  const sizeClasses = {
    sm: { icon: 'w-4 h-4', text: 'text-xs', padding: 'px-2 py-1' },
    md: { icon: 'w-5 h-5', text: 'text-sm', padding: 'px-3 py-1.5' },
    lg: { icon: 'w-6 h-6', text: 'text-base', padding: 'px-4 py-2' },
  }

  const sizes = sizeClasses[size]

  return (
    <div className="inline-flex items-center gap-2">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className={`inline-flex items-center gap-2 rounded-full border ${colors.bg} ${colors.border} ${sizes.padding}`}
      >
        <span className={`${sizes.icon} ${colors.text}`}>
          {levelIcons[display.level]}
        </span>
        <span className={`font-medium ${colors.text} ${sizes.text}`}>
          {display.label}
        </span>
        {showDetails && (
          <span className={`${colors.text} ${sizes.text} opacity-70`}>
            ({score})
          </span>
        )}
      </motion.div>
    </div>
  )
}

interface TrustScoreCardProps {
  score: number
  phoneVerified?: boolean
  accountAge?: string
  totalReports?: number
}

export function TrustScoreCard({
  score,
  phoneVerified = false,
  accountAge = 'New',
  totalReports = 0,
}: TrustScoreCardProps) {
  const display = getTrustScoreDisplay(score)
  const colors = levelColors[display.level]

  // Calculate progress to next level
  const levelThresholds = [0, 20, 40, 60, 80, 100]
  const currentThresholdIndex = levelThresholds.findIndex(t => t > score) - 1
  const currentThreshold = levelThresholds[Math.max(0, currentThresholdIndex)]
  const nextThreshold = levelThresholds[currentThresholdIndex + 1] || 100
  const progress = ((score - currentThreshold) / (nextThreshold - currentThreshold)) * 100

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-background-elevated rounded-2xl p-5 border border-border"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-foreground">Trust Score</h3>
        <TrustScoreBadge score={score} showDetails />
      </div>

      {/* Score Bar */}
      <div className="mb-4">
        <div className="flex justify-between text-xs text-muted-foreground mb-1">
          <span>Score: {score}/100</span>
          {score < 100 && (
            <span>Next level: {nextThreshold}</span>
          )}
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${score}%` }}
            transition={{ duration: 0.5 }}
            className={`h-full ${colors.bg.replace('100', '500')}`}
            style={{ backgroundColor: display.color === 'emerald' ? '#10B981' : display.color === 'blue' ? '#3B82F6' : display.color === 'green' ? '#22C55E' : display.color === 'yellow' ? '#EAB308' : '#6B7280' }}
          />
        </div>
      </div>

      {/* Description */}
      <p className="text-sm text-muted-foreground mb-4">
        {display.description}
      </p>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 text-center">
        <div className="p-2 bg-muted/50 rounded-lg">
          <div className="text-lg font-semibold text-foreground">
            {phoneVerified ? '✓' : '✗'}
          </div>
          <div className="text-xs text-muted-foreground">Phone Verified</div>
        </div>
        <div className="p-2 bg-muted/50 rounded-lg">
          <div className="text-lg font-semibold text-foreground">{totalReports}</div>
          <div className="text-xs text-muted-foreground">Reports</div>
        </div>
        <div className="p-2 bg-muted/50 rounded-lg">
          <div className="text-lg font-semibold text-foreground">{accountAge}</div>
          <div className="text-xs text-muted-foreground">Member</div>
        </div>
      </div>

      {/* Tips to improve */}
      {score < 60 && (
        <div className="mt-4 p-3 bg-primary/5 rounded-xl">
          <p className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Tip:</span> Submit accurate reports and help confirm others&apos; reports to increase your trust score.
          </p>
        </div>
      )}
    </motion.div>
  )
}
