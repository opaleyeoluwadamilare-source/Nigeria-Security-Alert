'use client'

import Link from 'next/link'
import { MapPin, Shield, Clock } from 'lucide-react'
import { NigerianShield } from './NigerianShield'

export function HeroSection() {
  return (
    <section className="relative overflow-hidden">
      {/* Subtle gradient background */}
      <div className="absolute inset-0 bg-gradient-to-b from-emerald-50/50 to-white" />

      {/* Subtle pattern overlay */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23008751' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      <div className="relative max-w-6xl mx-auto px-4 pt-8 pb-16 md:pt-12 md:pb-24">
        {/* Navigation */}
        <nav className="flex items-center justify-between mb-12 md:mb-16">
          <div className="flex items-center gap-3">
            <NigerianShield className="w-10 h-10" />
            <span className="font-semibold text-lg text-gray-900">SafetyAlerts</span>
          </div>
          <Link
            href="/app"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-full transition-colors"
          >
            Open App
            <span aria-hidden="true">→</span>
          </Link>
        </nav>

        {/* Hero Content */}
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left: Copy */}
          <div className="max-w-xl">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight">
              Know what&apos;s happening
              <span className="block text-emerald-700">before you step outside</span>
            </h1>

            <p className="mt-6 text-lg text-gray-600 leading-relaxed">
              Real-time safety alerts from people in your neighborhood. Robberies, checkpoints,
              traffic, fires — know about it first.
            </p>

            {/* Trust indicators */}
            <div className="mt-8 flex flex-wrap gap-6 text-sm text-gray-500">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-emerald-600" />
                <span>GPS verified reports</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-600" />
                <span>Community confirmed</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-600" />
                <span>Instant notifications</span>
              </div>
            </div>

            {/* CTA */}
            <div className="mt-10 flex flex-col sm:flex-row gap-4">
              <Link
                href="/app"
                className="inline-flex items-center justify-center px-8 py-4 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold rounded-xl transition-all hover:shadow-lg hover:shadow-emerald-700/25"
              >
                Start Protecting Your Area
              </Link>
              <a
                href="#how-it-works"
                className="inline-flex items-center justify-center px-8 py-4 bg-white border border-gray-200 hover:border-gray-300 text-gray-700 font-medium rounded-xl transition-colors"
              >
                See How It Works
              </a>
            </div>

            <p className="mt-4 text-sm text-gray-500">
              Free forever. Install directly from your browser — no app store needed.
            </p>
          </div>

          {/* Right: Phone Mockup with Live Alert */}
          <div className="relative flex justify-center lg:justify-end">
            <PhoneMockup />
          </div>
        </div>
      </div>
    </section>
  )
}

// Phone mockup component with realistic alerts
function PhoneMockup() {
  return (
    <div className="relative">
      {/* Glow effect behind phone */}
      <div className="absolute inset-0 bg-gradient-to-r from-emerald-200 to-emerald-100 blur-3xl opacity-40 scale-150" />

      {/* Phone frame */}
      <div className="relative bg-gray-900 rounded-[3rem] p-3 shadow-2xl">
        <div className="bg-white rounded-[2.5rem] overflow-hidden w-[280px] md:w-[320px]">
          {/* Status bar */}
          <div className="bg-gray-50 px-6 py-3 flex justify-between items-center text-xs text-gray-500">
            <span>9:41</span>
            <div className="flex gap-1">
              <div className="w-4 h-2 bg-gray-400 rounded-sm" />
              <div className="w-4 h-2 bg-gray-400 rounded-sm" />
              <div className="w-6 h-3 bg-emerald-500 rounded-sm" />
            </div>
          </div>

          {/* App content */}
          <div className="px-4 py-3">
            {/* App header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <NigerianShield className="w-6 h-6" />
                <span className="font-semibold text-sm">SafetyAlerts</span>
              </div>
              <div className="text-xs text-gray-400">Lekki, Lagos</div>
            </div>

            {/* Status banner */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                <span className="text-sm font-medium text-amber-800">1 alert in your area</span>
              </div>
            </div>

            {/* Alert cards */}
            <div className="space-y-3">
              <AlertCard
                type="robbery"
                location="Lekki Phase 1"
                description="Armed men spotted near Shoprite junction"
                time="3 min ago"
                confirmations={7}
                isActive={true}
              />
              <AlertCard
                type="checkpoint"
                location="Lekki-Epe Expressway"
                description="Police checkpoint after Chevron"
                time="25 min ago"
                confirmations={12}
                isActive={false}
              />
              <AlertCard
                type="traffic"
                location="Ajah"
                description="Heavy traffic at Jakande from broken down truck"
                time="1 hr ago"
                confirmations={23}
                isActive={false}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Floating notification */}
      <div className="absolute -top-4 -right-4 md:-right-8 bg-white rounded-2xl shadow-xl p-4 w-64 border border-gray-100 animate-float">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <span className="text-lg">⚠</span>
          </div>
          <div>
            <div className="font-semibold text-sm text-gray-900">New Alert</div>
            <div className="text-xs text-gray-500 mt-0.5">Robbery reported near your home</div>
            <div className="text-xs text-emerald-600 mt-1">Just now</div>
          </div>
        </div>
      </div>
    </div>
  )
}

interface AlertCardProps {
  type: 'robbery' | 'checkpoint' | 'traffic' | 'fire' | 'accident'
  location: string
  description: string
  time: string
  confirmations: number
  isActive: boolean
}

function AlertCard({ type, location, description, time, confirmations, isActive }: AlertCardProps) {
  const typeConfig = {
    robbery: { bg: 'bg-red-50', border: 'border-red-200', dot: 'bg-red-500', label: 'ROBBERY' },
    checkpoint: { bg: 'bg-yellow-50', border: 'border-yellow-200', dot: 'bg-yellow-500', label: 'CHECKPOINT' },
    traffic: { bg: 'bg-orange-50', border: 'border-orange-200', dot: 'bg-orange-500', label: 'TRAFFIC' },
    fire: { bg: 'bg-red-50', border: 'border-red-200', dot: 'bg-red-500', label: 'FIRE' },
    accident: { bg: 'bg-orange-50', border: 'border-orange-200', dot: 'bg-orange-500', label: 'ACCIDENT' },
  }

  const config = typeConfig[type]

  return (
    <div className={`${config.bg} ${config.border} border rounded-xl p-3`}>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 ${config.dot} rounded-full ${isActive ? 'animate-pulse' : ''}`} />
          <span className="text-xs font-bold text-gray-700">{config.label}</span>
        </div>
        <span className="text-xs text-gray-400">{time}</span>
      </div>
      <div className="text-xs font-medium text-gray-900 mb-0.5">{location}</div>
      <div className="text-xs text-gray-600 line-clamp-1">{description}</div>
      <div className="text-xs text-gray-400 mt-2">{confirmations} confirmed</div>
    </div>
  )
}
