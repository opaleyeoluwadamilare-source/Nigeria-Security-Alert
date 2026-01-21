/**
 * Trust Score System
 *
 * A sophisticated reputation system that tracks user credibility
 * based on their reporting accuracy and community behavior.
 *
 * Score Range: 0-100
 *
 * Starting Score: 10 (new users)
 *
 * Score Factors:
 * - Phone verification: +15
 * - Account age bonus: +1 per month (max +10)
 * - Report confirmations: +3 per confirmation on user's reports
 * - Report denials: -2 per denial on user's reports
 * - Accurate confirmations: +1 when user confirms a report that gets >70% confirmation
 * - Inaccurate confirmations: -1 when user confirms a report that gets <30% confirmation
 * - Admin warnings: -10
 * - Admin report removal: -15
 * - Report goes viral (>20 confirmations): +5
 */

export interface TrustScoreFactors {
  baseScore: number
  phoneVerified: boolean
  accountAgeMonths: number
  totalReports: number
  totalConfirmationsReceived: number
  totalDenialsReceived: number
  accurateConfirmations: number
  inaccurateConfirmations: number
  adminWarnings: number
  reportRemovals: number
  viralReports: number
}

export interface TrustScoreBreakdown {
  total: number
  base: number
  phoneBonus: number
  ageBonus: number
  reportingBonus: number
  confirmationBonus: number
  penalties: number
  level: TrustLevel
  nextLevelProgress: number
}

export type TrustLevel = 'New' | 'Member' | 'Trusted' | 'Verified' | 'Guardian'

// Score thresholds for each level
const TRUST_LEVELS: { level: TrustLevel; minScore: number; label: string; color: string }[] = [
  { level: 'Guardian', minScore: 80, label: 'Community Guardian', color: 'emerald' },
  { level: 'Verified', minScore: 60, label: 'Verified Reporter', color: 'blue' },
  { level: 'Trusted', minScore: 40, label: 'Trusted Member', color: 'green' },
  { level: 'Member', minScore: 20, label: 'Active Member', color: 'yellow' },
  { level: 'New', minScore: 0, label: 'New User', color: 'gray' },
]

// Score adjustments
const SCORE_ADJUSTMENTS = {
  PHONE_VERIFIED: 15,
  AGE_BONUS_PER_MONTH: 1,
  AGE_BONUS_MAX: 10,
  CONFIRMATION_RECEIVED: 3,
  DENIAL_RECEIVED: -2,
  ACCURATE_CONFIRMATION: 1,
  INACCURATE_CONFIRMATION: -1,
  ADMIN_WARNING: -10,
  REPORT_REMOVED: -15,
  VIRAL_REPORT: 5,
  NEW_USER_BASE: 10,
  MIN_SCORE: 0,
  MAX_SCORE: 100,
}

/**
 * Calculate trust score from factors
 */
export function calculateTrustScore(factors: TrustScoreFactors): TrustScoreBreakdown {
  // Base score
  let base = factors.baseScore || SCORE_ADJUSTMENTS.NEW_USER_BASE

  // Phone verification bonus
  const phoneBonus = factors.phoneVerified ? SCORE_ADJUSTMENTS.PHONE_VERIFIED : 0

  // Account age bonus (capped)
  const ageBonus = Math.min(
    factors.accountAgeMonths * SCORE_ADJUSTMENTS.AGE_BONUS_PER_MONTH,
    SCORE_ADJUSTMENTS.AGE_BONUS_MAX
  )

  // Reporting score (confirmations vs denials on user's reports)
  const confirmationScore = factors.totalConfirmationsReceived * SCORE_ADJUSTMENTS.CONFIRMATION_RECEIVED
  const denialScore = factors.totalDenialsReceived * Math.abs(SCORE_ADJUSTMENTS.DENIAL_RECEIVED)
  const reportingBonus = confirmationScore - denialScore

  // Confirmation accuracy bonus
  const accuracyBonus =
    (factors.accurateConfirmations * SCORE_ADJUSTMENTS.ACCURATE_CONFIRMATION) +
    (factors.inaccurateConfirmations * SCORE_ADJUSTMENTS.INACCURATE_CONFIRMATION)

  // Viral bonus
  const viralBonus = factors.viralReports * SCORE_ADJUSTMENTS.VIRAL_REPORT

  // Penalties
  const warningPenalty = factors.adminWarnings * Math.abs(SCORE_ADJUSTMENTS.ADMIN_WARNING)
  const removalPenalty = factors.reportRemovals * Math.abs(SCORE_ADJUSTMENTS.REPORT_REMOVED)
  const penalties = warningPenalty + removalPenalty

  // Calculate total
  const confirmationBonus = accuracyBonus + viralBonus
  let total = base + phoneBonus + ageBonus + reportingBonus + confirmationBonus - penalties

  // Clamp to valid range
  total = Math.max(SCORE_ADJUSTMENTS.MIN_SCORE, Math.min(SCORE_ADJUSTMENTS.MAX_SCORE, total))

  // Determine level
  const levelInfo = getTrustLevel(total)

  // Calculate progress to next level
  const nextLevel = TRUST_LEVELS.find(l => l.minScore > total)
  const currentLevel = TRUST_LEVELS.find(l => l.minScore <= total) || TRUST_LEVELS[TRUST_LEVELS.length - 1]
  const nextLevelProgress = nextLevel
    ? ((total - currentLevel.minScore) / (nextLevel.minScore - currentLevel.minScore)) * 100
    : 100

  return {
    total: Math.round(total),
    base,
    phoneBonus,
    ageBonus,
    reportingBonus: Math.round(reportingBonus),
    confirmationBonus: Math.round(confirmationBonus),
    penalties: Math.round(penalties),
    level: levelInfo.level,
    nextLevelProgress: Math.round(nextLevelProgress),
  }
}

/**
 * Get trust level from score
 */
export function getTrustLevel(score: number): { level: TrustLevel; label: string; color: string } {
  for (const levelInfo of TRUST_LEVELS) {
    if (score >= levelInfo.minScore) {
      return levelInfo
    }
  }
  return TRUST_LEVELS[TRUST_LEVELS.length - 1]
}

/**
 * Calculate a simple delta for common actions
 */
export function getScoreAdjustment(action:
  | 'report_confirmed'
  | 'report_denied'
  | 'confirmation_accurate'
  | 'confirmation_inaccurate'
  | 'admin_warning'
  | 'report_removed'
  | 'report_viral'
  | 'phone_verified'
): number {
  switch (action) {
    case 'report_confirmed':
      return SCORE_ADJUSTMENTS.CONFIRMATION_RECEIVED
    case 'report_denied':
      return SCORE_ADJUSTMENTS.DENIAL_RECEIVED
    case 'confirmation_accurate':
      return SCORE_ADJUSTMENTS.ACCURATE_CONFIRMATION
    case 'confirmation_inaccurate':
      return SCORE_ADJUSTMENTS.INACCURATE_CONFIRMATION
    case 'admin_warning':
      return SCORE_ADJUSTMENTS.ADMIN_WARNING
    case 'report_removed':
      return SCORE_ADJUSTMENTS.REPORT_REMOVED
    case 'report_viral':
      return SCORE_ADJUSTMENTS.VIRAL_REPORT
    case 'phone_verified':
      return SCORE_ADJUSTMENTS.PHONE_VERIFIED
    default:
      return 0
  }
}

/**
 * Apply a score adjustment and return the new score
 */
export function applyScoreAdjustment(currentScore: number, adjustment: number): number {
  const newScore = currentScore + adjustment
  return Math.max(SCORE_ADJUSTMENTS.MIN_SCORE, Math.min(SCORE_ADJUSTMENTS.MAX_SCORE, newScore))
}

/**
 * Get display info for a trust score
 */
export function getTrustScoreDisplay(score: number): {
  level: TrustLevel
  label: string
  color: string
  badge: string
  description: string
} {
  const levelInfo = getTrustLevel(score)

  const descriptions: Record<TrustLevel, string> = {
    'Guardian': 'Highly trusted community protector with excellent track record',
    'Verified': 'Verified reporter with consistent accurate reports',
    'Trusted': 'Trusted member with good reporting history',
    'Member': 'Active community member building reputation',
    'New': 'New user, building trust through participation',
  }

  const badges: Record<TrustLevel, string> = {
    'Guardian': '🛡️',
    'Verified': '✅',
    'Trusted': '⭐',
    'Member': '👤',
    'New': '🆕',
  }

  return {
    level: levelInfo.level,
    label: levelInfo.label,
    color: levelInfo.color,
    badge: badges[levelInfo.level],
    description: descriptions[levelInfo.level],
  }
}

/**
 * Check if a user should be auto-trusted for reports
 * (their reports skip initial verification for high-trust users)
 */
export function shouldAutoTrust(score: number): boolean {
  return score >= 60 // Verified or Guardian level
}

/**
 * Get report weight multiplier based on trust score
 * Higher trust = their confirmations count more
 */
export function getConfirmationWeight(score: number): number {
  if (score >= 80) return 2.0  // Guardian: counts as 2 confirmations
  if (score >= 60) return 1.5  // Verified: counts as 1.5
  if (score >= 40) return 1.2  // Trusted: counts as 1.2
  if (score >= 20) return 1.0  // Member: normal weight
  return 0.5                    // New: counts as 0.5 (reduced weight)
}
