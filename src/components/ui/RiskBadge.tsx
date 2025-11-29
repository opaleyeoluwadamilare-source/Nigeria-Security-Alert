'use client'

import { motion } from 'framer-motion'
import { AlertOctagon, AlertTriangle, AlertCircle, ShieldCheck } from 'lucide-react'

type RiskLevel = 'EXTREME' | 'VERY HIGH' | 'HIGH' | 'MODERATE'

interface RiskBadgeProps {
  level: RiskLevel
  size?: 'sm' | 'md' | 'lg'
  showIcon?: boolean
}

const riskConfig = {
  'EXTREME': {
    bg: 'bg-risk-extreme',
    text: 'text-white',
    icon: AlertOctagon,
    pulse: true,
  },
  'VERY HIGH': {
    bg: 'bg-risk-very-high',
    text: 'text-white',
    icon: AlertTriangle,
    pulse: false,
  },
  'HIGH': {
    bg: 'bg-risk-high',
    text: 'text-foreground',
    icon: AlertCircle,
    pulse: false,
  },
  'MODERATE': {
    bg: 'bg-risk-moderate',
    text: 'text-white',
    icon: ShieldCheck,
    pulse: false,
  },
}

const sizes = {
  sm: 'px-2 py-1 text-[10px]',
  md: 'px-3 py-1.5 text-xs',
  lg: 'px-4 py-2 text-sm',
}

const iconSizes = {
  sm: 'w-3 h-3',
  md: 'w-3.5 h-3.5',
  lg: 'w-4 h-4',
}

export function RiskBadge({ level, size = 'md', showIcon = true }: RiskBadgeProps) {
  const config = riskConfig[level]
  const Icon = config.icon

  return (
    <motion.span
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={`
        inline-flex items-center gap-1.5 rounded-full font-semibold uppercase tracking-wide
        ${config.bg} ${config.text} ${sizes[size]}
        ${config.pulse ? 'animate-pulse-slow' : ''}
      `}
    >
      {showIcon && <Icon className={iconSizes[size]} />}
      {level}
    </motion.span>
  )
}


