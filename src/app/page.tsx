'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { 
  Shield, 
  AlertTriangle, 
  MapPin, 
  ArrowRight, 
  Phone,
  Route,
  ChevronRight,
  Heart,
  RefreshCw,
  ChevronDown
} from 'lucide-react'
import { SearchBar } from '@/components/ui/SearchBar'
import { AreaSearchBar } from '@/components/ui/AreaSearchBar'
import { AnimatedCounter } from '@/components/ui/AnimatedCounter'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { AuroraBackground } from '@/components/ui/aurora-background'
import { frequentlySearched } from '@/data/statistics'
import { useData } from '@/hooks/useData'

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] }
  },
}

export default function HomePage() {
  const { states, roads, lgas, loading, error } = useData()
  const router = useRouter()
  const [mode, setMode] = useState<'area' | 'route'>('area')
  const [fromState, setFromState] = useState('')
  const [toState, setToState] = useState('')
  const [showFromDropdown, setShowFromDropdown] = useState(false)
  const [showToDropdown, setShowToDropdown] = useState(false)
  const [fromSearchQuery, setFromSearchQuery] = useState('')
  const [toSearchQuery, setToSearchQuery] = useState('')
  const [areaSearchQuery, setAreaSearchQuery] = useState('')
  const fromDropdownRef = useRef<HTMLDivElement>(null)
  const toDropdownRef = useRef<HTMLDivElement>(null)

  // Get sorted states for dropdowns
  const sortedStates = [...states].sort((a, b) => a.name.localeCompare(b.name))
  
  // Filter states based on search query
  const filteredFromStates = sortedStates.filter(state => 
    state.name.toLowerCase().includes(fromSearchQuery.toLowerCase()) &&
    state.id !== toState
  )
  const filteredToStates = sortedStates.filter(state => 
    state.name.toLowerCase().includes(toSearchQuery.toLowerCase()) &&
    state.id !== fromState
  )

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (fromDropdownRef.current && !fromDropdownRef.current.contains(event.target as Node)) {
        setShowFromDropdown(false)
      }
      if (toDropdownRef.current && !toDropdownRef.current.contains(event.target as Node)) {
        setShowToDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleRouteCheck = () => {
    if (fromState && toState && fromState !== toState) {
      router.push(`/roads?from=${fromState}&to=${toState}`)
    }
  }

  // Reset state when switching modes
  useEffect(() => {
    if (mode === 'area') {
      setFromState('')
      setToState('')
      setShowFromDropdown(false)
      setShowToDropdown(false)
      setAreaSearchQuery('')
    } else {
      setAreaSearchQuery('')
    }
  }, [mode])
  
  // Calculate statistics from loaded data
  const totalDeaths = loading ? 0 : states.reduce((sum, state) => sum + (state.deaths2025 || 0), 0)
  const totalRoads = loading ? 0 : roads.length
  const highRiskLGAs = loading ? 0 : lgas.filter(lga => 
    ['EXTREME', 'VERY HIGH', 'HIGH'].includes(lga.riskLevel)
  ).length

  // Debug logging
  useEffect(() => {
    if (!loading) {
      console.log('HomePage data:', {
        statesCount: states.length,
        roadsCount: roads.length,
        lgasCount: lgas.length,
        totalDeaths,
        totalRoads,
        highRiskLGAs,
        error: error?.message
      })
    }
  }, [loading, states.length, roads.length, lgas.length, totalDeaths, totalRoads, highRiskLGAs, error])

  const stats = [
    {
      icon: Shield,
      value: totalDeaths,
      suffix: '+',
      label: 'Deaths in 2025',
      color: 'text-risk-extreme',
      bgColor: 'bg-risk-extreme-bg',
    },
    {
      icon: AlertTriangle,
      value: totalRoads,
      suffix: '',
      label: 'Dangerous roads',
      color: 'text-risk-very-high',
      bgColor: 'bg-risk-very-high-bg',
    },
    {
      icon: MapPin,
      value: highRiskLGAs,
      suffix: '',
      label: 'High-risk LGAs',
      color: 'text-risk-high',
      bgColor: 'bg-risk-high-bg',
    },
  ]

  return (
    <div className="min-h-screen">

      {/* Hero Section with Aurora Background */}
      <AuroraBackground className="min-h-[90vh] flex items-center py-16 md:py-24 pt-32 md:pt-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="text-center max-w-4xl mx-auto"
          >
            {/* Trust Badge */}
            <motion.div variants={itemVariants} className="mb-8">
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border border-white/30 dark:border-zinc-700/50 text-sm font-medium text-foreground shadow-lg">
                <Shield className="w-4 h-4 text-accent" />
                Verified Security Intelligence
              </span>
            </motion.div>
            
            {/* Main Headline */}
            <motion.h1 
              variants={itemVariants}
              className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6 text-foreground leading-tight"
            >
              Know what&apos;s happening
              <br />
              <span className="text-foreground">
                around you
              </span>
            </motion.h1>
            
            {/* Subheadline */}
            <motion.p 
              variants={itemVariants}
              className="text-lg md:text-xl lg:text-2xl text-muted-foreground max-w-2xl mx-auto mb-10 font-light leading-relaxed"
            >
              Check any area or route in Nigeria to stay informed and keep your loved ones safe.
            </motion.p>
            
            {/* Toggle Switch */}
            <motion.div 
              variants={itemVariants}
              className="mb-8 flex justify-center"
            >
              <div className="inline-flex items-center gap-2 p-1.5 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md border border-white/30 dark:border-zinc-700/50 rounded-xl shadow-lg">
                <button
                  onClick={() => setMode('area')}
                  className={`px-6 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 ${
                    mode === 'area'
                      ? 'bg-foreground text-background shadow-md'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    Area Safety
                  </span>
                </button>
                <button
                  onClick={() => setMode('route')}
                  className={`px-6 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 ${
                    mode === 'route'
                      ? 'bg-foreground text-background shadow-md'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Route className="w-4 h-4" />
                    Route Safety
                  </span>
                </button>
              </div>
            </motion.div>

            {/* Primary Action - Dynamic based on mode */}
            <motion.div 
              variants={itemVariants}
              className="mb-8 max-w-3xl mx-auto"
            >
              <AnimatePresence mode="wait">
                {mode === 'area' ? (
                  <motion.div
                    key="area"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="w-full space-y-4"
                  >
                    <AreaSearchBar large onQueryChange={setAreaSearchQuery} />
                  </motion.div>
                ) : (
                  <motion.div
                    key="route"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="w-full space-y-4"
                  >
                    <div className="grid grid-cols-2 gap-4">
                      {/* From Dropdown */}
                      <div className="relative" ref={fromDropdownRef}>
                        <button
                          onClick={() => {
                            setShowFromDropdown(!showFromDropdown)
                            setShowToDropdown(false)
                            if (!showFromDropdown) setFromSearchQuery('')
                          }}
                          className="w-full h-16 px-4 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border-2 border-border/50 rounded-2xl flex items-center justify-between text-left hover:border-accent transition-colors shadow-lg"
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <MapPin className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                            <span className={fromState ? 'text-foreground font-medium truncate' : 'text-muted-foreground'}>
                              {fromState ? sortedStates.find(s => s.id === fromState)?.name : 'From'}
                            </span>
                          </div>
                          <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform flex-shrink-0 ${showFromDropdown ? 'rotate-180' : ''}`} />
                        </button>
                        <AnimatePresence>
                          {showFromDropdown && (
                            <motion.div
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -10 }}
                              transition={{ duration: 0.2 }}
                              className="absolute top-full left-0 right-0 mt-2 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border border-border/50 rounded-xl shadow-xl overflow-hidden z-40"
                            >
                              <div className="p-2 border-b border-border/50">
                                <input
                                  type="text"
                                  placeholder="Search state..."
                                  value={fromSearchQuery}
                                  onChange={(e) => setFromSearchQuery(e.target.value)}
                                  className="w-full px-3 py-2 bg-muted/50 rounded-lg text-sm outline-none focus:ring-2 focus:ring-accent"
                                  autoFocus
                                />
                              </div>
                              <div className="max-h-60 overflow-y-auto">
                                {filteredFromStates.length > 0 ? (
                                  filteredFromStates.map((state) => (
                                    <button
                                      key={state.id}
                                      onClick={() => {
                                        setFromState(state.id)
                                        setShowFromDropdown(false)
                                        setFromSearchQuery('')
                                      }}
                                      className="w-full px-4 py-3 text-left hover:bg-muted transition-colors flex items-center gap-3"
                                    >
                                      <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                                      <span className="font-medium">{state.name}</span>
                                    </button>
                                  ))
                                ) : (
                                  <div className="px-4 py-3 text-sm text-muted-foreground text-center">
                                    No states found
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      {/* To Dropdown */}
                      <div className="relative" ref={toDropdownRef}>
                        <button
                          onClick={() => {
                            setShowToDropdown(!showToDropdown)
                            setShowFromDropdown(false)
                            if (!showToDropdown) setToSearchQuery('')
                          }}
                          className="w-full h-16 px-4 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border-2 border-border/50 rounded-2xl flex items-center justify-between text-left hover:border-accent transition-colors shadow-lg"
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <MapPin className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                            <span className={toState ? 'text-foreground font-medium truncate' : 'text-muted-foreground'}>
                              {toState ? sortedStates.find(s => s.id === toState)?.name : 'To'}
                            </span>
                          </div>
                          <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform flex-shrink-0 ${showToDropdown ? 'rotate-180' : ''}`} />
                        </button>
                        <AnimatePresence>
                          {showToDropdown && (
                            <motion.div
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -10 }}
                              transition={{ duration: 0.2 }}
                              className="absolute top-full left-0 right-0 mt-2 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border border-border/50 rounded-xl shadow-xl overflow-hidden z-40"
                            >
                              <div className="p-2 border-b border-border/50">
                                <input
                                  type="text"
                                  placeholder="Search state..."
                                  value={toSearchQuery}
                                  onChange={(e) => setToSearchQuery(e.target.value)}
                                  className="w-full px-3 py-2 bg-muted/50 rounded-lg text-sm outline-none focus:ring-2 focus:ring-accent"
                                  autoFocus
                                />
                              </div>
                              <div className="max-h-60 overflow-y-auto">
                                {filteredToStates.length > 0 ? (
                                  filteredToStates.map((state) => (
                                    <button
                                      key={state.id}
                                      onClick={() => {
                                        setToState(state.id)
                                        setShowToDropdown(false)
                                        setToSearchQuery('')
                                      }}
                                      className="w-full px-4 py-3 text-left hover:bg-muted transition-colors flex items-center gap-3"
                                    >
                                      <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                                      <span className="font-medium">{state.name}</span>
                                    </button>
                                  ))
                                ) : (
                                  <div className="px-4 py-3 text-sm text-muted-foreground text-center">
                                    No states found
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                    {fromState && toState && fromState === toState && (
                      <motion.div
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-2 text-sm text-risk-extreme bg-risk-extreme-bg px-4 py-2 rounded-lg"
                      >
                        <AlertTriangle className="w-4 h-4" />
                        <span>Please select different states for origin and destination</span>
                      </motion.div>
                    )}
                    <Button
                      onClick={() => {
                        if (fromState && toState && fromState !== toState) {
                          router.push(`/roads?from=${fromState}&to=${toState}`)
                        } else {
                          router.push('/roads')
                        }
                      }}
                      size="lg"
                      disabled={!fromState || !toState || fromState === toState}
                      className="w-full h-14 text-base gap-3 shadow-lg hover:shadow-xl transition-all bg-accent text-white hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground"
                    >
                      <Route className="w-5 h-5" />
                      Show Updated Route Safety
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Secondary CTA - Emergency */}
            <motion.div 
              variants={itemVariants}
              className="flex justify-center"
            >
              <Link href="/emergency" className="w-full sm:w-auto">
                <Button variant="secondary" size="lg" className="w-full sm:w-auto h-14 px-8 text-base gap-2">
                  <Phone className="w-5 h-5" />
                  Emergency Numbers
                </Button>
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </AuroraBackground>

      {/* Stats Section */}
      <section className="py-16 md:py-20 bg-background border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
          >
            <motion.div variants={itemVariants} className="text-center mb-12">
              <h2 className="text-2xl md:text-3xl font-bold mb-3">Security Intelligence at a Glance</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Real-time data to help you make informed decisions
              </p>
            </motion.div>
            
            {error ? (
              <div className="text-center p-8 bg-risk-extreme-bg rounded-xl border border-risk-extreme">
                <AlertTriangle className="w-8 h-8 text-risk-extreme mx-auto mb-4" />
                <p className="text-risk-extreme font-medium">Error loading data: {error.message}</p>
                <p className="text-sm text-muted-foreground mt-2">Please check the browser console for details.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 md:gap-8">
                {loading ? (
                  // Loading skeleton
                  Array.from({ length: 3 }).map((_, index) => (
                    <div key={index} className="p-6 md:p-8 text-center h-full bg-muted/50 rounded-xl animate-pulse">
                      <div className="inline-flex p-3 md:p-4 rounded-2xl bg-muted mb-4 w-16 h-16"></div>
                      <div className="text-3xl md:text-5xl font-bold mb-2 font-mono h-12 bg-muted rounded w-24 mx-auto"></div>
                      <div className="h-4 bg-muted rounded w-32 mx-auto"></div>
                    </div>
                  ))
                ) : (
                  stats.map((stat, index) => {
                    const Icon = stat.icon
                    return (
                      <motion.div key={index} variants={itemVariants}>
                        <Card hover={true} className="p-6 md:p-8 text-center h-full">
                          <div className={`inline-flex p-3 md:p-4 rounded-2xl ${stat.bgColor} mb-4`}>
                            <Icon className={`w-6 h-6 md:w-7 md:h-7 ${stat.color}`} />
                          </div>
                          <div className="text-3xl md:text-5xl font-bold mb-2 font-mono">
                            <AnimatedCounter 
                              value={stat.value} 
                              suffix={stat.suffix}
                            />
                          </div>
                          <p className="text-sm md:text-base text-muted-foreground font-medium">
                            {stat.label}
                          </p>
                        </Card>
                      </motion.div>
                    )
                  })
                )}
              </div>
            )}
          </motion.div>
        </div>
      </section>

      {/* Popular Searches Section */}
      <section className="py-16 md:py-20 bg-background border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
          >
            <motion.div variants={itemVariants} className="text-center mb-10">
              <h2 className="text-2xl md:text-3xl font-bold mb-3">Popular Searches</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Quick access to frequently checked locations
              </p>
            </motion.div>
            
            <div className="space-y-8">
              {/* Lagos Areas */}
              <motion.div variants={itemVariants}>
                <h3 className="text-lg font-semibold mb-4 text-foreground">Lagos</h3>
                <div className="flex flex-wrap gap-3">
                  {['victoria-island', 'lekki', 'ikeja', 'festac'].map((locationId) => (
                    <Link key={locationId} href={`/area/${locationId}`}>
                      <Button variant="secondary" size="md" className="gap-2">
                        <MapPin className="w-4 h-4" />
                        {locationId === 'victoria-island' ? 'Victoria Island' :
                         locationId === 'lekki' ? 'Lekki' :
                         locationId === 'ikeja' ? 'Ikeja' : 'Festac'}
                      </Button>
                    </Link>
                  ))}
                </div>
              </motion.div>

              {/* Abuja Areas */}
              <motion.div variants={itemVariants}>
                <h3 className="text-lg font-semibold mb-4 text-foreground">Abuja</h3>
                <div className="flex flex-wrap gap-3">
                  {['maitama', 'wuse', 'gwarinpa', 'kubwa'].map((locationId) => (
                    <Link key={locationId} href={`/area/${locationId}`}>
                      <Button variant="secondary" size="md" className="gap-2">
                        <MapPin className="w-4 h-4" />
                        {locationId === 'maitama' ? 'Maitama' :
                         locationId === 'wuse' ? 'Wuse' :
                         locationId === 'gwarinpa' ? 'Gwarinpa' : 'Kubwa'}
                      </Button>
                    </Link>
                  ))}
                </div>
              </motion.div>

              {/* Other Cities */}
              <motion.div variants={itemVariants}>
                <h3 className="text-lg font-semibold mb-4 text-foreground">Major Cities</h3>
                <div className="flex flex-wrap gap-3">
                  {['port-harcourt', 'ibadan', 'kano', 'enugu'].map((locationId) => (
                    <Link key={locationId} href={`/area/${locationId}`}>
                      <Button variant="secondary" size="md" className="gap-2">
                        <MapPin className="w-4 h-4" />
                        {locationId === 'port-harcourt' ? 'Port Harcourt' :
                         locationId === 'ibadan' ? 'Ibadan' :
                         locationId === 'kano' ? 'Kano' : 'Enugu'}
                      </Button>
                    </Link>
                  ))}
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Frequently Checked Section */}
      <section className="py-16 md:py-20 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
          >
            <motion.div variants={itemVariants} className="text-center mb-10">
              <h2 className="text-2xl md:text-3xl font-bold mb-3">Frequently Checked Locations</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Quick access to the most searched areas and routes
              </p>
            </motion.div>
            
            <motion.div 
              variants={itemVariants}
              className="flex flex-wrap justify-center gap-3 md:gap-4"
            >
              {frequentlySearched.map((item, index) => (
                <motion.div
                  key={item.name}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  whileHover={{ scale: 1.05 }}
                  transition={{ delay: index * 0.05 }}
                  viewport={{ once: true }}
                >
                  <Link href={item.href}>
                    <Button variant="secondary" size="lg" className="gap-2 h-11 px-5 text-sm font-medium">
                      <MapPin className="w-4 h-4" />
                      {item.name}
                    </Button>
                  </Link>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-muted/30">
        {/* Second Bar - Update banner */}
        <div className="bg-accent/10 backdrop-blur-md border-b border-border/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <div className="flex items-center justify-center gap-2 text-sm text-foreground">
              <RefreshCw className="w-3.5 h-3.5 text-accent" />
              <span className="font-medium">
                Safety alerts for where you live, work, and travel - updated daily
              </span>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            <div>
              <h3 className="font-semibold mb-3 text-foreground">Navigation</h3>
              <div className="flex flex-col gap-2 text-sm text-muted-foreground">
                <Link href="/about" className="hover:text-foreground transition-colors">About</Link>
                <Link href="/roadmap" className="hover:text-foreground transition-colors">Our Roadmap</Link>
                <Link href="/support" className="hover:text-foreground transition-colors">Support</Link>
              </div>
            </div>
            <div>
              <h3 className="font-semibold mb-3 text-foreground">Data Sources</h3>
              <p className="text-sm text-muted-foreground">
                ACLED, Human Rights Watch, Amnesty International (local community reps reporting coming soon)
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-3 text-foreground">Project</h3>
              <p className="text-sm text-muted-foreground">
                A Thinknodes Innovation Lab project
              </p>
            </div>
          </div>
          <div className="pt-8 border-t border-border text-center text-sm text-muted-foreground">
            <p>© {new Date().getFullYear()} Nigeria Security Alert. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
