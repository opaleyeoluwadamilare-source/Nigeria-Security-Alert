'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Shield,
  MapPin,
  Bell,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Search,
  X,
  Users,
  Lock,
  Smartphone,
  Heart,
  Home,
  Briefcase,
  Navigation,
  MessageCircle,
  Sparkles,
  Phone,
} from 'lucide-react'
import { NigerianShield } from '@/components/landing/NigerianShield'
import { useAppStore } from '@/lib/store'
import { useLocation } from '@/hooks/useLocation'
import { usePushNotifications } from '@/hooks/usePushNotifications'
import { searchLocations } from '@/lib/locations'
import { shareAppInvite } from '@/lib/share'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Toggle } from '@/components/ui/Toggle'
import { ProgressSteps, StepIndicator } from '@/components/ui/ProgressSteps'
import { PhoneAuthModal } from '@/components/auth/PhoneAuthModal'
import { INCIDENT_TYPES } from '@/types'
import type { NigerianLocation, UserLocation, IncidentType } from '@/types'

type Step = 'welcome' | 'phone' | 'areas' | 'preview' | 'location' | 'notifications' | 'ready'

const stepOrder: Step[] = ['welcome', 'phone', 'areas', 'preview', 'location', 'notifications', 'ready']
const stepLabels = ['Welcome', 'Verify', 'Areas', 'Alerts', 'Location', 'Notify', 'Ready']

// Popular areas in Nigeria
const popularAreas = [
  { name: 'Lekki Phase 1', state: 'Lagos' },
  { name: 'Victoria Island', state: 'Lagos' },
  { name: 'Wuse 2', state: 'Abuja' },
  { name: 'Ikeja GRA', state: 'Lagos' },
  { name: 'Maitama', state: 'Abuja' },
  { name: 'Port Harcourt GRA', state: 'Rivers' },
]

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('welcome')
  const [selectedAreas, setSelectedAreas] = useState<NigerianLocation[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<NigerianLocation[]>([])
  const [notificationPreference, setNotificationPreference] = useState<'all' | 'critical' | 'custom'>('all')
  const [selectedAlertTypes, setSelectedAlertTypes] = useState<IncidentType[]>([])
  const [quietHours, setQuietHours] = useState(false)
  const [locationGranted, setLocationGranted] = useState(false)
  const [showCelebration, setShowCelebration] = useState(false)

  // Phone auth state
  const [isPhoneVerified, setIsPhoneVerified] = useState(false)
  const [verifiedPhone, setVerifiedPhone] = useState<string | null>(null)
  const [showPhoneAuthModal, setShowPhoneAuthModal] = useState(false)

  // Location type modal state
  const [locationTypeModal, setLocationTypeModal] = useState<'home' | 'work' | null>(null)
  const [locationTypeSearch, setLocationTypeSearch] = useState('')
  const [locationTypeResults, setLocationTypeResults] = useState<NigerianLocation[]>([])

  const { setHasCompletedOnboarding, setSavedLocations, setCurrentLocation, setUser } =
    useAppStore()
  const { getLocation, loading: locationLoading } = useLocation()
  const { enable: enablePush, isSupported: pushSupported, isEnabled: pushEnabled } =
    usePushNotifications()
  const [notificationsLoading, setNotificationsLoading] = useState(false)
  const [notificationsEnabled, setNotificationsEnabled] = useState(false)

  const currentStepIndex = stepOrder.indexOf(step)

  // Handle search with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.length >= 2) {
        setSearchResults(searchLocations(searchQuery, 8))
      } else {
        setSearchResults([])
      }
    }, 200)
    return () => clearTimeout(timer)
  }, [searchQuery])

  // Handle location type modal search with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (locationTypeSearch.length >= 2) {
        setLocationTypeResults(searchLocations(locationTypeSearch, 8))
      } else {
        setLocationTypeResults([])
      }
    }, 200)
    return () => clearTimeout(timer)
  }, [locationTypeSearch])

  // Handle phone auth success
  const handlePhoneAuthSuccess = (user: { id: string; phone: string }) => {
    setIsPhoneVerified(true)
    setVerifiedPhone(user.phone)
    setShowPhoneAuthModal(false)
    // Also update the store with the user
    setUser({
      id: user.id,
      phone: user.phone,
      phone_verified: true,
      trust_score: 0,
      created_at: new Date().toISOString(),
      last_active: new Date().toISOString(),
    })
    goNext()
  }

  // Toggle alert type selection
  const toggleAlertType = (type: IncidentType) => {
    if (selectedAlertTypes.includes(type)) {
      setSelectedAlertTypes(selectedAlertTypes.filter(t => t !== type))
    } else {
      setSelectedAlertTypes([...selectedAlertTypes, type])
    }
  }

  // Add location with type (home/work)
  const addLocationWithType = (location: NigerianLocation, type: 'home' | 'work') => {
    const labeledLocation: NigerianLocation = {
      ...location,
      slug: `${type}-${location.slug}`,
      name: `${type === 'home' ? '🏠' : '💼'} ${location.name}`,
    }
    if (!selectedAreas.find((a) => a.slug === labeledLocation.slug)) {
      setSelectedAreas([...selectedAreas, labeledLocation])
    }
    setLocationTypeModal(null)
    setLocationTypeSearch('')
    setLocationTypeResults([])
  }

  // Navigation
  const goToStep = (newStep: Step) => {
    setStep(newStep)
  }

  const goBack = () => {
    const prevIndex = currentStepIndex - 1
    if (prevIndex >= 0) {
      setStep(stepOrder[prevIndex])
    }
  }

  const goNext = () => {
    const nextIndex = currentStepIndex + 1
    if (nextIndex < stepOrder.length) {
      setStep(stepOrder[nextIndex])
    }
  }

  // Add area
  const addArea = (location: NigerianLocation) => {
    if (!selectedAreas.find((a) => a.slug === location.slug)) {
      setSelectedAreas([...selectedAreas, location])
    }
    setSearchQuery('')
    setSearchResults([])
  }

  // Remove area
  const removeArea = (slug: string) => {
    setSelectedAreas(selectedAreas.filter((a) => a.slug !== slug))
  }

  // Add popular area
  const addPopularArea = (area: { name: string; state: string }) => {
    const slug = area.name.toLowerCase().replace(/\s+/g, '-')
    const newLocation: NigerianLocation = {
      slug,
      name: area.name,
      state: area.state,
      aliases: [],
      nearby: [],
      popular: true,
    }
    addArea(newLocation)
  }

  // Use current location
  const useCurrentLocation = async () => {
    const result = await getLocation()
    if (result.success && result.area) {
      const newLocation: NigerianLocation = {
        slug: result.area.slug,
        name: result.area.name,
        state: result.area.state,
        aliases: [],
        nearby: [],
        popular: false,
      }
      if (!selectedAreas.find((a) => a.slug === newLocation.slug)) {
        setSelectedAreas([...selectedAreas, newLocation])
      }
      if (result.coords) {
        setCurrentLocation(
          { lat: result.coords.lat, lng: result.coords.lng },
          result.area
        )
      }
      setLocationGranted(true)
    }
  }

  // Request location permission
  const requestLocation = async () => {
    const result = await getLocation()
    if (result.success) {
      setLocationGranted(true)
    }
    goNext()
  }

  // Enable push notifications
  const handleEnableNotifications = async () => {
    setNotificationsLoading(true)
    try {
      const success = await enablePush()
      setNotificationsEnabled(success)
      // Brief delay to show success state
      setTimeout(() => {
        goNext()
      }, 500)
    } catch (error) {
      console.error('Failed to enable notifications:', error)
      goNext() // Continue even if it fails
    } finally {
      setNotificationsLoading(false)
    }
  }

  // Skip notifications (not recommended but allowed)
  const skipNotifications = () => {
    goNext()
  }

  // Complete onboarding
  const completeOnboarding = () => {
    setShowCelebration(true)

    // Convert selected areas to UserLocation format
    const userLocations: UserLocation[] = selectedAreas.map((area, index) => ({
      id: `local-${area.slug}`,
      user_id: 'local',
      area_name: area.name,
      area_slug: area.slug,
      state: area.state,
      is_primary: index === 0,
      created_at: new Date().toISOString(),
    }))

    setSavedLocations(userLocations)

    // Delay to show celebration
    setTimeout(() => {
      setHasCompletedOnboarding(true)
      router.push('/app')
    }, 1500)
  }

  // Animation variants
  const pageVariants = {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0, transition: { duration: 0.3, ease: 'easeOut' } },
    exit: { opacity: 0, x: -20, transition: { duration: 0.2 } },
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Progress Bar */}
      <div className="fixed top-0 left-0 right-0 z-50 px-4 pt-4 pb-2 bg-background/80 backdrop-blur-sm">
        <ProgressSteps steps={stepLabels} currentStep={currentStepIndex} />
      </div>

      <div className="max-w-lg mx-auto px-4 pt-24 pb-8">
        <AnimatePresence mode="wait">
          {/* Step 1: Warm Welcome */}
          {step === 'welcome' && (
            <motion.div
              key="welcome"
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="text-center"
            >
              {/* Nigerian Shield Logo */}
              <div className="relative mb-8">
                <div className="flex justify-center items-end gap-2">
                  <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.1 }}
                    className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center"
                  >
                    <Users className="w-6 h-6 text-emerald-700" />
                  </motion.div>
                  <motion.div
                    initial={{ y: 20, opacity: 0, scale: 0.8 }}
                    animate={{ y: 0, opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                    className="w-20 h-20 flex items-center justify-center"
                  >
                    <NigerianShield className="w-16 h-16" />
                  </motion.div>
                  <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center"
                  >
                    <Heart className="w-6 h-6 text-emerald-700" />
                  </motion.div>
                </div>
              </div>

              <motion.h1
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-3xl font-bold text-foreground mb-3"
              >
                Welcome to SafetyAlerts
              </motion.h1>

              <motion.p
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="text-lg text-muted-foreground mb-8 leading-relaxed"
              >
                We&apos;re building something special here—a community that looks out for each other.
              </motion.p>

              <motion.div
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="bg-white rounded-2xl p-6 mb-8 text-left space-y-4 border border-gray-100 shadow-sm"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Lock className="w-5 h-5 text-emerald-700" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Your privacy is protected</h3>
                    <p className="text-sm text-gray-500">
                      Your exact location is never shared
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="w-5 h-5 text-emerald-700" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Community verified</h3>
                    <p className="text-sm text-gray-500">
                      Reports are confirmed by neighbors
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Bell className="w-5 h-5 text-amber-700" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Instant alerts</h3>
                    <p className="text-sm text-gray-500">
                      Know what&apos;s happening in seconds
                    </p>
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.7 }}
                className="text-sm text-muted-foreground mb-6"
              >
                This will take about 2 minutes
              </motion.div>

              <motion.div
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.8 }}
              >
                <Button
                  onClick={goNext}
                  size="lg"
                  className="w-full btn-primary"
                >
                  Let&apos;s Go
                  <ChevronRight className="w-5 h-5 ml-2" />
                </Button>
              </motion.div>
            </motion.div>
          )}

          {/* Step 2: Phone Verification */}
          {step === 'phone' && (
            <motion.div
              key="phone"
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="text-center"
            >
              <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-6">
                <Phone className="w-8 h-8 text-primary" />
              </div>

              <h2 className="text-2xl font-bold text-foreground mb-2">
                Verify your phone
              </h2>
              <p className="text-muted-foreground mb-6">
                Phone verification is required to prevent fake reports
              </p>

              {isPhoneVerified ? (
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="bg-safety-green/10 border border-safety-green/20 rounded-2xl p-6 mb-6"
                >
                  <div className="flex items-center justify-center gap-3 mb-2">
                    <CheckCircle2 className="w-6 h-6 text-safety-green" />
                    <span className="font-semibold text-foreground">Phone Verified</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{verifiedPhone}</p>
                </motion.div>
              ) : (
                <div className="bg-background-elevated rounded-2xl p-6 mb-6 text-left">
                  <h3 className="font-semibold text-foreground mb-4">Why verify?</h3>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Shield className="w-3.5 h-3.5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm text-foreground">Prevent fake reports</p>
                        <p className="text-xs text-muted-foreground">Verified users keep alerts accurate</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Users className="w-3.5 h-3.5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm text-foreground">Build trust</p>
                        <p className="text-xs text-muted-foreground">Your reports carry more weight</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Lock className="w-3.5 h-3.5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm text-foreground">Your number stays private</p>
                        <p className="text-xs text-muted-foreground">Never shared with other users</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-safety-red/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <MessageCircle className="w-3.5 h-3.5 text-safety-red" />
                      </div>
                      <div>
                        <p className="text-sm text-foreground">SMS backup for emergencies</p>
                        <p className="text-xs text-muted-foreground">Get critical alerts via SMS when notifications fail</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <Button variant="secondary" onClick={goBack}>
                  <ChevronLeft className="w-5 h-5" />
                </Button>
                {isPhoneVerified ? (
                  <Button onClick={goNext} className="flex-1 btn-primary">
                    Continue
                    <ChevronRight className="w-5 h-5 ml-2" />
                  </Button>
                ) : (
                  <Button
                    onClick={() => setShowPhoneAuthModal(true)}
                    className="flex-1 btn-primary"
                  >
                    <Phone className="w-5 h-5 mr-2" />
                    Verify My Phone
                  </Button>
                )}
              </div>
            </motion.div>
          )}

          {/* Step 3: Pick Areas */}
          {step === 'areas' && (
            <motion.div
              key="areas"
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-4">
                  <MapPin className="w-8 h-8 text-primary" />
                </div>
                <h2 className="text-2xl font-bold text-foreground mb-2">
                  Where should we watch for you?
                </h2>
                <p className="text-muted-foreground">
                  Add your home, work, or any area you care about
                </p>
              </div>

              {/* Quick Add Buttons */}
              <div className="flex gap-2 mb-4">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={useCurrentLocation}
                  disabled={locationLoading}
                  className="flex-1"
                >
                  <Navigation className="w-4 h-4 mr-1" />
                  {locationLoading ? 'Getting...' : 'Current'}
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  className="flex-1"
                  onClick={() => setLocationTypeModal('home')}
                >
                  <Home className="w-4 h-4 mr-1" />
                  Home
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  className="flex-1"
                  onClick={() => setLocationTypeModal('work')}
                >
                  <Briefcase className="w-4 h-4 mr-1" />
                  Work
                </Button>
              </div>

              {/* Search */}
              <div className="relative mb-4">
                <Input
                  leftIcon={<Search className="w-5 h-5" />}
                  placeholder="Search areas (e.g., Lekki, Wuse 2)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {/* Search Results */}
              {searchResults.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-4 bg-background-elevated rounded-xl border border-border divide-y divide-border max-h-48 overflow-y-auto"
                >
                  {searchResults.map((location) => (
                    <button
                      key={location.slug}
                      onClick={() => addArea(location)}
                      className="w-full px-4 py-3 text-left hover:bg-muted/50 flex items-center justify-between transition-colors"
                    >
                      <div>
                        <div className="font-medium text-foreground">{location.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {location.state}
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-muted-foreground" />
                    </button>
                  ))}
                </motion.div>
              )}

              {/* Popular Areas */}
              {searchResults.length === 0 && selectedAreas.length === 0 && (
                <div className="mb-4">
                  <p className="text-sm text-muted-foreground mb-2">
                    Popular areas in Nigeria:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {popularAreas.map((area) => (
                      <button
                        key={area.name}
                        onClick={() => addPopularArea(area)}
                        className="px-3 py-1.5 bg-muted rounded-full text-sm text-foreground hover:bg-muted/80 transition-colors"
                      >
                        {area.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Selected Areas */}
              {selectedAreas.length > 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mb-6"
                >
                  <h3 className="text-sm font-medium text-foreground mb-2">
                    Your areas ({selectedAreas.length})
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedAreas.map((area, index) => (
                      <motion.span
                        key={area.slug}
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="bg-primary/10 text-primary px-3 py-1.5 rounded-full text-sm flex items-center gap-2"
                      >
                        {index === 0 && <span className="text-xs">Primary:</span>}
                        {area.name}
                        <button
                          onClick={() => removeArea(area.slug)}
                          className="hover:text-primary/70 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </motion.span>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Info Note */}
              <div className="bg-muted/50 rounded-lg p-3 mb-6">
                <p className="text-sm text-muted-foreground">
                  You&apos;ll receive alerts for incidents within 5km of these areas.
                  You can adjust this later in settings.
                </p>
              </div>

              {/* Navigation */}
              <div className="flex gap-3">
                <Button variant="secondary" onClick={goBack}>
                  <ChevronLeft className="w-5 h-5" />
                </Button>
                <Button
                  onClick={goNext}
                  disabled={selectedAreas.length === 0}
                  className="flex-1 btn-primary"
                >
                  Continue
                  <ChevronRight className="w-5 h-5 ml-2" />
                </Button>
              </div>

              {selectedAreas.length === 0 && (
                <button
                  onClick={goNext}
                  className="w-full mt-3 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Skip for now (you can add areas later)
                </button>
              )}
            </motion.div>
          )}

          {/* Step 3: Notification Preview */}
          {step === 'preview' && (
            <motion.div
              key="preview"
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-safety-amber/10 rounded-full mb-4">
                  <Smartphone className="w-8 h-8 text-safety-amber" />
                </div>
                <h2 className="text-2xl font-bold text-foreground mb-2">
                  This is what you&apos;ll see
                </h2>
                <p className="text-muted-foreground">
                  When something happens nearby, you&apos;ll get an alert like this
                </p>
              </div>

              {/* Notification Preview */}
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="bg-background-elevated rounded-2xl p-4 mb-6 shadow-lg border border-border"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-safety-red/10 rounded-lg flex items-center justify-center">
                    <Shield className="w-6 h-6 text-safety-red" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-foreground">SafetyAlerts</span>
                      <span className="text-xs text-muted-foreground">now</span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {selectedAreas.length > 0 ? selectedAreas[0].name : 'Your Area'}
                    </span>
                  </div>
                </div>
                <div className="bg-safety-red/5 border border-safety-red/20 rounded-xl p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="badge-critical text-xs">CRITICAL</span>
                    <span className="font-semibold text-foreground">ROBBERY</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Armed robbery reported near {selectedAreas.length > 0 ? selectedAreas[0].name : 'your area'}.
                    Stay indoors and avoid the area.
                  </p>
                </div>
              </motion.div>

              {/* Notification Preferences */}
              <div className="bg-background-elevated rounded-2xl p-4 mb-6 space-y-4">
                <h3 className="font-semibold text-foreground">Notification preferences</h3>

                <div className="space-y-3">
                  <label className="flex items-center justify-between cursor-pointer">
                    <div>
                      <p className="font-medium text-foreground">All alerts</p>
                      <p className="text-sm text-muted-foreground">Get notified about everything</p>
                    </div>
                    <input
                      type="radio"
                      name="notification"
                      checked={notificationPreference === 'all'}
                      onChange={() => setNotificationPreference('all')}
                      className="w-5 h-5 text-primary"
                    />
                  </label>

                  <label className="flex items-center justify-between cursor-pointer">
                    <div>
                      <p className="font-medium text-foreground">Critical only</p>
                      <p className="text-sm text-muted-foreground">Robbery, Kidnapping, Gunshots, Attack</p>
                    </div>
                    <input
                      type="radio"
                      name="notification"
                      checked={notificationPreference === 'critical'}
                      onChange={() => setNotificationPreference('critical')}
                      className="w-5 h-5 text-primary"
                    />
                  </label>

                  <label className="flex items-center justify-between cursor-pointer">
                    <div>
                      <p className="font-medium text-foreground">Custom</p>
                      <p className="text-sm text-muted-foreground">Choose specific alert types</p>
                    </div>
                    <input
                      type="radio"
                      name="notification"
                      checked={notificationPreference === 'custom'}
                      onChange={() => setNotificationPreference('custom')}
                      className="w-5 h-5 text-primary"
                    />
                  </label>
                </div>

                {/* Custom Alert Type Selection */}
                {notificationPreference === 'custom' && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    className="pt-3 border-t border-border"
                  >
                    <p className="text-sm text-muted-foreground mb-3">Select the alert types you want:</p>
                    <div className="grid grid-cols-2 gap-2">
                      {INCIDENT_TYPES.map((incidentType) => (
                        <button
                          key={incidentType.type}
                          onClick={() => toggleAlertType(incidentType.type)}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors text-left ${
                            selectedAlertTypes.includes(incidentType.type)
                              ? 'bg-primary/10 border-primary text-primary'
                              : 'bg-muted/50 border-border text-foreground hover:bg-muted'
                          }`}
                        >
                          <span className="text-lg">{incidentType.icon}</span>
                          <span className="text-sm font-medium">{incidentType.label}</span>
                        </button>
                      ))}
                    </div>
                    {selectedAlertTypes.length === 0 && (
                      <p className="text-xs text-safety-amber mt-2">
                        Select at least one alert type
                      </p>
                    )}
                  </motion.div>
                )}

                <div className="pt-3 border-t border-border">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-foreground">Quiet hours</p>
                      <p className="text-sm text-muted-foreground">No alerts 11pm - 6am</p>
                    </div>
                    <Toggle checked={quietHours} onChange={setQuietHours} />
                  </div>
                  {quietHours && (
                    <p className="text-xs text-safety-amber mt-2">
                      Critical alerts will still come through during quiet hours
                    </p>
                  )}
                </div>
              </div>

              {/* Navigation */}
              <div className="flex gap-3">
                <Button variant="secondary" onClick={goBack}>
                  <ChevronLeft className="w-5 h-5" />
                </Button>
                <Button
                  onClick={async () => {
                    if (pushSupported) {
                      await enablePush()
                    }
                    goNext()
                  }}
                  className="flex-1 btn-primary"
                >
                  <Bell className="w-5 h-5 mr-2" />
                  Enable Notifications
                </Button>
              </div>

              {!pushSupported && (
                <p className="text-center text-sm text-muted-foreground mt-3">
                  Push notifications may not be supported on this device
                </p>
              )}
            </motion.div>
          )}

          {/* Step 4: Location Permission */}
          {step === 'location' && (
            <motion.div
              key="location"
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-safety-green/10 rounded-full mb-4">
                  <Navigation className="w-8 h-8 text-safety-green" />
                </div>
                <h2 className="text-2xl font-bold text-foreground mb-2">
                  Help your community
                </h2>
                <p className="text-muted-foreground">
                  Location helps verify reports and show relevant alerts
                </p>
              </div>

              {/* Privacy Explanation */}
              <div className="bg-background-elevated rounded-2xl p-4 mb-6">
                <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Lock className="w-5 h-5 text-primary" />
                  Your privacy is protected
                </h3>

                <div className="space-y-4">
                  <div className="flex gap-3">
                    <div className="w-8 h-8 bg-safety-green/10 rounded-full flex items-center justify-center flex-shrink-0">
                      <CheckCircle2 className="w-4 h-4 text-safety-green" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Used for verification</p>
                      <p className="text-sm text-muted-foreground">
                        We check you&apos;re actually nearby when reporting
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <div className="w-8 h-8 bg-safety-green/10 rounded-full flex items-center justify-center flex-shrink-0">
                      <CheckCircle2 className="w-4 h-4 text-safety-green" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Never shared exactly</p>
                      <p className="text-sm text-muted-foreground">
                        Others see &quot;Near Lekki Phase 1&quot;, not your exact spot
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <div className="w-8 h-8 bg-safety-green/10 rounded-full flex items-center justify-center flex-shrink-0">
                      <CheckCircle2 className="w-4 h-4 text-safety-green" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">You control it</p>
                      <p className="text-sm text-muted-foreground">
                        Turn it off anytime in your phone settings
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Visual Demonstration */}
              <div className="bg-muted/50 rounded-xl p-4 mb-6">
                <p className="text-sm text-center text-muted-foreground mb-3">
                  How your location appears to others:
                </p>
                <div className="flex items-center justify-center gap-4">
                  <div className="text-center">
                    <div className="w-3 h-3 bg-primary rounded-full mx-auto mb-1 animate-pulse" />
                    <p className="text-xs text-muted-foreground">Your location</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  <div className="text-center">
                    <div className="bg-primary/10 rounded-lg px-3 py-2">
                      <p className="text-sm font-medium text-foreground">Near Lekki Phase 1</p>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">What others see</p>
                  </div>
                </div>
              </div>

              {/* Navigation */}
              <div className="flex gap-3">
                <Button variant="secondary" onClick={goBack}>
                  <ChevronLeft className="w-5 h-5" />
                </Button>
                <Button
                  onClick={requestLocation}
                  disabled={locationLoading}
                  className="flex-1 btn-primary"
                >
                  <Navigation className="w-5 h-5 mr-2" />
                  {locationLoading ? 'Getting location...' : 'Allow Location'}
                </Button>
              </div>

              <button
                onClick={goNext}
                className="w-full mt-3 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Maybe later
              </button>
            </motion.div>
          )}

          {/* Step 5: Push Notifications */}
          {step === 'notifications' && (
            <motion.div
              key="notifications"
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-safety-amber/10 rounded-full mb-4">
                  <Bell className="w-8 h-8 text-safety-amber" />
                </div>
                <h2 className="text-2xl font-bold text-foreground mb-2">
                  Stay safe with instant alerts
                </h2>
                <p className="text-muted-foreground">
                  Get notified immediately when incidents happen in your areas
                </p>
              </div>

              {/* Why notifications matter */}
              <div className="bg-background-elevated rounded-2xl p-4 mb-6">
                <h3 className="font-semibold text-foreground mb-4">Why this matters:</h3>

                <div className="space-y-4">
                  <div className="flex gap-3">
                    <div className="w-10 h-10 bg-safety-red/10 rounded-xl flex items-center justify-center flex-shrink-0">
                      <span className="text-lg">🚨</span>
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Real-time alerts</p>
                      <p className="text-sm text-muted-foreground">
                        Know about robberies, accidents & dangers instantly
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <div className="w-10 h-10 bg-safety-green/10 rounded-xl flex items-center justify-center flex-shrink-0">
                      <span className="text-lg">✅</span>
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Even when app is closed</p>
                      <p className="text-sm text-muted-foreground">
                        Alerts reach you 24/7, no need to keep app open
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                      <span className="text-lg">🔇</span>
                    </div>
                    <div>
                      <p className="font-medium text-foreground">You control it</p>
                      <p className="text-sm text-muted-foreground">
                        Customize which alerts you receive in settings
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sample notification preview */}
              <div className="bg-muted/50 rounded-xl p-4 mb-6">
                <p className="text-xs text-muted-foreground text-center mb-3">
                  Notifications look like this:
                </p>
                <div className="bg-white rounded-xl p-3 shadow-sm border border-border flex items-start gap-3">
                  <div className="w-10 h-10 bg-safety-red/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-lg">🔴</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground text-sm">ROBBERY near Lekki Phase 1</p>
                    <p className="text-xs text-muted-foreground truncate">Armed men spotted at Admiralty Way...</p>
                  </div>
                  <span className="text-xs text-muted-foreground">now</span>
                </div>
              </div>

              {/* Action buttons */}
              <div className="space-y-3">
                <Button
                  onClick={handleEnableNotifications}
                  disabled={notificationsLoading || notificationsEnabled}
                  className="w-full btn-primary py-4"
                >
                  {notificationsLoading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                      Enabling...
                    </>
                  ) : notificationsEnabled ? (
                    <>
                      <CheckCircle2 className="w-5 h-5 mr-2" />
                      Notifications Enabled!
                    </>
                  ) : (
                    <>
                      <Bell className="w-5 h-5 mr-2" />
                      Enable Notifications
                    </>
                  )}
                </Button>

                <div className="flex gap-3">
                  <Button variant="secondary" onClick={goBack}>
                    <ChevronLeft className="w-5 h-5" />
                  </Button>
                  <button
                    onClick={skipNotifications}
                    className="flex-1 text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
                  >
                    Skip (not recommended)
                  </button>
                </div>
              </div>

              {!pushSupported && (
                <p className="mt-4 text-xs text-center text-safety-amber">
                  ⚠️ Push notifications may not be supported on this browser.
                  Try using Safari on iOS or Chrome on Android.
                </p>
              )}
            </motion.div>
          )}

          {/* Step 6: Ready */}
          {step === 'ready' && (
            <motion.div
              key="ready"
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="text-center"
            >
              {/* Celebration Animation */}
              {showCelebration && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none"
                >
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1.5, rotate: 0 }}
                    transition={{ type: 'spring', stiffness: 200 }}
                    className="text-6xl"
                  >
                    <Sparkles className="w-24 h-24 text-safety-green" />
                  </motion.div>
                </motion.div>
              )}

              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
                className="inline-flex items-center justify-center w-20 h-20 bg-safety-green/10 rounded-full mb-6"
              >
                <CheckCircle2 className="w-12 h-12 text-safety-green" />
              </motion.div>

              <motion.h2
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-2xl font-bold text-foreground mb-2"
              >
                You&apos;re all set!
              </motion.h2>

              <motion.p
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-muted-foreground mb-6"
              >
                You&apos;re now connected with your community
              </motion.p>

              {/* Summary */}
              <motion.div
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="bg-background-elevated rounded-2xl p-4 mb-6 text-left"
              >
                <h3 className="font-semibold text-foreground mb-3">Your setup:</h3>

                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <MapPin className="w-5 h-5 text-primary" />
                    <div>
                      <p className="text-sm text-muted-foreground">Watching</p>
                      <p className="font-medium text-foreground">
                        {selectedAreas.length > 0
                          ? selectedAreas.map(a => a.name).join(', ')
                          : 'No areas yet'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Bell className="w-5 h-5 text-safety-amber" />
                    <div>
                      <p className="text-sm text-muted-foreground">Notifications</p>
                      <p className="font-medium text-foreground">
                        {notificationPreference === 'all'
                          ? 'All alerts'
                          : notificationPreference === 'critical'
                            ? 'Critical only'
                            : `${selectedAlertTypes.length} alert type${selectedAlertTypes.length !== 1 ? 's' : ''}`}
                        {quietHours && ' • Quiet hours on'}
                      </p>
                    </div>
                  </div>

                  {isPhoneVerified && (
                    <div className="flex items-center gap-3">
                      <Phone className="w-5 h-5 text-primary" />
                      <div>
                        <p className="text-sm text-muted-foreground">Phone</p>
                        <p className="font-medium text-foreground">Verified</p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-3">
                    <Navigation className="w-5 h-5 text-safety-green" />
                    <div>
                      <p className="text-sm text-muted-foreground">Location</p>
                      <p className="font-medium text-foreground">
                        {locationGranted ? 'Enabled' : 'Not enabled'}
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Community Count */}
              <motion.div
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="flex items-center justify-center gap-2 text-muted-foreground mb-6"
              >
                <Users className="w-5 h-5" />
                <span>
                  You&apos;re connected with{' '}
                  <span className="font-semibold text-foreground">2,341</span> neighbors
                </span>
              </motion.div>

              {/* CTA */}
              <motion.div
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.7 }}
              >
                <Button
                  onClick={completeOnboarding}
                  size="lg"
                  className="w-full btn-primary mb-3"
                  disabled={showCelebration}
                >
                  {showCelebration ? (
                    <>
                      <Sparkles className="w-5 h-5 mr-2 animate-pulse" />
                      Taking you to your feed...
                    </>
                  ) : (
                    <>
                      See Your Feed
                      <ChevronRight className="w-5 h-5 ml-2" />
                    </>
                  )}
                </Button>

                <button
                  onClick={() => shareAppInvite()}
                  className="flex items-center justify-center gap-2 w-full py-3 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <MessageCircle className="w-5 h-5" />
                  Invite family to SafetyAlerts via WhatsApp
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Phone Auth Modal */}
      <PhoneAuthModal
        isOpen={showPhoneAuthModal}
        onClose={() => setShowPhoneAuthModal(false)}
        onSuccess={handlePhoneAuthSuccess}
      />

      {/* Location Type Modal (Home/Work) */}
      <AnimatePresence>
        {locationTypeModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm"
            onClick={() => setLocationTypeModal(null)}
          >
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              transition={{ type: 'spring', damping: 25 }}
              className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl overflow-hidden safe-bottom max-h-[80vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {locationTypeModal === 'home' ? (
                    <Home className="w-6 h-6 text-primary" />
                  ) : (
                    <Briefcase className="w-6 h-6 text-primary" />
                  )}
                  <h3 className="font-semibold text-lg text-foreground">
                    Add {locationTypeModal === 'home' ? 'Home' : 'Work'} Location
                  </h3>
                </div>
                <button
                  onClick={() => setLocationTypeModal(null)}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Search Input */}
              <div className="px-6 py-4">
                <Input
                  leftIcon={<Search className="w-5 h-5" />}
                  placeholder={`Search for your ${locationTypeModal} area...`}
                  value={locationTypeSearch}
                  onChange={(e) => setLocationTypeSearch(e.target.value)}
                  autoFocus
                />
              </div>

              {/* Search Results */}
              <div className="flex-1 overflow-y-auto px-6 pb-6">
                {locationTypeResults.length > 0 ? (
                  <div className="space-y-1">
                    {locationTypeResults.map((location) => (
                      <button
                        key={location.slug}
                        onClick={() => addLocationWithType(location, locationTypeModal)}
                        className="w-full px-4 py-3 text-left hover:bg-muted/50 rounded-xl flex items-center justify-between transition-colors"
                      >
                        <div>
                          <div className="font-medium text-foreground">{location.name}</div>
                          <div className="text-sm text-muted-foreground">{location.state}</div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-muted-foreground" />
                      </button>
                    ))}
                  </div>
                ) : locationTypeSearch.length >= 2 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <MapPin className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No areas found for &quot;{locationTypeSearch}&quot;</p>
                    <p className="text-sm mt-1">Try a different search term</p>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <MapPin className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>Start typing to search for your {locationTypeModal} area</p>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
