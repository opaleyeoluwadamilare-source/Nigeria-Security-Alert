'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import { Shield, Route, Phone, Info, Heart, Home, Map, Users, Sparkles } from 'lucide-react'

const navLinks = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/emergency', label: 'Emergency', icon: Phone },
  { href: '/roadmap', label: 'Our Roadmap', icon: Map },
  { href: '/about', label: 'About', icon: Info },
]

export function Navigation() {
  const pathname = usePathname()

  return (
    <motion.header
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="fixed top-8 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border shadow-sm"
    >
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-2"
            >
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Shield className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="font-bold text-lg tracking-tight hidden sm:block">
                Nigeria Security Alert
              </span>
              <span className="font-bold text-lg tracking-tight sm:hidden">
                NSA
              </span>
            </motion.div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const isActive = pathname === link.href
              return (
                <Link key={link.href} href={link.href}>
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`
                      px-4 py-2 rounded-lg text-sm font-medium transition-colors
                      ${isActive 
                        ? 'bg-muted text-foreground' 
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                      }
                    `}
                  >
                    {link.label}
                  </motion.div>
                </Link>
              )
            })}
          </div>

          {/* Right Side: Badge + Support Button */}
          <div className="flex items-center gap-2 md:gap-3">
            {/* Community Reporting Badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
              className="relative"
            >
              {/* Mobile: Compact badge */}
              <div className="md:hidden">
                <Link href="/roadmap">
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.98 }}
                    className="relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg overflow-hidden backdrop-blur-md border border-white/30 dark:border-zinc-700/50 shadow-lg cursor-pointer"
                  >
                  {/* Gradient Background */}
                  <div className="absolute inset-0 bg-gradient-to-r from-green-500/20 via-emerald-500/15 to-green-600/20 dark:from-green-600/20 dark:via-emerald-600/15 dark:to-green-700/20" />
                  <div className="absolute inset-0 bg-white/80 dark:bg-zinc-900/80" />
                  
                  {/* Content */}
                  <div className="relative flex items-center gap-1.5">
                    <div className="relative">
                      <Users className="w-3.5 h-3.5 text-green-600 dark:text-emerald-400" />
                      <motion.div
                        animate={{ opacity: [0.5, 1, 0.5] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="absolute -top-0.5 -right-0.5"
                      >
                        <Sparkles className="w-2 h-2 text-emerald-500 dark:text-emerald-300" />
                      </motion.div>
                    </div>
                    <div className="flex flex-col leading-tight">
                      <span className="text-[9px] font-semibold text-foreground whitespace-nowrap">
                        Real time alerts
                      </span>
                      <span className="text-[8px] font-semibold text-green-600 dark:text-emerald-500 mt-0.5">
                        and reporting coming soon
                      </span>
                    </div>
                  </div>
                </motion.div>
                </Link>
              </div>

              {/* Desktop: Full badge */}
              <div className="hidden md:flex items-center">
                <Link href="/roadmap">
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="relative flex items-center gap-2.5 px-4 py-2.5 rounded-xl overflow-hidden backdrop-blur-md border border-white/30 dark:border-zinc-700/50 shadow-lg cursor-pointer"
                  >
                  {/* Gradient Background */}
                  <div className="absolute inset-0 bg-gradient-to-r from-green-500/25 via-emerald-500/20 to-green-600/25 dark:from-green-600/25 dark:via-emerald-600/20 dark:to-green-700/25" />
                  <div className="absolute inset-0 bg-white/85 dark:bg-zinc-900/85" />
                  
                  {/* Animated gradient overlay */}
                  <motion.div
                    animate={{
                      backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
                    }}
                    transition={{
                      duration: 5,
                      repeat: Infinity,
                      ease: 'linear',
                    }}
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-green-400/10 to-transparent bg-[length:200%_100%]"
                  />
                  
                  {/* Content */}
                  <div className="relative flex items-center gap-2.5">
                    <div className="relative">
                      <Users className="w-4 h-4 text-green-600 dark:text-emerald-400" />
                      <motion.div
                        animate={{ opacity: [0.5, 1, 0.5] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="absolute -top-0.5 -right-0.5"
                      >
                        <Sparkles className="w-2.5 h-2.5 text-emerald-500 dark:text-emerald-300" />
                      </motion.div>
                    </div>
                    <div className="flex flex-col leading-tight">
                      <span className="text-xs font-semibold text-foreground whitespace-nowrap">
                        Real time alerts
                      </span>
                      <span className="text-[10px] font-semibold bg-gradient-to-r from-green-600 to-emerald-500 dark:from-emerald-400 dark:to-emerald-300 bg-clip-text text-transparent mt-0.5">
                        and reporting coming soon
                      </span>
                    </div>
                  </div>
                </motion.div>
                </Link>
              </div>
            </motion.div>

            {/* Support Button */}
            <Link href="/support" className="hidden md:block">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
              >
                <Heart className="w-4 h-4" />
                Support
              </motion.button>
            </Link>
          </div>
        </div>
      </nav>
    </motion.header>
  )
}

