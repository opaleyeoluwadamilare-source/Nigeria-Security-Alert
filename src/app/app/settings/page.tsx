'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronLeft,
  MapPin,
  Bell,
  Shield,
  Plus,
  X,
  Search,
  ChevronRight,
  LogOut,
  User,
  Phone,
  Lock,
  Download,
  Trash2,
  Star,
  MessageCircle,
  HelpCircle,
  FileText,
  ExternalLink,
  Moon,
  Volume2,
  VolumeX,
  Clock,
  Settings,
  Activity,
  CheckCircle2,
  Share,
  Smartphone,
  MoreVertical,
} from 'lucide-react'
import { NigerianShield } from '@/components/landing/NigerianShield'
import { useDeviceDetect, getInstallInstructions } from '@/hooks/useDeviceDetect'
import { useDevice } from '@/hooks/useDevice'
import { useAppStore } from '@/lib/store'
import { usePushNotifications } from '@/hooks/usePushNotifications'
import { searchLocations } from '@/lib/locations'
import { shareAppInvite } from '@/lib/share'
import { Button } from '@/components/ui/Button'
import { Toggle } from '@/components/ui/Toggle'
import { Input } from '@/components/ui/Input'
import { Modal, ConfirmModal } from '@/components/ui/Modal'
import { PhoneAuthModal } from '@/components/auth/PhoneAuthModal'
import { TrustScoreCard } from '@/components/ui/TrustScoreBadge'
import type { NigerianLocation, UserLocation } from '@/types'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export default function SettingsPage() {
  const router = useRouter()
  const device = useDeviceDetect()
  const deviceInfo = useDevice()
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<NigerianLocation[]>([])
  const [showAddArea, setShowAddArea] = useState(false)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [showPhoneAuth, setShowPhoneAuth] = useState(false)
  const [quietHours, setQuietHours] = useState(false)
  const [criticalOnly, setCriticalOnly] = useState(false)
  const [smsAlertsEnabled, setSmsAlertsEnabled] = useState(false)
  const [alertRadius, setAlertRadius] = useState<'1km' | '3km' | '5km' | '10km'>('5km')
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showInstallInstructions, setShowInstallInstructions] = useState(false)
  const [testNotifSent, setTestNotifSent] = useState(false)

  // Listen for install prompt event (Android/Desktop)
  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault()
      setInstallPrompt(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', handleBeforeInstall)
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall)
  }, [])

  // Handle native install
  const handleInstall = async () => {
    if (installPrompt) {
      await installPrompt.prompt()
      const { outcome } = await installPrompt.userChoice
      if (outcome === 'accepted') {
        setInstallPrompt(null)
      }
    } else if (device.isIOS) {
      setShowInstallInstructions(true)
    }
  }

  const installInstructions = getInstallInstructions(device)

  const {
    user,
    setUser,
    savedLocations,
    addLocation,
    removeLocation,
    reset,
    setHasCompletedOnboarding,
  } = useAppStore()

  // Handle phone verification success
  const handlePhoneAuthSuccess = (authUser: { id: string; phone: string }) => {
    setUser({
      id: authUser.id,
      phone: authUser.phone,
      phone_verified: true,
      trust_score: 0,
      created_at: new Date().toISOString(),
      last_active: new Date().toISOString(),
    })
    setShowPhoneAuth(false)
  }

  const {
    isSupported: pushSupported,
    isEnabled: pushEnabled,
    permission: pushPermission,
    enable: enablePush,
    disable: disablePush,
    isLoading: pushLoading,
    support: pushSupport,
    testNotification: sendTestNotification,
    error: pushError,
  } = usePushNotifications()

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

  // Add area
  const handleAddArea = (location: NigerianLocation) => {
    const newLocation: UserLocation = {
      id: `local-${location.slug}-${Date.now()}`,
      user_id: 'local',
      area_name: location.name,
      area_slug: location.slug,
      state: location.state,
      is_primary: savedLocations.length === 0,
      created_at: new Date().toISOString(),
    }
    addLocation(newLocation)
    setSearchQuery('')
    setSearchResults([])
    setShowAddArea(false)
  }

  // Remove area
  const handleRemoveArea = (id: string) => {
    removeLocation(id)
  }

  // Toggle push notifications
  const togglePush = async () => {
    if (pushEnabled) {
      await disablePush()
    } else {
      await enablePush()
    }
  }

  // Send test notification using the hook
  const handleTestNotification = async () => {
    const success = await sendTestNotification()
    if (success) {
      setTestNotifSent(true)
      setTimeout(() => setTestNotifSent(false), 3000)
    } else if (pushSupport.needsPWAInstall) {
      alert('Install SafetyAlerts as an app to enable notifications. Tap the share button and "Add to Home Screen".')
    } else if (pushPermission === 'denied') {
      alert('Notifications are blocked. Please enable in your browser or device settings.')
    } else {
      alert('Could not send notification. Please try enabling notifications first.')
    }
  }

  // Logout / Reset
  const handleLogout = () => {
    reset()
    setHasCompletedOnboarding(false)
    router.push('/')
  }

  // Format account age
  function formatAccountAge(createdAt: string): string {
    const created = new Date(createdAt)
    const now = new Date()
    const diffDays = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24))

    if (diffDays < 7) return 'New'
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w`
    if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo`
    return `${Math.floor(diffDays / 365)}y`
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 bg-background/80 backdrop-blur-md border-b border-border z-40">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center">
          <button
            onClick={() => router.back()}
            className="p-2 -ml-2 hover:bg-muted rounded-lg transition-colors"
          >
            <ChevronLeft className="w-6 h-6 text-foreground" />
          </button>
          <h1 className="font-semibold text-lg flex-1 text-center text-foreground">
            Settings
          </h1>
          <div className="w-10" />
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-4 space-y-6">
        {/* Profile Section */}
        <section>
          <div className="bg-background-elevated rounded-2xl p-4 border border-border">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center">
                <User className="w-7 h-7 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground">SafetyAlerts User</h3>
                <p className="text-sm text-muted-foreground">Member since 2024</p>
              </div>
            </div>

            {/* Phone Verification Status */}
            <div className="mt-4 pt-4 border-t border-border">
              {user?.phone_verified ? (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-safety-green/10 rounded-xl flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5 text-safety-green" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-foreground">Phone Verified</p>
                    <p className="text-sm text-muted-foreground">{user.phone}</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-safety-amber/10 rounded-xl flex items-center justify-center">
                      <Phone className="w-5 h-5 text-safety-amber" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Phone Not Verified</p>
                      <p className="text-sm text-muted-foreground">Verify to build trust</p>
                    </div>
                  </div>
                  <Button
                    onClick={() => setShowPhoneAuth(true)}
                    variant="secondary"
                    size="sm"
                  >
                    Verify
                  </Button>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Trust Score Section */}
        <section>
          <TrustScoreCard
            score={user?.trust_score || 0}
            phoneVerified={user?.phone_verified || false}
            accountAge={user?.created_at ? formatAccountAge(user.created_at) : 'New'}
            totalReports={0}
          />
        </section>

        {/* Install App - Only show if not installed */}
        {!device.isStandalone && (
          <section>
            <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-2xl p-4 text-white">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Smartphone className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">Install SafetyAlerts</h3>
                  <p className="text-sm text-emerald-100">
                    Add to home screen for quick access
                  </p>
                </div>
                <Button
                  onClick={handleInstall}
                  variant="secondary"
                  size="sm"
                  className="bg-white text-emerald-700 hover:bg-emerald-50"
                >
                  <Download className="w-4 h-4 mr-1" />
                  Install
                </Button>
              </div>

              {/* Show instructions inline for iOS or when expanded */}
              {showInstallInstructions && device.isIOS && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  className="mt-4 pt-4 border-t border-white/20"
                >
                  <p className="font-medium mb-3">{installInstructions.title}</p>
                  <ol className="space-y-2">
                    {installInstructions.steps.map((step, index) => (
                      <li key={index} className="flex items-start gap-3 text-sm">
                        <span className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0 text-xs">
                          {index + 1}
                        </span>
                        <span className="text-emerald-50">{step}</span>
                      </li>
                    ))}
                  </ol>
                  <div className="mt-3 p-2 bg-white/10 rounded-lg flex items-center justify-center gap-2">
                    <Share className="w-5 h-5" />
                    <span className="text-sm">Look for this Share icon below</span>
                  </div>
                </motion.div>
              )}

              {/* Android hint */}
              {device.isAndroid && !installPrompt && (
                <p className="mt-3 text-xs text-emerald-100 flex items-center gap-2">
                  <MoreVertical className="w-4 h-4" />
                  Tap browser menu (⋮) → &quot;Add to Home screen&quot;
                </p>
              )}
            </div>
          </section>
        )}

        {/* My Areas */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-foreground flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary" />
              My Areas
            </h2>
            <button
              onClick={() => setShowAddArea(true)}
              className="flex items-center gap-1 text-sm text-primary hover:underline"
            >
              <Plus className="w-4 h-4" />
              Add Area
            </button>
          </div>

          <div className="bg-background-elevated rounded-2xl border border-border overflow-hidden">
            {savedLocations.length === 0 ? (
              <div className="p-6 text-center">
                <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
                  <MapPin className="w-6 h-6 text-muted-foreground" />
                </div>
                <p className="font-medium text-foreground mb-1">No areas added</p>
                <p className="text-sm text-muted-foreground mb-4">
                  Add areas to receive safety alerts
                </p>
                <Button onClick={() => setShowAddArea(true)} variant="secondary" size="sm">
                  <Plus className="w-4 h-4 mr-1" />
                  Add Your First Area
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {savedLocations.map((location, index) => (
                  <motion.div
                    key={location.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="p-4 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        location.is_primary ? 'bg-primary/10' : 'bg-muted'
                      }`}>
                        <MapPin className={`w-5 h-5 ${
                          location.is_primary ? 'text-primary' : 'text-muted-foreground'
                        }`} />
                      </div>
                      <div>
                        <div className="font-medium text-foreground flex items-center gap-2">
                          {location.area_name}
                          {location.is_primary && (
                            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                              Primary
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {location.state}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveArea(location.id)}
                      className="p-2 text-muted-foreground hover:text-safety-red hover:bg-safety-red/10 rounded-lg transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* Alert Radius */}
          <div className="mt-3 bg-background-elevated rounded-2xl p-4 border border-border">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="font-medium text-foreground">Alert Radius</p>
                <p className="text-sm text-muted-foreground">
                  Receive alerts within this distance
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              {(['1km', '3km', '5km', '10km'] as const).map((radius) => (
                <button
                  key={radius}
                  onClick={() => setAlertRadius(radius)}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${
                    alertRadius === radius
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  {radius}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Notifications */}
        <section>
          <h2 className="font-semibold text-foreground flex items-center gap-2 mb-3">
            <Bell className="w-5 h-5 text-safety-amber" />
            Notifications
          </h2>

          <div className="bg-background-elevated rounded-2xl border border-border overflow-hidden divide-y divide-border">
            {/* Push Toggle */}
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  pushEnabled ? 'bg-safety-green/10' : 'bg-muted'
                }`}>
                  {pushEnabled ? (
                    <Volume2 className="w-5 h-5 text-safety-green" />
                  ) : (
                    <VolumeX className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
                <div>
                  <p className="font-medium text-foreground">Push Notifications</p>
                  <p className="text-sm text-muted-foreground">
                    {!pushSupported
                      ? 'Not supported on this device'
                      : pushPermission === 'denied'
                        ? 'Blocked in browser settings'
                        : pushEnabled
                          ? 'Enabled'
                          : 'Disabled'}
                  </p>
                </div>
              </div>
              <Toggle
                checked={pushEnabled}
                onChange={togglePush}
                disabled={!pushSupported || pushPermission === 'denied' || pushLoading}
              />
            </div>

            {/* Critical Only */}
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-safety-red/10 rounded-xl flex items-center justify-center">
                  <Shield className="w-5 h-5 text-safety-red" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Critical Alerts Only</p>
                  <p className="text-sm text-muted-foreground">
                    Only high-priority incidents
                  </p>
                </div>
              </div>
              <Toggle
                checked={criticalOnly}
                onChange={setCriticalOnly}
              />
            </div>

            {/* Quiet Hours */}
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-muted rounded-xl flex items-center justify-center">
                  <Moon className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Quiet Hours</p>
                  <p className="text-sm text-muted-foreground">
                    No alerts 11pm - 6am
                  </p>
                </div>
              </div>
              <Toggle
                checked={quietHours}
                onChange={setQuietHours}
              />
            </div>
            {quietHours && (
              <div className="px-4 pb-4">
                <p className="text-xs text-safety-amber flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  Critical alerts will bypass quiet hours
                </p>
              </div>
            )}

            {/* SMS Alerts - for devices without push support */}
            {deviceInfo.isIOS && !deviceInfo.canReceivePush && (
              <div className="p-4 flex items-center justify-between border-t border-border">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-safety-amber/10 rounded-xl flex items-center justify-center">
                    <MessageCircle className="w-5 h-5 text-safety-amber" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">SMS Alerts</p>
                    <p className="text-sm text-muted-foreground">
                      Get critical alerts via SMS
                    </p>
                  </div>
                </div>
                <Toggle
                  checked={smsAlertsEnabled}
                  onChange={async (enabled) => {
                    setSmsAlertsEnabled(enabled)
                    if (user?.id) {
                      try {
                        await fetch('/api/user/sms-preferences', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            user_id: user.id,
                            sms_enabled: enabled,
                            critical_only: true,
                          }),
                        })
                      } catch (e) {
                        console.error('Failed to update SMS preference:', e)
                      }
                    }
                  }}
                />
              </div>
            )}
            {deviceInfo.isIOS && !deviceInfo.canReceivePush && smsAlertsEnabled && (
              <div className="px-4 pb-4">
                <p className="text-xs text-muted-foreground">
                  SMS alerts are sent for robberies, kidnappings, and gunshots only. Standard SMS rates apply.
                </p>
              </div>
            )}

            {/* Test Notification */}
            <div className="p-4">
              <button
                onClick={handleTestNotification}
                disabled={testNotifSent}
                className={`w-full py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${
                  testNotifSent
                    ? 'bg-safety-green/10 text-safety-green'
                    : 'bg-primary/10 text-primary hover:bg-primary/20'
                }`}
              >
                {testNotifSent ? (
                  <>
                    <CheckCircle2 className="w-5 h-5" />
                    Test Sent! Check your notifications
                  </>
                ) : (
                  <>
                    <Bell className="w-5 h-5" />
                    Send Test Notification
                  </>
                )}
              </button>
              <p className="text-xs text-muted-foreground text-center mt-2">
                Tap to verify notifications work on your device
              </p>
            </div>
          </div>
        </section>

        {/* Privacy & Data */}
        <section>
          <h2 className="font-semibold text-foreground flex items-center gap-2 mb-3">
            <Lock className="w-5 h-5 text-muted-foreground" />
            Privacy & Data
          </h2>

          <div className="bg-background-elevated rounded-2xl border border-border overflow-hidden divide-y divide-border">
            <button className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-muted rounded-xl flex items-center justify-center">
                  <User className="w-5 h-5 text-muted-foreground" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-foreground">Profile Visibility</p>
                  <p className="text-sm text-muted-foreground">Anonymous</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </button>

            <button className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-muted rounded-xl flex items-center justify-center">
                  <Download className="w-5 h-5 text-muted-foreground" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-foreground">Download My Data</p>
                  <p className="text-sm text-muted-foreground">Export your data</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
        </section>

        {/* Activity */}
        <section>
          <h2 className="font-semibold text-foreground flex items-center gap-2 mb-3">
            <Activity className="w-5 h-5 text-muted-foreground" />
            Your Activity
          </h2>

          <div className="bg-background-elevated rounded-2xl p-4 border border-border">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-foreground">0</div>
                <div className="text-xs text-muted-foreground">Reports</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-foreground">0</div>
                <div className="text-xs text-muted-foreground">Confirmations</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-safety-green">0</div>
                <div className="text-xs text-muted-foreground">Neighbors Helped</div>
              </div>
            </div>
          </div>
        </section>

        {/* About & Support */}
        <section>
          <h2 className="font-semibold text-foreground flex items-center gap-2 mb-3">
            <HelpCircle className="w-5 h-5 text-muted-foreground" />
            About & Support
          </h2>

          <div className="bg-background-elevated rounded-2xl border border-border overflow-hidden divide-y divide-border">
            <button
              onClick={() => shareAppInvite()}
              className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#25D366]/10 rounded-xl flex items-center justify-center">
                  <MessageCircle className="w-5 h-5 text-[#25D366]" />
                </div>
                <span className="font-medium text-foreground">Share with Friends</span>
              </div>
              <ExternalLink className="w-5 h-5 text-muted-foreground" />
            </button>

            <button className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-safety-amber/10 rounded-xl flex items-center justify-center">
                  <Star className="w-5 h-5 text-safety-amber" />
                </div>
                <span className="font-medium text-foreground">Rate SafetyAlerts</span>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </button>

            <button className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-muted rounded-xl flex items-center justify-center">
                  <HelpCircle className="w-5 h-5 text-muted-foreground" />
                </div>
                <span className="font-medium text-foreground">Help & FAQ</span>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </button>

            <a
              href="mailto:hello@safetyalertsng.com"
              className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-muted rounded-xl flex items-center justify-center">
                  <Phone className="w-5 h-5 text-muted-foreground" />
                </div>
                <span className="font-medium text-foreground">Contact Support</span>
              </div>
              <ExternalLink className="w-5 h-5 text-muted-foreground" />
            </a>

            <Link
              href="/privacy"
              className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-muted rounded-xl flex items-center justify-center">
                  <FileText className="w-5 h-5 text-muted-foreground" />
                </div>
                <span className="font-medium text-foreground">Privacy Policy</span>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </Link>

            <div className="p-4 flex items-center justify-between">
              <span className="text-muted-foreground">Version</span>
              <span className="text-muted-foreground">1.0.0</span>
            </div>
          </div>
        </section>

        {/* Danger Zone */}
        <section>
          <Button
            variant="ghost"
            onClick={() => setShowLogoutConfirm(true)}
            className="w-full text-safety-red hover:bg-safety-red/10"
          >
            <Trash2 className="w-5 h-5 mr-2" />
            Clear All Data
          </Button>
        </section>
      </div>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-gray-100 z-40 safe-bottom">
        <div className="max-w-lg mx-auto flex items-center justify-around">
          <Link
            href="/app"
            className="flex flex-col items-center py-3 px-6 min-w-[80px] text-gray-400 hover:text-gray-600 transition-colors"
          >
            <NigerianShield className="w-6 h-6 opacity-50" />
            <span className="text-xs mt-1">Feed</span>
          </Link>
          <Link
            href="/app/activity"
            className="flex flex-col items-center py-3 px-6 min-w-[80px] text-gray-400 hover:text-gray-600 transition-colors"
          >
            <Activity className="w-5 h-5" />
            <span className="text-xs mt-1">Activity</span>
          </Link>
          <Link
            href="/app/settings"
            className="flex flex-col items-center py-3 px-6 min-w-[80px] text-emerald-700"
          >
            <Settings className="w-5 h-5" />
            <span className="text-xs mt-1 font-medium">Settings</span>
          </Link>
        </div>
      </nav>

      {/* Add Area Modal */}
      <Modal
        isOpen={showAddArea}
        onClose={() => {
          setShowAddArea(false)
          setSearchQuery('')
          setSearchResults([])
        }}
        title="Add Area"
      >
        <div className="space-y-4">
          <Input
            leftIcon={<Search className="w-5 h-5" />}
            placeholder="Search areas (e.g., Lekki, Wuse 2)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />

          {searchResults.length > 0 && (
            <div className="max-h-60 overflow-y-auto divide-y divide-border rounded-xl border border-border">
              {searchResults.map((location) => (
                <button
                  key={location.slug}
                  onClick={() => handleAddArea(location)}
                  className="w-full px-4 py-3 text-left hover:bg-muted/50 flex items-center justify-between transition-colors"
                >
                  <div>
                    <div className="font-medium text-foreground">{location.name}</div>
                    <div className="text-sm text-muted-foreground">{location.state}</div>
                  </div>
                  <Plus className="w-5 h-5 text-primary" />
                </button>
              ))}
            </div>
          )}

          {searchQuery.length >= 2 && searchResults.length === 0 && (
            <div className="text-center py-6 text-muted-foreground">
              <MapPin className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No areas found</p>
              <p className="text-sm">Try a different search term</p>
            </div>
          )}
        </div>
      </Modal>

      {/* Logout Confirmation */}
      <ConfirmModal
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={handleLogout}
        title="Clear All Data?"
        description="This will remove all your saved areas, settings, and preferences. This action cannot be undone."
        confirmText="Clear Data"
        variant="danger"
      />

      {/* Phone Auth Modal */}
      <PhoneAuthModal
        isOpen={showPhoneAuth}
        onClose={() => setShowPhoneAuth(false)}
        onSuccess={handlePhoneAuthSuccess}
      />
    </div>
  )
}
