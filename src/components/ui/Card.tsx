'use client'

import { motion, HTMLMotionProps } from 'framer-motion'
import { forwardRef } from 'react'

interface CardProps extends Omit<HTMLMotionProps<'div'>, 'ref'> {
  hover?: boolean
  children: React.ReactNode
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ hover = true, className = '', children, ...props }, ref) => {
    return (
      <motion.div
        ref={ref}
        whileHover={hover ? { y: -4, scale: 1.01 } : undefined}
        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
        className={`
          bg-background border border-border rounded-xl shadow-sm
          ${hover ? 'cursor-pointer hover:shadow-lg hover:border-border/80' : ''}
          transition-all duration-200
          ${className}
        `}
        {...props}
      >
        {children}
      </motion.div>
    )
  }
)

Card.displayName = 'Card'

