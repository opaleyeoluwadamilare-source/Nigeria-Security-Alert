'use client'

import { motion } from 'framer-motion'
import { 
  CheckCircle,
  Users,
  Bell,
  Smartphone,
  TrendingUp,
  Shield,
  MapPin,
  Route,
  Phone,
  Eye
} from 'lucide-react'
import { Card } from '@/components/ui/Card'

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
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

const phases = [
  {
    phase: 1,
    title: 'Live Now',
    status: 'live' as const,
    badgeColor: 'bg-risk-moderate text-white',
    icon: Shield,
    features: [
      'Check safety status of any area in Nigeria',
      'See recent incidents in specific communities',
      'Check route safety before you travel',
      'Find emergency contacts for any state',
      'Share safety information with loved ones',
    ],
  },
  {
    phase: 2,
    title: 'Community Reporting',
    status: 'coming_soon' as const,
    badgeColor: 'bg-accent text-white',
    icon: Users,
    features: [
      'Report what you see in your area',
      'Help keep your community informed',
      'Verified reports shared faster',
    ],
  },
  {
    phase: 3,
    title: 'Personal Alerts',
    status: 'planned' as const,
    badgeColor: 'bg-muted text-muted-foreground',
    icon: Bell,
    features: [
      'Save locations that matter to you',
      'Get notified when something happens nearby',
      'Weekly safety updates for your areas',
    ],
  },
  {
    phase: 4,
    title: 'SMS Alerts',
    status: 'planned' as const,
    badgeColor: 'bg-muted text-muted-foreground',
    icon: Smartphone,
    features: [
      'Receive alerts without internet',
      'Works on any phone',
      'Stay informed even in low-connectivity areas',
    ],
  },
  {
    phase: 5,
    title: 'Early Warning',
    status: 'future' as const,
    badgeColor: 'bg-muted/50 text-muted-foreground',
    icon: TrendingUp,
    features: [
      'Know when risk is rising in your area',
      'Safer travel time recommendations',
      'Pattern-based alerts before incidents happen',
    ],
  },
]

export default function RoadmapPage() {
  return (
    <div className="min-h-screen pb-20 w-full overflow-x-hidden">
      {/* Hero */}
      <div className="bg-muted/50 border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 md:py-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-3xl"
          >
            <div className="flex items-center gap-3 mb-4 sm:mb-6">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-primary rounded-xl flex items-center justify-center">
                <Shield className="w-6 h-6 sm:w-7 sm:h-7 text-primary-foreground" />
              </div>
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-4 sm:mb-6 px-2 sm:px-0 leading-tight">
              What We&apos;re Building
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-muted-foreground px-4 sm:px-0 leading-relaxed">
              See what&apos;s available now and what&apos;s coming next to help keep you and your loved ones safe.
            </p>
          </motion.div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-8"
        >
          {phases.map((phase) => {
            const Icon = phase.icon
            const statusLabels = {
              live: 'LIVE NOW',
              coming_soon: 'COMING SOON',
              planned: 'PLANNED',
              future: 'FUTURE',
            }

            return (
              <motion.div
                key={phase.phase}
                variants={itemVariants}
              >
                <Card 
                  hover={phase.status === 'live'}
                  className={`p-6 md:p-8 ${
                    phase.status === 'live' 
                      ? 'border-2 border-risk-moderate/30 bg-risk-moderate-bg/30' 
                      : phase.status === 'coming_soon'
                      ? 'border-2 border-accent/30 bg-accent/5'
                      : 'border border-border'
                  }`}
                >
                  <div className="flex items-start gap-6">
                    {/* Icon */}
                    <div className={`
                      w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0
                      ${phase.status === 'live' ? 'bg-risk-moderate text-white' :
                        phase.status === 'coming_soon' ? 'bg-accent text-white' :
                        'bg-muted text-muted-foreground'}
                    `}>
                      <Icon className="w-7 h-7" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-3 sm:mb-4 flex-wrap gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs sm:text-sm text-muted-foreground mb-1">Phase {phase.phase}</p>
                          <h3 className="text-lg sm:text-xl md:text-2xl font-bold leading-tight">{phase.title}</h3>
                        </div>
                        <span className={`px-4 py-1.5 rounded-full text-xs font-semibold ${phase.badgeColor}`}>
                          {statusLabels[phase.status]}
                        </span>
                      </div>

                      <ul className="space-y-3">
                        {phase.features.map((feature, i) => (
                          <li key={i} className="flex items-start gap-3">
                            <CheckCircle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                              phase.status === 'live' 
                                ? 'text-risk-moderate' 
                                : phase.status === 'coming_soon'
                                ? 'text-accent'
                                : 'text-muted-foreground'
                            }`} />
                            <span className={phase.status === 'planned' || phase.status === 'future' ? 'text-muted-foreground' : 'text-foreground'}>
                              {feature}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </Card>
              </motion.div>
            )
          })}
        </motion.div>
      </div>
    </div>
  )
}
