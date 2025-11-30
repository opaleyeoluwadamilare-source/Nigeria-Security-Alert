'use client'

import { motion } from 'framer-motion'
import { 
  Heart,
  Users,
  Share2,
  MessageCircle,
  Twitter,
  Mail,
  Shield,
  Code,
  PenTool,
  Globe
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

const volunteerRoles = [
  { icon: Code, title: 'Developers', description: 'Help us build new features and improve the platform' },
  { icon: PenTool, title: 'Designers', description: 'Create graphics and improve user experience' },
  { icon: Globe, title: 'Translators', description: 'Help translate content to local languages' },
  { icon: Users, title: 'Researchers', description: 'Verify incidents and gather security data' },
]

export default function SupportPage() {
  const handleShare = (platform: 'whatsapp' | 'twitter') => {
    const url = 'https://alerts.thinknodes.com'
    const text = 'Check out Nigeria Security Alert - free security intelligence for all Nigerians'
    
    if (platform === 'whatsapp') {
      window.open(`https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`, '_blank')
    } else {
      window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank')
    }
  }

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
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-risk-extreme rounded-xl flex items-center justify-center">
                <Heart className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
              </div>
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-4 sm:mb-6 px-2 sm:px-0 leading-tight">
              Support This Project
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-muted-foreground px-4 sm:px-0 leading-relaxed">
              Help us keep Nigeria Security Alert free and available to everyone. 
              Every contribution makes a difference.
            </p>
          </motion.div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-8"
        >
          {/* Volunteer Card */}
          <motion.div variants={itemVariants}>
            <Card hover={false} className="p-8">
              <div className="flex items-start gap-6">
                <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center flex-shrink-0">
                  <Users className="w-8 h-8 text-accent" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-xl sm:text-2xl font-bold mb-2 sm:mb-3">Volunteer</h2>
                  <p className="text-sm sm:text-base text-muted-foreground mb-4 sm:mb-6 leading-relaxed">
                    We are looking for passionate individuals to help us expand 
                    our impact. Join our team of volunteers and make a difference.
                  </p>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                    {volunteerRoles.map((role) => {
                      const Icon = role.icon
                      return (
                        <div key={role.title} className="flex items-start gap-3 p-4 bg-muted rounded-xl">
                          <Icon className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="font-medium">{role.title}</p>
                            <p className="text-sm text-muted-foreground">{role.description}</p>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  <a href="mailto:akin@thinknodes.com">
                    <Button size="lg" variant="secondary" className="gap-2">
                      <Mail className="w-4 h-4" />
                      Contact Us to Volunteer
                    </Button>
                  </a>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Spread the Word Card */}
          <motion.div variants={itemVariants}>
            <Card hover={false} className="p-8">
              <div className="flex items-start gap-6">
                <div className="w-16 h-16 rounded-2xl bg-risk-moderate-bg flex items-center justify-center flex-shrink-0">
                  <Share2 className="w-8 h-8 text-risk-moderate" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-xl sm:text-2xl font-bold mb-2 sm:mb-3">Spread the Word</h2>
                  <p className="text-sm sm:text-base text-muted-foreground mb-4 sm:mb-6 leading-relaxed">
                    The easiest way to help is to share Nigeria Security Alert with 
                    your friends, family, and colleagues. Every share could save a life.
                  </p>
                  
                  <div className="flex flex-wrap gap-3">
                    <Button 
                      size="lg" 
                      variant="secondary" 
                      className="gap-2"
                      onClick={() => handleShare('whatsapp')}
                    >
                      <MessageCircle className="w-4 h-4" />
                      Share on WhatsApp
                    </Button>
                    <Button 
                      size="lg" 
                      variant="secondary" 
                      className="gap-2"
                      onClick={() => handleShare('twitter')}
                    >
                      <Twitter className="w-4 h-4" />
                      Share on Twitter
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Contact */}
          <motion.div variants={itemVariants}>
            <Card hover={false} className="p-8 text-center bg-muted/50">
              <Shield className="w-12 h-12 mx-auto mb-4 text-foreground" />
              <h3 className="text-xl font-bold mb-2">Have Questions?</h3>
              <p className="text-muted-foreground mb-4">
                Reach out to us anytime. We would love to hear from you.
              </p>
              <a 
                href="mailto:akin@thinknodes.com"
                className="text-accent font-medium hover:underline"
              >
                akin@thinknodes.com
              </a>
            </Card>
          </motion.div>
        </motion.div>
      </div>
    </div>
  )
}

