'use client'

import { useParams } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { 
  ChevronRight, 
  MapPin, 
  AlertTriangle, 
  Phone,
  MessageCircle,
  Twitter,
  Copy,
  ArrowLeft,
  Users
} from 'lucide-react'
import { useData } from '@/hooks/useData'
import { RiskBadge } from '@/components/ui/RiskBadge'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { AnimatedCounter } from '@/components/ui/AnimatedCounter'
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

export default function StatePage() {
  const params = useParams()
  const stateId = params.state as string
  const { states, loading } = useData()
  const stateData = states.find(s => s.id === stateId)
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

  if (!stateData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">State Not Found</h1>
          <Link href="/">
            <Button>Go Home</Button>
          </Link>
        </div>
      </div>
    )
  }

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Sort LGAs by risk level
  const sortedLGAs = stateData.lgas?.slice().sort((a, b) => {
    const riskOrder = { 'EXTREME': 0, 'VERY HIGH': 1, 'HIGH': 2, 'MODERATE': 3 }
    return riskOrder[a.riskLevel] - riskOrder[b.riskLevel]
  })

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <div className={`border-b ${
        stateData.riskLevel === 'EXTREME' ? 'bg-risk-extreme-bg' :
        stateData.riskLevel === 'VERY HIGH' ? 'bg-risk-very-high-bg' :
        stateData.riskLevel === 'HIGH' ? 'bg-risk-high-bg' :
        'bg-risk-moderate-bg'
      }`}>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Link 
            href="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Home
          </Link>
          
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <MapPin className="w-4 h-4" />
            {stateData.region} • State
          </div>
          
          <h1 className="text-2xl md:text-3xl font-bold mb-3">{stateData.name}</h1>
          
          <div className="flex items-center gap-3 flex-wrap">
            <RiskBadge level={stateData.riskLevel} size="lg" />
          </div>
          
          <p className="mt-3 text-muted-foreground">{stateData.riskDescription}</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-6"
        >
          {/* Key Stat */}
          <motion.div variants={itemVariants}>
            <Card hover={false} className="p-4 bg-muted/50">
              <p className="font-medium text-sm">
                <AlertTriangle className="w-4 h-4 inline mr-2 text-risk-extreme" />
                {stateData.keyStat}
              </p>
            </Card>
          </motion.div>

          {/* Stats */}
          <motion.div variants={itemVariants} className="grid grid-cols-3 gap-3">
            <Card hover={false} className="p-4 text-center">
              <div className="text-2xl font-bold font-mono text-risk-extreme">
                <AnimatedCounter value={stateData.deaths2025} />
              </div>
              <p className="text-xs text-muted-foreground">Deaths 2025</p>
            </Card>
            <Card hover={false} className="p-4 text-center">
              <div className="text-2xl font-bold font-mono text-risk-very-high">
                <AnimatedCounter value={stateData.incidents2025} />
              </div>
              <p className="text-xs text-muted-foreground">Incidents</p>
            </Card>
            <Card hover={false} className="p-4 text-center">
              <div className="text-2xl font-bold font-mono text-risk-high">
                <AnimatedCounter value={stateData.highRiskLGAs} />
              </div>
              <p className="text-xs text-muted-foreground">High-Risk LGAs</p>
            </Card>
          </motion.div>

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
                <a href="tel:199" className="p-3 bg-muted rounded-xl text-center hover:bg-muted/80 transition-colors active:scale-95">
                  <p className="text-xl font-bold font-mono">199</p>
                  <p className="text-xs text-muted-foreground">Police</p>
                </a>
              </div>

              {stateData.emergencyContacts?.police && (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">{stateData.name} Police</p>
                  {stateData.emergencyContacts.police.map((number, index) => (
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

          {/* Areas in State (LGAs) */}
          {sortedLGAs && sortedLGAs.length > 0 && (
            <motion.div variants={itemVariants}>
              <h2 className="font-bold mb-3 flex items-center gap-2">
                <Users className="w-5 h-5 text-muted-foreground" />
                Areas in {stateData.name} ({sortedLGAs.length} LGAs)
              </h2>
              <div className="space-y-2">
                {sortedLGAs.map((lga, index) => (
                  <motion.div
                    key={lga.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.03 }}
                  >
                    <Link href={`/location/${stateId}/${lga.id}`}>
                      <Card className="p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium">{lga.name}</span>
                              <RiskBadge level={lga.riskLevel} size="sm" />
                            </div>
                            <p className="text-sm text-muted-foreground truncate">{lga.description}</p>
                          </div>
                          <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                        </div>
                      </Card>
                    </Link>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Share */}
          <motion.div variants={itemVariants}>
            <Card hover={false} className="p-4">
              <p className="text-sm text-muted-foreground mb-3">Share this information</p>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  className="gap-2"
                  onClick={() => window.open(`https://wa.me/?text=Security%20alert%20for%20${stateData.name}:%20${window.location.href}`, '_blank')}
                >
                  <MessageCircle className="w-4 h-4" />
                  WhatsApp
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  className="gap-2"
                  onClick={() => window.open(`https://twitter.com/intent/tweet?text=Security%20alert%20for%20${stateData.name}&url=${window.location.href}`, '_blank')}
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
