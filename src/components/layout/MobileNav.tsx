'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Home, 
  Route, 
  Phone, 
  Menu, 
  X, 
  Info, 
  Map, 
  Heart,
  Shield,
  BookOpen
} from 'lucide-react'

const mainNavItems = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/roads', label: 'Roads', icon: Route },
  { href: '/emergency', label: 'Emergency', icon: Phone },
]

const drawerLinks = [
  { href: '/about', label: 'About', icon: Info },
  { href: '/roadmap', label: 'Our Roadmap', icon: Map },
  { href: '/support', label: 'Support', icon: Heart },
  { href: '/guide/kidnapping', label: 'Safety Guide', icon: BookOpen },
]

export function MobileNav() {
  const pathname = usePathname()
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)

  return (
    <>
      {/* Bottom Navigation Bar */}
      <motion.nav
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-lg border-t border-border"
      >
        <div className="flex items-center justify-around h-16 px-2">
          {mainNavItems.map((item) => {
            const isActive = pathname === item.href
            const Icon = item.icon
            return (
              <Link key={item.href} href={item.href} className="flex-1">
                <motion.div
                  whileTap={{ scale: 0.9 }}
                  className={`
                    flex flex-col items-center justify-center py-2 rounded-xl transition-colors
                    ${isActive 
                      ? 'text-accent' 
                      : 'text-muted-foreground'
                    }
                  `}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-xs font-medium mt-1">{item.label}</span>
                </motion.div>
              </Link>
            )
          })}
          
          {/* Menu Button */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setIsDrawerOpen(true)}
            className="flex-1 flex flex-col items-center justify-center py-2 text-muted-foreground"
          >
            <Menu className="w-5 h-5" />
            <span className="text-xs font-medium mt-1">Menu</span>
          </motion.button>
        </div>
      </motion.nav>

      {/* Drawer Overlay */}
      <AnimatePresence>
        {isDrawerOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDrawerOpen(false)}
              className="md:hidden fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm"
            />
            
            {/* Drawer */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="md:hidden fixed top-8 right-0 bottom-0 z-[100] w-72 bg-background border-l border-border shadow-2xl"
            >
              <div className="flex flex-col h-full">
                {/* Drawer Header */}
                <div className="flex items-center justify-between p-4 border-b border-border">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                      <Shield className="w-5 h-5 text-primary-foreground" />
                    </div>
                    <span className="font-bold">Menu</span>
                  </div>
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setIsDrawerOpen(false)}
                    className="p-2 rounded-lg hover:bg-muted transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </motion.button>
                </div>

                {/* Drawer Links */}
                <div className="flex-1 p-4 space-y-2">
                  {drawerLinks.map((link, index) => {
                    const Icon = link.icon
                    const isActive = pathname === link.href
                    return (
                      <motion.div
                        key={link.href}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                      >
                        <Link
                          href={link.href}
                          onClick={() => setIsDrawerOpen(false)}
                          className={`
                            flex items-center gap-3 px-4 py-3 rounded-xl transition-colors
                            ${isActive 
                              ? 'bg-muted text-foreground' 
                              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                            }
                          `}
                        >
                          <Icon className="w-5 h-5" />
                          <span className="font-medium">{link.label}</span>
                        </Link>
                      </motion.div>
                    )
                  })}
                </div>

                {/* Drawer Footer */}
                <div className="p-4 border-t border-border">
                  <p className="text-xs text-muted-foreground text-center">
                    A Thinknodes Innovation Lab Project
                  </p>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}


