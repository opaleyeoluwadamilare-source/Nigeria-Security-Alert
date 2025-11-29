'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, useInView, useSpring, useTransform } from 'framer-motion'

interface AnimatedCounterProps {
  value: number
  suffix?: string
  duration?: number
}

export function AnimatedCounter({ value, suffix = '', duration = 2 }: AnimatedCounterProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })
  const [hasAnimated, setHasAnimated] = useState(false)
  
  const spring = useSpring(0, {
    duration: duration * 1000,
    bounce: 0,
  })
  
  const display = useTransform(spring, (current) => {
    return Math.floor(current).toLocaleString()
  })

  useEffect(() => {
    if (isInView && !hasAnimated) {
      spring.set(value)
      setHasAnimated(true)
    }
  }, [isInView, hasAnimated, spring, value])

  return (
    <span ref={ref} className="font-mono tabular-nums">
      <motion.span>{display}</motion.span>
      {suffix}
    </span>
  )
}


