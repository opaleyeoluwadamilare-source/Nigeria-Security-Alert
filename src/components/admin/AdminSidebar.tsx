'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard,
  FileText,
  Users,
  UserCog,
  ScrollText,
  Settings,
  Shield,
  X,
  Radio,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { hasPermission, type AdminRole, type Permission } from '@/lib/admin-auth-client'

interface AdminSidebarProps {
  role: AdminRole
  pendingCount?: number
  isOpen: boolean
  onClose: () => void
  adminName?: string
  adminEmail?: string
}

interface NavItem {
  label: string
  href: string
  icon: React.ReactNode
  permission?: Permission
  badge?: number
}

export function AdminSidebar({
  role,
  pendingCount = 0,
  isOpen,
  onClose,
  adminName = 'Admin',
  adminEmail = ''
}: AdminSidebarProps) {
  const pathname = usePathname()

  // Close sidebar on route change (mobile)
  useEffect(() => {
    onClose()
  }, [pathname, onClose])

  // Prevent body scroll when sidebar is open on mobile
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  const navItems: NavItem[] = [
    {
      label: 'Dashboard',
      href: '/admin',
      icon: <LayoutDashboard className="w-5 h-5" />,
    },
    {
      label: 'Reports',
      href: '/admin/reports',
      icon: <FileText className="w-5 h-5" />,
      permission: 'view_reports',
      badge: pendingCount,
    },
    {
      label: 'Users',
      href: '/admin/users',
      icon: <Users className="w-5 h-5" />,
      permission: 'view_users',
    },
    {
      label: 'Broadcasts',
      href: '/admin/broadcasts',
      icon: <Radio className="w-5 h-5" />,
      permission: 'view_broadcasts',
    },
    {
      label: 'Team',
      href: '/admin/team',
      icon: <UserCog className="w-5 h-5" />,
      permission: 'view_team',
    },
    {
      label: 'Audit Log',
      href: '/admin/audit-log',
      icon: <ScrollText className="w-5 h-5" />,
      permission: 'view_audit_logs',
    },
    {
      label: 'Settings',
      href: '/admin/settings',
      icon: <Settings className="w-5 h-5" />,
      permission: 'manage_settings',
    },
  ]

  const visibleItems = navItems.filter(
    (item) => !item.permission || hasPermission(role, item.permission)
  )

  const initials = adminName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  const SidebarContent = () => (
    <>
      {/* Logo Section */}
      <div className="flex items-center justify-between h-16 px-6 border-b border-gray-800">
        <Link href="/admin" className="flex items-center gap-3">
          <div className="w-9 h-9 bg-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-600/20">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="font-semibold text-white text-lg">SafetyAlerts</span>
            <span className="text-xs text-gray-500 block -mt-0.5">Admin</span>
          </div>
        </Link>
        <button
          onClick={onClose}
          className="lg:hidden p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {visibleItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== '/admin' && pathname.startsWith(item.href))

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
                isActive
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              )}
            >
              <span className={cn(isActive && 'text-white')}>{item.icon}</span>
              <span className="flex-1">{item.label}</span>
              {item.badge !== undefined && item.badge > 0 && (
                <span className={cn(
                  'px-2 py-0.5 text-xs font-medium rounded-full',
                  isActive
                    ? 'bg-white/20 text-white'
                    : 'bg-red-500 text-white'
                )}>
                  {item.badge > 99 ? '99+' : item.badge}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Admin Info Footer */}
      <div className="p-4 border-t border-gray-800">
        <div className="flex items-center gap-3 px-2">
          <div className="w-10 h-10 bg-gray-700 text-white rounded-lg flex items-center justify-center text-sm font-medium">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{adminName}</p>
            <p className="text-xs text-gray-500 truncate">{adminEmail}</p>
          </div>
        </div>
      </div>
    </>
  )

  return (
    <>
      {/* Desktop Sidebar - Always visible */}
      <aside className="hidden lg:flex lg:flex-col lg:fixed lg:left-0 lg:top-0 lg:h-full lg:w-64 lg:bg-gray-900 lg:z-40">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar - Overlay */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
              onClick={onClose}
            />

            {/* Mobile Sidebar */}
            <motion.aside
              initial={{ x: -288 }}
              animate={{ x: 0 }}
              exit={{ x: -288 }}
              transition={{ type: 'tween', duration: 0.3, ease: 'easeOut' }}
              className="fixed left-0 top-0 h-full w-72 bg-gray-900 z-50 lg:hidden flex flex-col shadow-2xl"
            >
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
