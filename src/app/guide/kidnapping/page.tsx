'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ChevronRight,
  ChevronDown,
  Shield,
  Users,
  Clock,
  Phone,
  AlertTriangle,
  MessageCircle,
  Twitter,
  Copy,
  ArrowLeft,
  CheckCircle,
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

const sections = [
  {
    id: 'victim',
    title: 'For the Victim',
    icon: Shield,
    color: 'text-accent',
    bgColor: 'bg-accent/10',
    content: [
      { title: 'Stay Calm', description: 'Your survival depends on keeping a clear head. Panic can lead to poor decisions.' },
      { title: 'Do Not Resist', description: 'Especially in the initial moments. Resistance can provoke violence.' },
      { title: 'Observe Your Surroundings', description: 'Note any details - sounds, smells, time of travel, voices. This can help later.' },
      { title: 'Build Rapport If Safe', description: 'Humanize yourself to your captors without being confrontational.' },
      { title: 'Stay Healthy', description: 'Eat and drink what is given. You need strength for eventual rescue or release.' },
      { title: 'Comply With Reasonable Requests', description: 'Follow instructions but set boundaries against abuse.' },
      { title: 'Signal If Possible', description: 'If you see an opportunity to signal for help safely, take it carefully.' },
      { title: 'Maintain Hope', description: 'Most kidnappings in Nigeria end with release. Stay mentally strong.' },
    ],
  },
  {
    id: 'family',
    title: 'For the Family',
    icon: Users,
    color: 'text-risk-moderate',
    bgColor: 'bg-risk-moderate-bg',
    content: [
      { title: 'Report Immediately', description: 'Contact the police and DSS as soon as you are certain of abduction.' },
      { title: 'Gather Information', description: 'When was the person last seen? Where? Who were they with? What were they wearing?' },
      { title: 'Preserve Evidence', description: 'Do not tamper with the scene. Save all communications from kidnappers.' },
      { title: 'Designate a Family Spokesperson', description: 'One person should handle all communications to avoid confusion.' },
      { title: 'Document Everything', description: 'Keep records of all contacts, demands, and actions taken.' },
      { title: 'Do Not Share on Social Media', description: 'Public attention can complicate negotiations and endanger the victim.' },
      { title: 'Seek Professional Help', description: 'Consider engaging a professional negotiator if ransom is demanded.' },
      { title: 'Stay United', description: 'Family disagreements can be exploited by kidnappers.' },
    ],
  },
  {
    id: 'first24',
    title: 'First 24 Hours',
    icon: Clock,
    color: 'text-risk-high',
    bgColor: 'bg-risk-high-bg',
    content: [
      { title: 'Hour 1-2: Confirm Abduction', description: 'Verify the person is actually missing and not just unreachable.' },
      { title: 'Hour 2-4: Report to Authorities', description: 'File a report with police. Provide photos and last known location.' },
      { title: 'Hour 4-8: Secure Communications', description: 'Prepare to receive calls from kidnappers. Record all calls if possible.' },
      { title: 'Hour 8-12: Gather Resources', description: 'Assess your financial situation. Do not agree to any amount immediately.' },
      { title: 'Hour 12-24: Wait for Contact', description: 'Kidnappers usually make contact within 24 hours. Stay patient.' },
      { title: 'Throughout: Stay Calm', description: 'Panic leads to poor decisions. Take time before responding to demands.' },
    ],
  },
  {
    id: 'contacts',
    title: 'Important Contacts',
    icon: Phone,
    color: 'text-risk-extreme',
    bgColor: 'bg-risk-extreme-bg',
    content: [
      { title: 'National Emergency', description: '112 - Available 24/7' },
      { title: 'Nigeria Police Force', description: '199 - Report kidnapping immediately' },
      { title: 'DSS (State Security)', description: '09-6710012 - For intelligence support' },
      { title: 'NAPTIP', description: '08001230000 - Human trafficking cases' },
      { title: 'Your State Police Command', description: 'Find the number at alerts.thinknodes.com/emergency' },
    ],
  },
]

export default function KidnappingGuidePage() {
  const [openSection, setOpenSection] = useState<string | null>('victim')
  const [copied, setCopied] = useState(false)

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="min-h-screen pb-20">
      {/* Breadcrumb */}
      <div className="bg-muted/50 border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <nav className="flex items-center gap-2 text-sm">
            <Link href="/" className="text-muted-foreground hover:text-foreground transition-colors">
              Home
            </Link>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
            <Link href="/emergency" className="text-muted-foreground hover:text-foreground transition-colors">
              Emergency
            </Link>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
            <span className="font-medium">Kidnapping Guide</span>
          </nav>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Back Link */}
          <motion.div variants={itemVariants} className="mb-6">
            <Link 
              href="/emergency"
              className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Emergency
            </Link>
          </motion.div>

          {/* Header */}
          <motion.div variants={itemVariants} className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold mb-4">
              What To Do If Someone Is Kidnapped
            </h1>
            <p className="text-lg text-muted-foreground">
              A comprehensive guide for victims and their families
            </p>
          </motion.div>

          {/* Callout */}
          <motion.div variants={itemVariants} className="mb-8">
            <Card hover={false} className="p-6 border-l-4 border-l-risk-moderate bg-risk-moderate-bg/50">
              <div className="flex items-start gap-4">
                <Heart className="w-6 h-6 text-risk-moderate flex-shrink-0" />
                <div>
                  <p className="font-medium text-foreground">
                    Most kidnappings in Nigeria end with release.
                  </p>
                  <p className="text-muted-foreground mt-1">
                    Stay calm and follow these steps to maximize the chances of a safe return.
                  </p>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Accordion Sections */}
          <motion.div variants={itemVariants} className="space-y-4 mb-12">
            {sections.map((section) => {
              const Icon = section.icon
              const isOpen = openSection === section.id
              
              return (
                <Card key={section.id} hover={false} className="overflow-hidden">
                  <button
                    onClick={() => setOpenSection(isOpen ? null : section.id)}
                    className="w-full p-6 flex items-center justify-between hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full ${section.bgColor} flex items-center justify-center`}>
                        <Icon className={`w-5 h-5 ${section.color}`} />
                      </div>
                      <h2 className="text-lg font-semibold text-left">{section.title}</h2>
                    </div>
                    <motion.div
                      animate={{ rotate: isOpen ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <ChevronDown className="w-5 h-5 text-muted-foreground" />
                    </motion.div>
                  </button>
                  
                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden"
                      >
                        <div className="px-6 pb-6 space-y-4">
                          {section.content.map((item, index) => (
                            <motion.div
                              key={index}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: index * 0.05 }}
                              className="flex items-start gap-3"
                            >
                              <CheckCircle className={`w-5 h-5 ${section.color} flex-shrink-0 mt-0.5`} />
                              <div>
                                <p className="font-medium">{item.title}</p>
                                <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Card>
              )
            })}
          </motion.div>

          {/* Share Section */}
          <motion.section variants={itemVariants}>
            <Card hover={false} className="p-6 text-center">
              <AlertTriangle className="w-8 h-8 text-risk-high mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-2">Share this guide - it could save a life</h3>
              <p className="text-muted-foreground mb-6">
                Help spread awareness about what to do in kidnapping situations
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                <Button
                  variant="secondary"
                  className="gap-2"
                  onClick={() => window.open(`https://wa.me/?text=What%20To%20Do%20If%20Someone%20Is%20Kidnapped%20-%20Important%20Guide:%20${window.location.href}`, '_blank')}
                >
                  <MessageCircle className="w-4 h-4" />
                  WhatsApp
                </Button>
                <Button
                  variant="secondary"
                  className="gap-2"
                  onClick={() => window.open(`https://twitter.com/intent/tweet?text=What%20To%20Do%20If%20Someone%20Is%20Kidnapped%20-%20Important%20Guide&url=${window.location.href}`, '_blank')}
                >
                  <Twitter className="w-4 h-4" />
                  Twitter
                </Button>
                <Button
                  variant="secondary"
                  className="gap-2"
                  onClick={handleCopyLink}
                >
                  <Copy className="w-4 h-4" />
                  {copied ? 'Copied!' : 'Copy Link'}
                </Button>
              </div>
            </Card>
          </motion.section>
        </motion.div>
      </div>
    </div>
  )
}


