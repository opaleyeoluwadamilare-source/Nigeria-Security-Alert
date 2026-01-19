'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronLeft,
  MapPin,
  Clock,
  Users,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  Share2,
  MoreHorizontal,
  Navigation,
  Phone,
  ExternalLink,
  MessageCircle,
  Flag,
  BellOff,
  Copy,
  ChevronRight,
} from 'lucide-react'
import {
  RobberyIcon,
  AttackIcon,
  GunshotsIcon,
  KidnappingIcon,
  CheckpointIcon,
  FireIcon,
  AccidentIcon,
  TrafficIcon,
  SuspiciousIcon,
} from '@/components/landing/IncidentIcons'
import { useLocation } from '@/hooks/useLocation'
import { useAppStore } from '@/lib/store'
import { Button } from '@/components/ui/Button'
import { RiskBadge } from '@/components/ui/RiskBadge'
import { Modal } from '@/components/ui/Modal'
import { shareAlert, shareToWhatsApp, copyAlertLink } from '@/lib/share'
import { formatDistance, canInteractWithReport } from '@/lib/distance'
import { INCIDENT_TYPES } from '@/types'
import type { Report, RiskLevel } from '@/types'

export default function AlertDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [report, setReport] = useState<Report | null>(null)
  const [loading, setLoading] = useState(true)
  const [confirming, setConfirming] = useState(false)
  const [userResponse, setUserResponse] = useState<'confirm' | 'deny' | null>(null)
  const [showShareSheet, setShowShareSheet] = useState(false)
  const [showMoreOptions, setShowMoreOptions] = useState(false)
  const [copied, setCopied] = useState(false)

  const { user, currentLocation } = useAppStore()
  const { getLocation, loading: locationLoading } = useLocation()

  // Fetch report
  useEffect(() => {
    async function fetchReport() {
      try {
        const response = await fetch(`/api/reports/${params.id}`)
        if (response.ok) {
          const data = await response.json()
          setReport(data.report)
        }
      } catch (error) {
        console.error('Error fetching report:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchReport()
  }, [params.id])

  // Check if user can interact
  const interactionCheck = report && currentLocation
    ? canInteractWithReport(
        currentLocation.lat,
        currentLocation.lng,
        report.latitude,
        report.longitude
      )
    : null

  // Handle confirmation
  const handleConfirmation = async (type: 'confirm' | 'deny' | 'ended') => {
    if (!report) return

    let coords = currentLocation
    if (!coords) {
      const result = await getLocation()
      if (result.success && result.coords) {
        coords = { lat: result.coords.lat, lng: result.coords.lng }
      } else {
        alert('Could not get your location. Please try again.')
        return
      }
    }

    setConfirming(true)
    try {
      const response = await fetch(`/api/reports/${report.id}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user?.id,
          latitude: coords.lat,
          longitude: coords.lng,
          confirmation_type: type,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        alert(data.error || 'Failed to submit response')
        return
      }

      setUserResponse(type === 'ended' ? 'confirm' : type)

      if (type === 'confirm') {
        setReport({ ...report, confirmation_count: report.confirmation_count + 1 })
      } else if (type === 'deny') {
        setReport({ ...report, denial_count: report.denial_count + 1 })
      } else if (type === 'ended') {
        setReport({ ...report, status: 'ended' })
      }
    } catch (error) {
      console.error('Error confirming:', error)
      alert('Failed to submit response')
    } finally {
      setConfirming(false)
    }
  }

  // Handle copy link
  const handleCopyLink = async () => {
    if (report) {
      await copyAlertLink(report.id)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  // Calculate risk level
  const riskLevel: RiskLevel = report
    ? calculateRiskLevel(report, interactionCheck?.distance)
    : 'MODERATE'

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading alert details...</p>
        </div>
      </div>
    )
  }

  // Not found state
  if (!report) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
          <AlertTriangle className="w-8 h-8 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-bold text-foreground mb-2">Alert not found</h2>
        <p className="text-muted-foreground mb-6">This alert may have been removed</p>
        <Button onClick={() => router.push('/app')} className="btn-primary">
          Back to Feed
        </Button>
      </div>
    )
  }

  const incidentConfig = INCIDENT_TYPES.find((i) => i.type === report.incident_type)
  const isHighRisk = ['robbery', 'kidnapping', 'gunshots', 'attack'].includes(report.incident_type)
  const totalResponses = report.confirmation_count + report.denial_count
  const confirmationRate = totalResponses > 0 ? (report.confirmation_count / totalResponses) * 100 : 0

  // Custom icon components map
  const incidentIconComponents: Record<string, React.ComponentType<{ className?: string }>> = {
    robbery: RobberyIcon,
    attack: AttackIcon,
    gunshots: GunshotsIcon,
    kidnapping: KidnappingIcon,
    checkpoint: CheckpointIcon,
    fire: FireIcon,
    accident: AccidentIcon,
    traffic: TrafficIcon,
    suspicious: SuspiciousIcon,
  }
  const IconComponent = incidentIconComponents[report.incident_type] || SuspiciousIcon

  return (
    <div className="min-h-screen bg-background pb-8">
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
            Alert Details
          </h1>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowShareSheet(true)}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
            >
              <Share2 className="w-5 h-5 text-muted-foreground" />
            </button>
            <button
              onClick={() => setShowMoreOptions(true)}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
            >
              <MoreHorizontal className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-4">
        {/* Status Badge */}
        {report.status === 'ended' && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-safety-green/10 border border-safety-green/20 rounded-xl p-3 mb-4 flex items-center gap-2"
          >
            <CheckCircle2 className="w-5 h-5 text-safety-green" />
            <span className="font-medium text-safety-green">This incident has been resolved</span>
          </motion.div>
        )}

        {/* Hero Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`rounded-2xl p-5 mb-4 border ${
            isHighRisk
              ? 'bg-gradient-to-br from-red-50 to-orange-50 border-red-200'
              : 'bg-white border-gray-100'
          }`}
        >
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <IconComponent className="w-16 h-16" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <RiskBadge level={riskLevel} size="sm" />
                {report.status === 'ended' && (
                  <span className="text-xs bg-safety-green/20 text-safety-green px-2 py-0.5 rounded-full">
                    RESOLVED
                  </span>
                )}
              </div>
              <h2 className="text-xl font-bold text-foreground">
                {incidentConfig?.label || 'Alert'}
              </h2>
              <p className="text-muted-foreground">{report.area_name}, {report.state}</p>
            </div>
          </div>
        </motion.div>

        {/* Timeline */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-background-elevated rounded-2xl p-4 mb-4 border border-border"
        >
          <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
            <Clock className="w-5 h-5 text-muted-foreground" />
            Timeline
          </h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-primary rounded-full" />
              <span className="text-sm text-muted-foreground">
                Reported {formatTimeAgo(new Date(report.created_at))}
              </span>
            </div>
            {report.confirmation_count > 0 && (
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-safety-green rounded-full" />
                <span className="text-sm text-muted-foreground">
                  First confirmed shortly after
                </span>
              </div>
            )}
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-primary/50 rounded-full" />
              <span className="text-sm text-muted-foreground">
                {totalResponses} community response{totalResponses !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        </motion.div>

        {/* Location */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-background-elevated rounded-2xl p-4 mb-4 border border-border"
        >
          <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-muted-foreground" />
            Location
          </h3>

          {/* Map Placeholder */}
          <div className="bg-muted rounded-xl h-32 mb-3 flex items-center justify-center relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-primary/20" />
            <div className="relative z-10 text-center">
              <div className="w-6 h-6 bg-safety-red rounded-full flex items-center justify-center mx-auto mb-1 shadow-lg">
                <MapPin className="w-3 h-3 text-white" />
              </div>
              <span className="text-xs text-muted-foreground">Map preview</span>
            </div>
          </div>

          <div className="space-y-2">
            {report.landmark && (
              <div className="flex items-start gap-2">
                <Navigation className="w-4 h-4 text-muted-foreground mt-0.5" />
                <span className="text-sm text-foreground">{report.landmark}</span>
              </div>
            )}
            {interactionCheck && (
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {formatDistance(interactionCheck.distance)} from you
                </span>
              </div>
            )}
          </div>

          <button
            onClick={() => {
              if (report?.latitude && report?.longitude) {
                // Detect if iOS for Apple Maps, otherwise Google Maps
                const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
                const destination = `${report.latitude},${report.longitude}`
                const label = encodeURIComponent(report.area_name || 'Incident Location')

                if (isIOS) {
                  // Apple Maps
                  window.open(`maps://maps.apple.com/?daddr=${destination}&q=${label}`, '_blank')
                } else {
                  // Google Maps
                  window.open(`https://www.google.com/maps/dir/?api=1&destination=${destination}`, '_blank')
                }
              }
            }}
            className="w-full mt-3 py-2 bg-muted rounded-lg text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-2"
          >
            <Navigation className="w-4 h-4" />
            Get Directions
          </button>
        </motion.div>

        {/* Description */}
        {report.description && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-background-elevated rounded-2xl p-4 mb-4 border border-border"
          >
            <h3 className="font-semibold text-foreground mb-2">Description</h3>
            <p className="text-muted-foreground">{report.description}</p>
          </motion.div>
        )}

        {/* Community Response */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-background-elevated rounded-2xl p-4 mb-4 border border-border"
        >
          <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-muted-foreground" />
            Community Response
          </h3>

          {/* Confirmation Bar */}
          <div className="mb-4">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-safety-green font-medium">{report.confirmation_count} confirmed</span>
              <span className="text-safety-red font-medium">{report.denial_count} denied</span>
            </div>
            <div className="h-3 bg-muted rounded-full overflow-hidden flex">
              {totalResponses > 0 && (
                <>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${confirmationRate}%` }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                    className="h-full bg-safety-green"
                  />
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${100 - confirmationRate}%` }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                    className="h-full bg-safety-red/40"
                  />
                </>
              )}
            </div>
          </div>

          {/* Credibility Indicator */}
          <div className={`p-3 rounded-xl ${
            confirmationRate >= 70
              ? 'bg-safety-green/10 border border-safety-green/20'
              : confirmationRate >= 40
                ? 'bg-safety-amber/10 border border-safety-amber/20'
                : 'bg-muted'
          }`}>
            <div className="flex items-center gap-2">
              <CheckCircle2 className={`w-5 h-5 ${
                confirmationRate >= 70
                  ? 'text-safety-green'
                  : confirmationRate >= 40
                    ? 'text-safety-amber'
                    : 'text-muted-foreground'
              }`} />
              <span className="font-medium text-foreground">
                {confirmationRate >= 70
                  ? 'High confidence'
                  : confirmationRate >= 40
                    ? 'Moderate confidence'
                    : totalResponses > 0
                      ? 'Low confidence'
                      : 'Awaiting verification'}
              </span>
            </div>
          </div>
        </motion.div>

        {/* User Actions */}
        {report.status === 'active' && !userResponse && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-background-elevated rounded-2xl p-4 mb-4 border border-border"
          >
            <h3 className="font-semibold text-foreground mb-3">Can you verify this?</h3>

            {!interactionCheck?.canInteract ? (
              <div className="bg-muted/50 rounded-xl p-4 text-center">
                <MapPin className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  You need to be within 3km to verify this report.
                  {interactionCheck && (
                    <span className="block mt-1 font-medium">
                      You are {formatDistance(interactionCheck.distance)} away.
                    </span>
                  )}
                </p>
                <button className="mt-3 text-sm text-primary hover:underline">
                  Share with someone nearby
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex gap-3">
                  <Button
                    onClick={() => handleConfirmation('confirm')}
                    disabled={confirming || locationLoading}
                    className="flex-1 btn-success"
                  >
                    <CheckCircle2 className="w-5 h-5 mr-2" />
                    I Can Confirm
                  </Button>
                  <Button
                    onClick={() => handleConfirmation('deny')}
                    disabled={confirming || locationLoading}
                    variant="secondary"
                    className="flex-1"
                  >
                    <XCircle className="w-5 h-5 mr-2" />
                    Not Accurate
                  </Button>
                </div>
                <button
                  onClick={() => handleConfirmation('ended')}
                  disabled={confirming || locationLoading}
                  className="w-full py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Mark as Resolved
                </button>
              </div>
            )}
          </motion.div>
        )}

        {/* User Already Responded */}
        {userResponse && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-primary/10 rounded-2xl p-4 mb-4 border border-primary/20"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-medium text-foreground">Thank you!</p>
                <p className="text-sm text-muted-foreground">
                  You {userResponse === 'confirm' ? 'confirmed' : 'denied'} this report
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Emergency Resources */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="bg-background-elevated rounded-2xl p-4 border border-border"
        >
          <h3 className="font-semibold text-foreground mb-3">Need immediate help?</h3>
          <div className="grid grid-cols-2 gap-3">
            <a
              href="tel:112"
              className="flex items-center gap-3 p-3 bg-safety-red/10 rounded-xl hover:bg-safety-red/20 transition-colors"
            >
              <div className="w-10 h-10 bg-safety-red/20 rounded-full flex items-center justify-center">
                <Phone className="w-5 h-5 text-safety-red" />
              </div>
              <div>
                <p className="font-medium text-foreground">Emergency</p>
                <p className="text-xs text-muted-foreground">Call 112</p>
              </div>
            </a>
            <a
              href="tel:199"
              className="flex items-center gap-3 p-3 bg-primary/10 rounded-xl hover:bg-primary/20 transition-colors"
            >
              <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center">
                <Phone className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-medium text-foreground">Police</p>
                <p className="text-xs text-muted-foreground">Call 199</p>
              </div>
            </a>
          </div>
        </motion.div>
      </div>

      {/* Share Sheet */}
      <Modal
        isOpen={showShareSheet}
        onClose={() => setShowShareSheet(false)}
        title="Share Alert"
      >
        <div className="space-y-2">
          <button
            onClick={() => {
              if (report) shareToWhatsApp(report)
              setShowShareSheet(false)
            }}
            className="w-full flex items-center gap-3 p-3 hover:bg-muted rounded-xl transition-colors"
          >
            <div className="w-10 h-10 bg-[#25D366]/10 rounded-full flex items-center justify-center">
              <MessageCircle className="w-5 h-5 text-[#25D366]" />
            </div>
            <div className="text-left">
              <p className="font-medium text-foreground">Share on WhatsApp</p>
              <p className="text-xs text-muted-foreground">Send to contacts or groups</p>
            </div>
          </button>

          <button
            onClick={() => {
              handleCopyLink()
              setShowShareSheet(false)
            }}
            className="w-full flex items-center gap-3 p-3 hover:bg-muted rounded-xl transition-colors"
          >
            <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center">
              <Copy className="w-5 h-5 text-muted-foreground" />
            </div>
            <div className="text-left">
              <p className="font-medium text-foreground">
                {copied ? 'Link copied!' : 'Copy link'}
              </p>
              <p className="text-xs text-muted-foreground">Share anywhere</p>
            </div>
          </button>

          <button
            onClick={() => {
              if (report) shareAlert(report)
              setShowShareSheet(false)
            }}
            className="w-full flex items-center gap-3 p-3 hover:bg-muted rounded-xl transition-colors"
          >
            <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center">
              <Share2 className="w-5 h-5 text-muted-foreground" />
            </div>
            <div className="text-left">
              <p className="font-medium text-foreground">More options</p>
              <p className="text-xs text-muted-foreground">Share via other apps</p>
            </div>
          </button>
        </div>
      </Modal>

      {/* More Options */}
      <Modal
        isOpen={showMoreOptions}
        onClose={() => setShowMoreOptions(false)}
        title="Options"
      >
        <div className="space-y-2">
          <button className="w-full flex items-center gap-3 p-3 hover:bg-muted rounded-xl transition-colors">
            <Flag className="w-5 h-5 text-muted-foreground" />
            <span className="font-medium text-foreground">Report as fake</span>
          </button>
          <button className="w-full flex items-center gap-3 p-3 hover:bg-muted rounded-xl transition-colors">
            <BellOff className="w-5 h-5 text-muted-foreground" />
            <span className="font-medium text-foreground">Mute similar alerts</span>
          </button>
        </div>
      </Modal>
    </div>
  )
}

// Helper functions
function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  if (seconds < 60) return 'Just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`
  return `${Math.floor(seconds / 86400)} days ago`
}

function calculateRiskLevel(report: Report, distance?: number): RiskLevel {
  const severeTypes = ['kidnapping', 'robbery', 'attack', 'gunshots']
  const isSevere = severeTypes.includes(report.incident_type)

  if (distance === undefined) {
    return isSevere ? 'HIGH' : 'MODERATE'
  }

  if (distance < 1 && isSevere) return 'EXTREME'
  if (distance < 2 && isSevere) return 'VERY HIGH'
  if (distance < 5 || isSevere) return 'HIGH'
  if (distance < 10) return 'MODERATE'
  return 'LOW'
}
