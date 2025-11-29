'use client'

import { useParams } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { 
  ChevronRight, 
  MapPin, 
  Phone,
  MessageCircle,
  Twitter,
  Copy,
  Shield,
  ArrowLeft,
  CheckCircle,
  AlertTriangle,
  Train
} from 'lucide-react'
import { useData } from '@/hooks/useData'
import { RiskBadge } from '@/components/ui/RiskBadge'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { useState } from 'react'

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] }
  },
}

export default function RoadDetailPage() {
  const params = useParams()
  const slug = params.slug as string
  const { roads, states, loading } = useData()
  const roadData = roads.find(r => r.slug === slug)
  const [copied, setCopied] = useState(false)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (!roadData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Road Not Found</h1>
          <Link href="/roads">
            <Button>View All Roads</Button>
          </Link>
        </div>
      </div>
    )
  }

  // Get emergency contacts for states on this route
  const routeStates = states.filter(state => 
    roadData.states.some(s => s.toLowerCase().includes(state.name.toLowerCase()))
  )

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Safety tips based on risk level
  const safetyTips = [
    'Travel only during daylight hours (7AM - 4PM)',
    'Travel in convoy with other vehicles if possible',
    'Share your trip details with family before departure',
    'Keep emergency numbers saved and easily accessible',
    'Avoid stopping in isolated areas',
    'Keep your phone charged and data/airtime available',
  ]

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <div className={`border-b ${
        roadData.riskLevel === 'EXTREME' ? 'bg-risk-extreme-bg' :
        roadData.riskLevel === 'VERY HIGH' ? 'bg-risk-very-high-bg' :
        roadData.riskLevel === 'HIGH' ? 'bg-risk-high-bg' :
        'bg-risk-moderate-bg'
      }`}>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Link 
            href="/roads"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            All Roads
          </Link>
          
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <MapPin className="w-4 h-4" />
            {roadData.states.join(' → ')}
          </div>
          
          <h1 className="text-2xl md:text-3xl font-bold mb-3">
            {roadData.name}
            {roadData.alias && (
              <span className="text-lg font-normal text-muted-foreground ml-2">
                &ldquo;{roadData.alias}&rdquo;
              </span>
            )}
          </h1>
          
          <RiskBadge level={roadData.riskLevel} size="lg" />
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-6"
        >
          {/* Description */}
          <motion.div variants={itemVariants}>
            <Card hover={false} className="p-5">
              <div className="flex items-start gap-3">
                <AlertTriangle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                  roadData.riskLevel === 'EXTREME' ? 'text-risk-extreme' :
                  roadData.riskLevel === 'VERY HIGH' ? 'text-risk-very-high' :
                  roadData.riskLevel === 'HIGH' ? 'text-risk-high' :
                  'text-risk-moderate'
                }`} />
                <div>
                  <h2 className="font-bold mb-2">Road Assessment</h2>
                  <p className="text-muted-foreground">{roadData.description}</p>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Danger Zones */}
          {roadData.dangerZones.length > 0 && (
            <motion.div variants={itemVariants}>
              <h2 className="font-bold mb-3 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-risk-extreme" />
                Danger Zones
              </h2>
              <div className="space-y-2">
                {roadData.dangerZones.map((zone, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex items-center gap-3 p-3 bg-risk-extreme-bg rounded-lg border border-risk-extreme/20"
                  >
                    <div className="w-2 h-2 rounded-full bg-risk-extreme" />
                    <span className="font-medium">{zone}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Safer Alternative */}
          {roadData.alternative && (
            <motion.div variants={itemVariants}>
              <h2 className="font-bold mb-3 flex items-center gap-2">
                <Shield className="w-5 h-5 text-risk-moderate" />
                Safer Alternative
              </h2>
              <Card hover={false} className="p-5 bg-risk-moderate-bg/50 border-risk-moderate/20">
                <div className="flex items-start gap-3">
                  {roadData.alternative.toLowerCase().includes('train') || 
                   roadData.alternative.toLowerCase().includes('railway') ? (
                    <Train className="w-5 h-5 text-risk-moderate flex-shrink-0 mt-0.5" />
                  ) : (
                    <CheckCircle className="w-5 h-5 text-risk-moderate flex-shrink-0 mt-0.5" />
                  )}
                  <p className="font-medium">{roadData.alternative}</p>
                </div>
              </Card>
            </motion.div>
          )}

          {/* Emergency Contacts */}
          <motion.div variants={itemVariants}>
            <Card hover={false} className="p-5 border-2 border-risk-extreme">
              <div className="flex items-center gap-2 mb-4">
                <Phone className="w-5 h-5 text-risk-extreme" />
                <h2 className="font-bold">Emergency Contacts</h2>
              </div>
              
              <div className="grid grid-cols-2 gap-3 mb-4">
                <a href="tel:112" className="p-3 bg-risk-extreme-bg rounded-xl text-center hover:bg-risk-extreme/20 transition-colors active:scale-95">
                  <p className="text-xl font-bold font-mono text-risk-extreme">112</p>
                  <p className="text-xs text-muted-foreground">Emergency</p>
                </a>
                <a href="tel:122" className="p-3 bg-muted rounded-xl text-center hover:bg-muted/80 transition-colors active:scale-95">
                  <p className="text-xl font-bold font-mono">122</p>
                  <p className="text-xs text-muted-foreground">FRSC</p>
                </a>
              </div>

              {routeStates.length > 0 && routeStates[0].emergencyContacts?.police && (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">{routeStates[0].name} Police</p>
                  {routeStates[0].emergencyContacts.police.map((number, index) => (
                    <a
                      key={index}
                      href={`tel:${number}`}
                      className="flex items-center justify-between p-3 bg-muted rounded-lg hover:bg-muted/80 transition-colors active:scale-[0.98]"
                    >
                      <span className="font-mono font-medium">{number}</span>
                      <Phone className="w-4 h-4 text-muted-foreground" />
                    </a>
                  ))}
                </div>
              )}
            </Card>
          </motion.div>

          {/* Safety Tips */}
          <motion.div variants={itemVariants}>
            <h2 className="font-bold mb-3">If You Must Travel</h2>
            <Card hover={false} className="p-5">
              <ul className="space-y-3">
                {safetyTips.map((tip, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm">
                    <CheckCircle className="w-4 h-4 text-risk-moderate flex-shrink-0 mt-0.5" />
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </Card>
          </motion.div>

          {/* Share */}
          <motion.div variants={itemVariants}>
            <Card hover={false} className="p-4">
              <p className="text-sm text-muted-foreground mb-3">Share this road assessment</p>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  className="gap-2"
                  onClick={() => window.open(`https://wa.me/?text=Check%20the%20safety%20of%20${encodeURIComponent(roadData.name)}:%20${window.location.href}`, '_blank')}
                >
                  <MessageCircle className="w-4 h-4" />
                  WhatsApp
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  className="gap-2"
                  onClick={() => window.open(`https://twitter.com/intent/tweet?text=Check%20the%20safety%20of%20${encodeURIComponent(roadData.name)}&url=${window.location.href}`, '_blank')}
                >
                  <Twitter className="w-4 h-4" />
                  Twitter
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  className="gap-2"
                  onClick={handleCopyLink}
                >
                  <Copy className="w-4 h-4" />
                  {copied ? 'Copied!' : 'Copy'}
                </Button>
              </div>
            </Card>
          </motion.div>
        </motion.div>
      </div>
    </div>
  )
}
