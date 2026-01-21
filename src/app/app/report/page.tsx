'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MapPin,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Camera,
  Image as ImageIcon,
  X,
  Navigation,
  Edit2,
  Users,
  Bell,
  Share2,
  MessageCircle,
  Sparkles,
  Lock,
  Trash2,
} from 'lucide-react'
import { compressImage, validateImageFile, fileToDataUrl } from '@/lib/image-utils'
import { NigerianShield } from '@/components/landing/NigerianShield'
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
import { Input, Textarea } from '@/components/ui/Input'
import { ProgressSteps } from '@/components/ui/ProgressSteps'
import { shareToWhatsApp } from '@/lib/share'
import { INCIDENT_TYPES } from '@/types'
import type { IncidentType, LocationResult } from '@/types'

type Step = 'type' | 'location' | 'details' | 'review' | 'success'

const stepOrder: Step[] = ['type', 'location', 'details', 'review', 'success']
const stepLabels = ['Incident', 'Location', 'Details', 'Review', 'Done']

// Incident type categories with colors
const incidentCategories = [
  {
    label: 'High Risk',
    types: ['robbery', 'kidnapping', 'gunshots', 'attack'],
    color: 'border-safety-red',
  },
  {
    label: 'Caution',
    types: ['fire', 'accident', 'checkpoint'],
    color: 'border-safety-amber',
  },
  {
    label: 'Awareness',
    types: ['traffic', 'suspicious', 'other'],
    color: 'border-primary',
  },
]

export default function ReportPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('type')
  const [locationResult, setLocationResult] = useState<LocationResult | null>(null)
  const [selectedType, setSelectedType] = useState<IncidentType | null>(null)
  const [landmark, setLandmark] = useState('')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [showCelebration, setShowCelebration] = useState(false)
  const [adjustingLocation, setAdjustingLocation] = useState(false)

  // Image upload state
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null)
  const [imageError, setImageError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { getLocation, loading: locationLoading, error: locationError } = useLocation()
  const { user } = useAppStore()

  // Handle image selection
  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setImageError(null)

    // Validate file
    const validation = validateImageFile(file)
    if (!validation.valid) {
      setImageError(validation.error || 'Invalid image')
      return
    }

    setSelectedImage(file)

    // Generate preview
    try {
      const dataUrl = await fileToDataUrl(file)
      setImagePreview(dataUrl)
    } catch (err) {
      console.error('Failed to generate preview:', err)
    }
  }

  // Remove selected image
  const handleRemoveImage = () => {
    setSelectedImage(null)
    setImagePreview(null)
    setUploadedImageUrl(null)
    setImageError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // Upload image to server
  const uploadImage = async (): Promise<string | null> => {
    if (!selectedImage) return null
    if (uploadedImageUrl) return uploadedImageUrl // Already uploaded

    setUploadingImage(true)
    setImageError(null)

    try {
      // Compress image
      const compressedBlob = await compressImage(selectedImage, {
        maxWidth: 1200,
        maxHeight: 1200,
        quality: 0.8,
      })

      // Create form data
      const formData = new FormData()
      formData.append('file', compressedBlob, 'photo.jpg')
      if (user?.id) {
        formData.append('user_id', user.id)
      }

      // Upload
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Upload failed')
      }

      const data = await response.json()
      setUploadedImageUrl(data.url)
      return data.url
    } catch (err) {
      console.error('Image upload error:', err)
      setImageError(err instanceof Error ? err.message : 'Failed to upload image')
      return null
    } finally {
      setUploadingImage(false)
    }
  }

  const currentStepIndex = stepOrder.indexOf(step)

  // Get location when reaching location step
  useEffect(() => {
    if (step === 'location' && !locationResult) {
      fetchLocation()
    }
  }, [step])

  const fetchLocation = async () => {
    const result = await getLocation()
    setLocationResult(result)
  }

  // Navigation
  const goBack = () => {
    const prevIndex = currentStepIndex - 1
    if (prevIndex >= 0) {
      setStep(stepOrder[prevIndex])
    } else {
      router.back()
    }
  }

  const goNext = () => {
    const nextIndex = currentStepIndex + 1
    if (nextIndex < stepOrder.length) {
      setStep(stepOrder[nextIndex])
    }
  }

  // Submit report
  const submitReport = async () => {
    if (!locationResult?.coords || !locationResult.area || !selectedType) return

    setSubmitting(true)
    setSubmitError(null)

    try {
      // Upload image first if selected
      let photoUrl = uploadedImageUrl
      if (selectedImage && !uploadedImageUrl) {
        photoUrl = await uploadImage()
        // Continue even if image upload fails - report is more important
      }

      const response = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user?.id,
          incident_type: selectedType,
          landmark: landmark || null,
          description: description || null,
          photo_url: photoUrl,
          latitude: locationResult.coords.lat,
          longitude: locationResult.coords.lng,
          area_name: locationResult.area.name,
          area_slug: locationResult.area.slug,
          state: locationResult.area.state,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to submit report')
      }

      setShowCelebration(true)
      setStep('success')
    } catch (error) {
      setSubmitError('Failed to submit report. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  // Animation variants
  const pageVariants = {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0, transition: { duration: 0.3, ease: 'easeOut' } },
    exit: { opacity: 0, x: -20, transition: { duration: 0.2 } },
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 bg-background/80 backdrop-blur-md border-b border-border z-40">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center">
          <button onClick={goBack} className="p-2 -ml-2 hover:bg-muted rounded-lg transition-colors">
            <ChevronLeft className="w-6 h-6 text-foreground" />
          </button>
          <h1 className="font-semibold text-lg flex-1 text-center text-foreground">
            Report Incident
          </h1>
          <div className="w-10" />
        </div>
      </header>

      {/* Progress */}
      <div className="max-w-lg mx-auto px-4 pt-4">
        <ProgressSteps steps={stepLabels} currentStep={currentStepIndex} />
      </div>

      <div className="max-w-lg mx-auto px-4 py-6">
        <AnimatePresence mode="wait">
          {/* Step 1: Select Incident Type */}
          {step === 'type' && (
            <motion.div
              key="type"
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-safety-red/10 rounded-full mb-4">
                  <AlertTriangle className="w-8 h-8 text-safety-red" />
                </div>
                <h2 className="text-2xl font-bold text-foreground mb-2">
                  What&apos;s happening?
                </h2>
                <p className="text-muted-foreground">
                  Select the type of incident you&apos;re reporting
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-6">
                {INCIDENT_TYPES.map((incident) => {
                  const isSelected = selectedType === incident.type
                  const isHighRisk = ['robbery', 'kidnapping', 'gunshots', 'attack'].includes(incident.type)
                  const isWarning = ['fire', 'accident', 'checkpoint'].includes(incident.type)

                  return (
                    <motion.button
                      key={incident.type}
                      onClick={() => setSelectedType(incident.type)}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className={`p-4 rounded-2xl border-2 text-left transition-all ${
                        isSelected
                          ? isHighRisk
                            ? 'border-safety-red bg-safety-red/10'
                            : isWarning
                              ? 'border-safety-amber bg-safety-amber/10'
                              : 'border-primary bg-primary/10'
                          : 'border-border bg-background-elevated hover:border-border-hover'
                      }`}
                    >
                      <span className="text-3xl">{incident.icon}</span>
                      <div className="font-semibold text-foreground mt-2">{incident.label}</div>
                      {isHighRisk && (
                        <span className="text-xs text-safety-red">High priority</span>
                      )}
                    </motion.button>
                  )
                })}
              </div>

              <Button
                onClick={goNext}
                disabled={!selectedType}
                size="lg"
                className="w-full btn-primary"
              >
                Continue
                <ChevronRight className="w-5 h-5 ml-2" />
              </Button>
            </motion.div>
          )}

          {/* Step 2: Location Verification */}
          {step === 'location' && (
            <motion.div
              key="location"
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
                  Confirm location
                </h2>
                <p className="text-muted-foreground">
                  Is this where the incident is happening?
                </p>
              </div>

              {locationLoading ? (
                <div className="bg-background-elevated rounded-2xl p-8 text-center mb-6">
                  <Loader2 className="w-12 h-12 mx-auto mb-4 text-primary animate-spin" />
                  <h3 className="font-semibold text-foreground mb-2">Getting your location</h3>
                  <p className="text-sm text-muted-foreground">
                    This helps verify the incident is real
                  </p>
                </div>
              ) : locationResult?.success ? (
                <div className="bg-background-elevated rounded-2xl p-4 mb-6">
                  {/* Map Placeholder */}
                  <div className="bg-muted rounded-xl h-40 mb-4 flex items-center justify-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-primary/20" />
                    <div className="relative z-10 text-center">
                      <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center mx-auto mb-2 shadow-lg animate-pulse">
                        <Navigation className="w-4 h-4 text-primary-foreground" />
                      </div>
                      <span className="text-sm text-muted-foreground">Map preview</span>
                    </div>
                  </div>

                  {/* Location Info */}
                  <div className="flex items-center gap-3 p-3 bg-safety-green/10 rounded-xl">
                    <CheckCircle2 className="w-6 h-6 text-safety-green flex-shrink-0" />
                    <div className="flex-1">
                      <p className="font-semibold text-foreground">
                        {locationResult.area?.name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {locationResult.area?.state}
                      </p>
                    </div>
                    <button
                      onClick={() => setAdjustingLocation(true)}
                      className="p-2 hover:bg-muted rounded-lg transition-colors"
                    >
                      <Edit2 className="w-4 h-4 text-muted-foreground" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-background-elevated rounded-2xl p-6 text-center mb-6">
                  <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-safety-amber" />
                  <h3 className="font-semibold text-foreground mb-2">Location required</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {locationResult?.error || 'We need your location to verify the incident'}
                  </p>
                  <Button onClick={fetchLocation} variant="secondary">
                    <Navigation className="w-4 h-4 mr-2" />
                    Try Again
                  </Button>
                </div>
              )}

              {/* Privacy Note */}
              <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-xl mb-6">
                <Lock className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                <p className="text-sm text-muted-foreground">
                  Your exact location is never shared. Others will see the general area only.
                </p>
              </div>

              <div className="flex gap-3">
                <Button variant="secondary" onClick={goBack}>
                  <ChevronLeft className="w-5 h-5" />
                </Button>
                <Button
                  onClick={goNext}
                  disabled={!locationResult?.success}
                  className="flex-1 btn-primary"
                >
                  Yes, this is correct
                  <ChevronRight className="w-5 h-5 ml-2" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 3: Add Details */}
          {step === 'details' && (
            <motion.div
              key="details"
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-safety-amber/10 rounded-full mb-4">
                  <Edit2 className="w-8 h-8 text-safety-amber" />
                </div>
                <h2 className="text-2xl font-bold text-foreground mb-2">
                  Help others understand
                </h2>
                <p className="text-muted-foreground">
                  Add details to help your community stay safe
                </p>
              </div>

              <div className="space-y-4 mb-6">
                <Input
                  label="Landmark"
                  placeholder="e.g., Near Shoprite, opposite UBA bank"
                  value={landmark}
                  onChange={(e) => setLandmark(e.target.value)}
                  hint="Where exactly is this happening?"
                />

                <Textarea
                  label="Description"
                  placeholder="What's happening? Any other details that could help..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  maxLength={500}
                />

                {/* Photo Upload */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Photo (optional)
                  </label>

                  {/* Hidden file input */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
                    capture="environment"
                    onChange={handleImageSelect}
                    className="hidden"
                  />

                  {imagePreview ? (
                    // Image preview
                    <div className="relative rounded-2xl overflow-hidden bg-muted">
                      <div className="relative aspect-video">
                        <Image
                          src={imagePreview}
                          alt="Photo preview"
                          fill
                          className="object-cover"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleRemoveImage}
                        className="absolute top-2 right-2 p-2 bg-black/50 hover:bg-black/70 rounded-full transition-colors"
                      >
                        <Trash2 className="w-4 h-4 text-white" />
                      </button>
                      {uploadingImage && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                          <div className="text-center text-white">
                            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                            <p className="text-sm">Uploading...</p>
                          </div>
                        </div>
                      )}
                      {uploadedImageUrl && (
                        <div className="absolute bottom-2 left-2 px-2 py-1 bg-safety-green/90 rounded-full text-xs text-white flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Uploaded
                        </div>
                      )}
                    </div>
                  ) : (
                    // Upload button
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full border-2 border-dashed border-border rounded-2xl p-6 text-center hover:border-border-hover hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex justify-center gap-4 mb-3">
                        <div className="w-12 h-12 bg-muted rounded-xl flex items-center justify-center">
                          <Camera className="w-6 h-6 text-muted-foreground" />
                        </div>
                        <div className="w-12 h-12 bg-muted rounded-xl flex items-center justify-center">
                          <ImageIcon className="w-6 h-6 text-muted-foreground" />
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Tap to add a photo (helps verify reports)
                      </p>
                    </button>
                  )}

                  {/* Image error message */}
                  {imageError && (
                    <p className="mt-2 text-sm text-safety-red">{imageError}</p>
                  )}
                </div>
              </div>

              <div className="flex gap-3">
                <Button variant="secondary" onClick={goBack}>
                  <ChevronLeft className="w-5 h-5" />
                </Button>
                <Button onClick={goNext} className="flex-1 btn-primary">
                  Review Report
                  <ChevronRight className="w-5 h-5 ml-2" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 4: Review & Confirm */}
          {step === 'review' && (
            <motion.div
              key="review"
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-4">
                  <CheckCircle2 className="w-8 h-8 text-primary" />
                </div>
                <h2 className="text-2xl font-bold text-foreground mb-2">
                  Review your report
                </h2>
                <p className="text-muted-foreground">
                  Make sure everything is correct before submitting
                </p>
              </div>

              {/* Report Summary Card */}
              <div className="bg-background-elevated rounded-2xl p-4 mb-6 border border-border">
                {/* Incident Type */}
                <div className="flex items-center gap-3 pb-4 border-b border-border">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    ['robbery', 'kidnapping', 'gunshots', 'attack'].includes(selectedType || '')
                      ? 'bg-safety-red/10'
                      : ['fire', 'accident', 'checkpoint'].includes(selectedType || '')
                        ? 'bg-safety-amber/10'
                        : 'bg-primary/10'
                  }`}>
                    <span className="text-2xl">
                      {INCIDENT_TYPES.find((i) => i.type === selectedType)?.icon}
                    </span>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground">
                      {INCIDENT_TYPES.find((i) => i.type === selectedType)?.label}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {locationResult?.area?.name}, {locationResult?.area?.state}
                    </p>
                  </div>
                  <button
                    onClick={() => setStep('type')}
                    className="p-2 hover:bg-muted rounded-lg transition-colors"
                  >
                    <Edit2 className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>

                {/* Landmark */}
                {landmark && (
                  <div className="py-4 border-b border-border">
                    <p className="text-sm text-muted-foreground mb-1">Landmark</p>
                    <p className="text-foreground">{landmark}</p>
                  </div>
                )}

                {/* Description */}
                {description && (
                  <div className="py-4 border-b border-border">
                    <p className="text-sm text-muted-foreground mb-1">Description</p>
                    <p className="text-foreground">{description}</p>
                  </div>
                )}

                {/* Photo */}
                {imagePreview && (
                  <div className="py-4 border-b border-border">
                    <p className="text-sm text-muted-foreground mb-2">Photo</p>
                    <div className="relative rounded-xl overflow-hidden aspect-video">
                      <Image
                        src={imagePreview}
                        alt="Report photo"
                        fill
                        className="object-cover"
                      />
                    </div>
                  </div>
                )}

                {/* Privacy Note */}
                <div className="pt-4 flex items-center gap-2 text-sm text-muted-foreground">
                  <Lock className="w-4 h-4" />
                  <span>Your name won&apos;t be shown to others</span>
                </div>
              </div>

              {/* What Happens Next */}
              <div className="bg-muted/50 rounded-xl p-4 mb-6">
                <h4 className="font-medium text-foreground mb-3">What happens next?</h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-safety-green" />
                    Your report goes live immediately
                  </li>
                  <li className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-safety-amber" />
                    Nearby users will be notified
                  </li>
                  <li className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-primary" />
                    Community members can confirm
                  </li>
                </ul>
              </div>

              {submitError && (
                <div className="bg-safety-red/10 border border-safety-red/20 text-safety-red px-4 py-3 rounded-xl mb-4">
                  {submitError}
                </div>
              )}

              <div className="flex gap-3">
                <Button variant="secondary" onClick={goBack}>
                  <ChevronLeft className="w-5 h-5" />
                </Button>
                <Button
                  onClick={submitReport}
                  disabled={submitting}
                  size="lg"
                  className="flex-1 btn-primary"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      Submit Report
                      <ChevronRight className="w-5 h-5 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 5: Success */}
          {step === 'success' && (
            <motion.div
              key="success"
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="text-center"
            >
              {/* Celebration Effect */}
              {showCelebration && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200 }}
                  className="mb-6"
                >
                  <div className="relative inline-block">
                    <motion.div
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
                      className="w-24 h-24 bg-safety-green/10 rounded-full flex items-center justify-center"
                    >
                      <Sparkles className="w-12 h-12 text-safety-green" />
                    </motion.div>
                  </div>
                </motion.div>
              )}

              <motion.h2
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-2xl font-bold text-foreground mb-2"
              >
                Thank you!
              </motion.h2>

              <motion.p
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-muted-foreground mb-6"
              >
                Your report is helping keep {locationResult?.area?.name} safe
              </motion.p>

              {/* Impact Stats */}
              <motion.div
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="bg-background-elevated rounded-2xl p-4 mb-6"
              >
                <div className="flex items-center justify-center gap-2 text-muted-foreground mb-4">
                  <Users className="w-5 h-5" />
                  <span>
                    <span className="font-semibold text-foreground">234</span> people in this area will be notified
                  </span>
                </div>

                <div className="flex gap-4 justify-center">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-foreground">5</div>
                    <div className="text-xs text-muted-foreground">Reports today</div>
                  </div>
                  <div className="w-px bg-border" />
                  <div className="text-center">
                    <div className="text-2xl font-bold text-foreground">12</div>
                    <div className="text-xs text-muted-foreground">Confirmations</div>
                  </div>
                  <div className="w-px bg-border" />
                  <div className="text-center">
                    <div className="text-2xl font-bold text-safety-green">Safe</div>
                    <div className="text-xs text-muted-foreground">Community</div>
                  </div>
                </div>
              </motion.div>

              {/* Actions */}
              <motion.div
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="space-y-3"
              >
                <Button
                  onClick={() => router.push('/app')}
                  size="lg"
                  className="w-full btn-primary"
                >
                  Back to Feed
                </Button>

                <button
                  onClick={() => shareToWhatsApp({
                    id: 'new',
                    incident_type: selectedType || 'other',
                    area_name: locationResult?.area?.name || '',
                    state: locationResult?.area?.state || '',
                    landmark: landmark || undefined,
                    description: description || undefined,
                  } as any)}
                  className="flex items-center justify-center gap-2 w-full py-3 btn-whatsapp rounded-xl font-medium"
                >
                  <MessageCircle className="w-5 h-5" />
                  Share on WhatsApp
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
