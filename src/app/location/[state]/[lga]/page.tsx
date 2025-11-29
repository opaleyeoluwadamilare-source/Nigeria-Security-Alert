'use client'

import { useParams } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { 
  MapPin, 
  AlertTriangle, 
  Users,
  Phone,
  MessageCircle,
  Twitter,
  Copy,
  ArrowLeft,
  Calendar
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

export default function LGAPage() {
  const params = useParams()
  const stateId = params.state as string
  const lgaId = params.lga as string
  const { states, lgas, incidents: allIncidents, loading } = useData()
  const stateData = states.find(s => s.id === stateId)
  const lga = lgas.find(l => l.id === lgaId && l.stateId === stateId)
  const incidents = allIncidents.filter(inc => inc.lgaSlug === lgaId)
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

  if (!stateData || !lga) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Location Not Found</h1>
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

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <div className={`border-b ${
        lga.riskLevel === 'EXTREME' ? 'bg-risk-extreme-bg' :
        lga.riskLevel === 'VERY HIGH' ? 'bg-risk-very-high-bg' :
        lga.riskLevel === 'HIGH' ? 'bg-risk-high-bg' :
        'bg-risk-moderate-bg'
      }`}>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Link 
            href={`/location/${stateId}`}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to {stateData.name}
          </Link>
          
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <MapPin className="w-4 h-4" />
            {stateData.name}, {stateData.region} • LGA
          </div>
          
          <h1 className="text-2xl md:text-3xl font-bold mb-3">{lga.name}</h1>
          
          <RiskBadge level={lga.riskLevel} size="lg" />
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
                  lga.riskLevel === 'EXTREME' ? 'text-risk-extreme' :
                  lga.riskLevel === 'VERY HIGH' ? 'text-risk-very-high' :
                  lga.riskLevel === 'HIGH' ? 'text-risk-high' :
                  'text-risk-moderate'
                }`} />
                <div>
                  <h2 className="font-bold mb-2">What&apos;s Happening Here</h2>
                  <p className="text-muted-foreground">{lga.description}</p>
                  <p className="text-sm mt-3">
                    <span className="font-medium">Incidents in 2025:</span>{' '}
                    <span className="font-mono">{lga.incidents}</span>
                  </p>
                </div>
              </div>
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

          {/* Recent Incidents */}
          <motion.div variants={itemVariants}>
            <h2 className="font-bold mb-3 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-muted-foreground" />
              Recent Incidents in {lga.name}
            </h2>
            
            {incidents.length > 0 ? (
              <div className="space-y-3">
                {incidents.map((incident, index) => (
                  <motion.div
                    key={incident.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="border-l-2 border-risk-extreme pl-4 py-3"
                  >
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                      <span className="font-medium">
                        {new Date(incident.date).toLocaleDateString('en-NG', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                      {incident.casualties > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-risk-extreme-bg text-risk-extreme text-xs font-medium rounded">
                          <Users className="w-3 h-3" />
                          {incident.casualties} casualties
                        </span>
                      )}
                    </div>
                    <p>{incident.description}</p>
                    {incident.source && (
                      <p className="text-xs text-muted-foreground mt-1">Source: {incident.source}</p>
                    )}
                  </motion.div>
                ))}
              </div>
            ) : (
              <Card hover={false} className="p-5 text-center">
                <p className="text-muted-foreground">
                  No specific incidents recorded in our database yet.
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  This does not mean the area is safe. Always exercise caution.
                </p>
              </Card>
            )}
          </motion.div>

          {/* Safety Advisory */}
          <motion.div variants={itemVariants}>
            <Card hover={false} className="p-5 bg-risk-high-bg/50">
              <h3 className="font-bold mb-3">Safety Advisory</h3>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <span className="text-risk-extreme">•</span>
                  <span>Avoid non-essential travel to this area</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-risk-very-high">•</span>
                  <span>If travel is essential, inform family and authorities</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-risk-high">•</span>
                  <span>Travel only during daylight hours</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-muted-foreground">•</span>
                  <span>Keep emergency numbers saved and accessible</span>
                </li>
              </ul>
            </Card>
          </motion.div>

          {/* Share */}
          <motion.div variants={itemVariants}>
            <Card hover={false} className="p-4">
              <p className="text-sm text-muted-foreground mb-3">Share this information</p>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  className="gap-2"
                  onClick={() => window.open(`https://wa.me/?text=Security%20alert%20for%20${lga.name},%20${stateData.name}:%20${window.location.href}`, '_blank')}
                >
                  <MessageCircle className="w-4 h-4" />
                  WhatsApp
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  className="gap-2"
                  onClick={() => window.open(`https://twitter.com/intent/tweet?text=Security%20alert%20for%20${lga.name},%20${stateData.name}&url=${window.location.href}`, '_blank')}
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

