'use client'

import { motion } from 'framer-motion'

interface SkeletonLoaderProps {
  className?: string
}

export function SkeletonLoader({ className = '' }: SkeletonLoaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0.5 }}
      animate={{ opacity: [0.5, 1, 0.5] }}
      transition={{ duration: 1.5, repeat: Infinity }}
      className={`bg-muted rounded-lg ${className}`}
    />
  )
}

export function CardSkeleton() {
  return (
    <div className="bg-background border border-border rounded-xl p-6 space-y-4">
      <SkeletonLoader className="h-4 w-1/3" />
      <SkeletonLoader className="h-8 w-2/3" />
      <SkeletonLoader className="h-4 w-full" />
    </div>
  )
}

export function StatSkeleton() {
  return (
    <div className="bg-background border border-border rounded-xl p-6 flex flex-col items-center space-y-3">
      <SkeletonLoader className="w-12 h-12 rounded-lg" />
      <SkeletonLoader className="h-10 w-24" />
      <SkeletonLoader className="h-4 w-32" />
    </div>
  )
}


