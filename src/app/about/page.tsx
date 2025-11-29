'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { 
  Target,
  Database,
  Users,
  Mail,
  ExternalLink,
  Shield,
  Heart
} from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

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

export default function AboutPage() {
  return (
    <div className="min-h-screen pb-20">
      {/* Hero */}
      <div className="bg-muted/50 border-b border-border">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-2xl mb-4">
              <Shield className="w-8 h-8 text-primary-foreground" />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold mb-3">
              About Nigeria Security Alert
            </h1>
            <p className="text-muted-foreground">
              Free security intelligence for all Nigerians
            </p>
          </motion.div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-6"
        >
          {/* Mission */}
          <motion.div variants={itemVariants}>
            <Card hover={false} className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0">
                  <Target className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <h2 className="font-bold mb-2">Mission</h2>
                  <p className="text-muted-foreground">
                    Every Nigerian deserves to know if their route is safe before they travel. 
                    We aggregate verified security data to help you make informed decisions and 
                    stay safe. This is a not-for-profit public service.
                  </p>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Data Sources */}
          <motion.div variants={itemVariants}>
            <Card hover={false} className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-bold mb-2">Data Sources</h2>
                  <p className="text-muted-foreground mb-3">
                    We aggregate and verify data from multiple trusted sources:
                  </p>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2">
                      <ExternalLink className="w-4 h-4 text-muted-foreground" />
                      <span>ACLED - Armed Conflict Location & Event Data</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <ExternalLink className="w-4 h-4 text-muted-foreground" />
                      <span>Human Rights Watch</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <ExternalLink className="w-4 h-4 text-muted-foreground" />
                      <span>Amnesty International</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <ExternalLink className="w-4 h-4 text-muted-foreground" />
                      <span>Verified local news reports</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <ExternalLink className="w-4 h-4 text-muted-foreground" />
                      <span>Local community reps reporting (coming soon)</span>
                    </li>
                  </ul>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Team */}
          <motion.div variants={itemVariants}>
            <Card hover={false} className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-bold mb-2">Team</h2>
                  <div className="flex items-center gap-4 mb-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-accent to-primary flex items-center justify-center">
                      <span className="text-lg font-bold text-white">T</span>
                    </div>
                    <div>
                      <p className="font-medium">Thinknodes Innovation Lab</p>
                      <p className="text-sm text-muted-foreground">Founded by Akin</p>
                    </div>
                  </div>
                  <p className="text-muted-foreground text-sm">
                    A technology company building solutions for Africa&apos;s most pressing challenges.
                  </p>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Contact */}
          <motion.div variants={itemVariants}>
            <Card hover={false} className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-bold mb-2">Contact</h2>
                  <div className="space-y-2">
                    <a 
                      href="mailto:akin@thinknodes.com"
                      className="flex items-center gap-2 text-accent hover:underline"
                    >
                      <Mail className="w-4 h-4" />
                      akin@thinknodes.com
                    </a>
                    <a 
                      href="https://thinknodes.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-accent hover:underline"
                    >
                      <ExternalLink className="w-4 h-4" />
                      thinknodes.com
                    </a>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Support CTA */}
          <motion.div variants={itemVariants}>
            <Card hover={false} className="p-6 text-center bg-muted/50">
              <Heart className="w-10 h-10 text-risk-extreme mx-auto mb-3" />
              <h3 className="font-bold mb-2">Support This Project</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Help us keep this service free for all Nigerians
              </p>
              <Link href="/support">
                <Button className="gap-2">
                  <Heart className="w-4 h-4" />
                  Support Us
                </Button>
              </Link>
            </Card>
          </motion.div>
        </motion.div>
      </div>
    </div>
  )
}
