'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, useInView, useSpring, useMotionValue } from 'framer-motion'

interface AnimatedCounterProps {
  value: number
  suffix?: string
  duration?: number
}

export function AnimatedCounter({ value, suffix = '', duration = 2 }: AnimatedCounterProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })
  const [hasAnimated, setHasAnimated] = useState(false)
  const [displayValue, setDisplayValue] = useState(0)
  
  const spring = useSpring(0, {
    duration: duration * 1000,
    bounce: 0,
  })

  useEffect(() => {
    if (isInView && !hasAnimated) {
      spring.set(value)
      setHasAnimated(true)
    }
  }, [isInView, hasAnimated, spring, value])

  useEffect(() => {
    const unsubscribe = spring.on('change', (latest) => {
      setDisplayValue(Math.floor(latest))
    })
    return () => unsubscribe()
  }, [spring])

  return (
    <span ref={ref} className="font-mono tabular-nums">
      {displayValue.toLocaleString()}
      {suffix}
    </span>
  )
}


