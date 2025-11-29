import type { Metadata } from 'next'
import './globals.css'
import { Navigation } from '@/components/layout/Navigation'
import { MobileNav } from '@/components/layout/MobileNav'
import { PageTransition } from '@/components/animations/PageTransition'
import { TopBanner } from '@/components/layout/TopBanner'

export const metadata: Metadata = {
  title: 'Nigeria Security Alert | Real-time Safety Intelligence',
  description: 'Verified security intelligence for Nigeria. Check road safety, emergency contacts, and stay informed about security situations across all 36 states.',
  keywords: 'Nigeria security, safety alerts, road safety Nigeria, emergency contacts Nigeria, kidnapping prevention, travel safety Nigeria',
  authors: [{ name: 'Thinknodes Innovation Lab' }],
  openGraph: {
    title: 'Nigeria Security Alert',
    description: 'Verified intelligence. Community safety.',
    url: 'https://alerts.thinknodes.com',
    siteName: 'Nigeria Security Alert',
    locale: 'en_NG',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Nigeria Security Alert',
    description: 'Verified intelligence. Community safety.',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background antialiased">
        <TopBanner />
        <Navigation />
        <main className="pt-24 pb-20 md:pb-0">
          <PageTransition>
            {children}
          </PageTransition>
        </main>
        <MobileNav />
      </body>
    </html>
  )
}

