'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { 
  Phone, 
  AlertTriangle,
  ChevronDown,
  ExternalLink
} from 'lucide-react'
import { useData } from '@/hooks/useData'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] }
  },
}

export default function EmergencyPage() {
  const { states, loading, emergency } = useData()
  const [selectedState, setSelectedState] = useState('')
  const [nationalContacts, setNationalContacts] = useState<any>(null)
  const selectedStateData = states.find(s => s.id === selectedState)

  useEffect(() => {
    if (emergency && emergency.national) {
      setNationalContacts(emergency.national)
    }
  }, [emergency])

  return (
    <div className="min-h-screen pb-20">
      {/* Hero - 112 */}
      <div className="bg-risk-extreme-bg border-b border-risk-extreme/20">
        <div className="max-w-xl mx-auto px-4 sm:px-6 lg:px-8 py-10 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <a href="tel:112" className="inline-block">
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="relative"
              >
                <div className="absolute inset-0 animate-ping bg-risk-extreme/20 rounded-full" />
                <div className="relative w-28 h-28 rounded-full bg-risk-extreme flex items-center justify-center shadow-lg">
                  <span className="text-4xl font-bold text-white font-mono">112</span>
                </div>
              </motion.div>
            </a>
            
            <h1 className="text-2xl font-bold mt-6 mb-2">National Emergency</h1>
            <p className="text-muted-foreground mb-4">Tap to call immediately</p>
            
            <a href="tel:112">
              <Button size="lg" variant="danger" className="gap-2 shadow-lg">
                <Phone className="w-5 h-5" />
                Call 112 Now
              </Button>
            </a>
          </motion.div>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-6"
        >
          {/* National Numbers */}
          <motion.div variants={itemVariants}>
            <h2 className="font-bold mb-4">National Emergency Lines</h2>
            {nationalContacts ? (
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(nationalContacts).map(([key, contact]: [string, any]) => (
                  <a
                    key={key}
                    href={`tel:${contact.number}`}
                    className="p-4 bg-muted rounded-xl text-center hover:bg-muted/80 transition-colors active:scale-95"
                  >
                    <p className="text-2xl font-bold font-mono mb-1">{contact.number}</p>
                    <p className="text-xs text-muted-foreground">{contact.label}</p>
                  </a>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <a href="tel:112" className="p-4 bg-muted rounded-xl text-center hover:bg-muted/80 transition-colors active:scale-95">
                  <p className="text-2xl font-bold font-mono mb-1">112</p>
                  <p className="text-xs text-muted-foreground">National Emergency Line</p>
                </a>
                <a href="tel:199" className="p-4 bg-muted rounded-xl text-center hover:bg-muted/80 transition-colors active:scale-95">
                  <p className="text-2xl font-bold font-mono mb-1">199</p>
                  <p className="text-xs text-muted-foreground">Police Emergency</p>
                </a>
                <a href="tel:122" className="p-4 bg-muted rounded-xl text-center hover:bg-muted/80 transition-colors active:scale-95">
                  <p className="text-2xl font-bold font-mono mb-1">122</p>
                  <p className="text-xs text-muted-foreground">Road Safety (FRSC)</p>
                </a>
                <a href="tel:08132222105" className="p-4 bg-muted rounded-xl text-center hover:bg-muted/80 transition-colors active:scale-95">
                  <p className="text-lg font-bold font-mono mb-1">08132222105</p>
                  <p className="text-xs text-muted-foreground">DSS/SSS</p>
                </a>
              </div>
            )}
          </motion.div>

          {/* State Selector */}
          <motion.div variants={itemVariants}>
            <h2 className="font-bold mb-4">State Emergency Numbers</h2>
            <Card hover={false} className="p-4">
              <div className="relative">
                <select
                  value={selectedState}
                  onChange={(e) => setSelectedState(e.target.value)}
                  className="w-full h-12 pl-4 pr-10 bg-background border-2 border-border rounded-xl appearance-none focus:border-accent focus:outline-none"
                >
                  <option value="">Select your state...</option>
                  {loading ? (
                    <option disabled>Loading states...</option>
                  ) : (
                    states.sort((a, b) => a.name.localeCompare(b.name)).map(state => (
                      <option key={state.id} value={state.id}>{state.name}</option>
                    ))
                  )}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
              </div>

              {/* State Numbers */}
              {selectedStateData && selectedStateData.emergencyContacts && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mt-4 pt-4 border-t border-border space-y-2"
                >
                  <p className="text-sm font-medium mb-3">{selectedStateData.name}</p>
                  
                  {selectedStateData.emergencyContacts.police?.map((number, index) => (
                    <a
                      key={index}
                      href={`tel:${number}`}
                      className="flex items-center justify-between p-3 bg-muted rounded-lg hover:bg-muted/80 transition-colors active:scale-[0.98]"
                    >
                      <div>
                        <p className="text-xs text-muted-foreground">Police {index + 1}</p>
                        <p className="font-mono font-semibold">{number}</p>
                      </div>
                      <Phone className="w-5 h-5 text-muted-foreground" />
                    </a>
                  ))}
                  
                  {selectedStateData.emergencyContacts.frsc && (
                    <a
                      href={`tel:${selectedStateData.emergencyContacts.frsc}`}
                      className="flex items-center justify-between p-3 bg-muted rounded-lg hover:bg-muted/80 transition-colors active:scale-[0.98]"
                    >
                      <div>
                        <p className="text-xs text-muted-foreground">FRSC</p>
                        <p className="font-mono font-semibold">{selectedStateData.emergencyContacts.frsc}</p>
                      </div>
                      <Phone className="w-5 h-5 text-muted-foreground" />
                    </a>
                  )}
                </motion.div>
              )}
            </Card>
          </motion.div>

          {/* Kidnapping Guide Link */}
          <motion.div variants={itemVariants}>
            <Link href="/guide/kidnapping">
              <Card className="p-5 bg-risk-high-bg border-risk-high/20">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-risk-high/20 flex items-center justify-center flex-shrink-0">
                    <AlertTriangle className="w-6 h-6 text-risk-high" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold mb-0.5">Someone Kidnapped?</h3>
                    <p className="text-sm text-muted-foreground">What to do - step by step guide</p>
                  </div>
                  <ExternalLink className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                </div>
              </Card>
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </div>
  )
}
