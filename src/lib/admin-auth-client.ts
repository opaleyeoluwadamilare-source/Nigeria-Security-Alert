/**
 * Admin Auth - Client-safe utilities
 * These functions can be imported in client components
 */

// =============================================
// TYPES
// =============================================

export type AdminRole = 'super_admin' | 'admin' | 'moderator' | 'analyst' | 'support'

// =============================================
// PERMISSIONS
// =============================================

export const PERMISSIONS = {
  // Report moderation
  view_reports: ['super_admin', 'admin', 'moderator', 'analyst', 'support'],
  moderate_reports: ['super_admin', 'admin', 'moderator'],
  delete_reports: ['super_admin', 'admin'],

  // User management
  view_users: ['super_admin', 'admin', 'moderator', 'analyst', 'support'],
  warn_users: ['super_admin', 'admin', 'moderator'],
  suspend_users: ['super_admin', 'admin'],
  ban_users: ['super_admin', 'admin'],

  // Analytics
  view_analytics: ['super_admin', 'admin', 'moderator', 'analyst'],
  export_data: ['super_admin', 'admin', 'analyst'],

  // Team management
  view_team: ['super_admin', 'admin'],
  manage_admins: ['super_admin', 'admin'],
  create_super_admin: ['super_admin'],
  delete_admins: ['super_admin'],

  // Audit & Settings
  view_audit_logs: ['super_admin', 'admin'],
  manage_settings: ['super_admin'],

  // Broadcasts
  view_broadcasts: ['super_admin', 'admin', 'moderator'],
  send_broadcasts: ['super_admin', 'admin'],
  send_emergency_broadcasts: ['super_admin'],
} as const

export type Permission = keyof typeof PERMISSIONS

export function hasPermission(role: AdminRole, permission: Permission): boolean {
  const allowedRoles = PERMISSIONS[permission] as readonly string[]
  return allowedRoles.includes(role)
}

export function getPermissionsForRole(role: AdminRole): Permission[] {
  return Object.entries(PERMISSIONS)
    .filter(([_, roles]) => (roles as readonly string[]).includes(role))
    .map(([permission]) => permission as Permission)
}

// =============================================
// UTILITY FUNCTIONS
// =============================================

export function maskPhone(phone: string | null): string {
  if (!phone) return 'Unknown'
  // Show first 6 and last 4 digits: +23480****1234
  if (phone.length > 10) {
    return phone.slice(0, 6) + '****' + phone.slice(-4)
  }
  return phone.slice(0, 3) + '****' + phone.slice(-2)
}

export function getRoleBadgeColor(role: AdminRole): string {
  switch (role) {
    case 'super_admin':
      return 'bg-purple-100 text-purple-700'
    case 'admin':
      return 'bg-blue-100 text-blue-700'
    case 'moderator':
      return 'bg-emerald-100 text-emerald-700'
    case 'analyst':
      return 'bg-amber-100 text-amber-700'
    case 'support':
      return 'bg-gray-100 text-gray-700'
    default:
      return 'bg-gray-100 text-gray-700'
  }
}

export function getRoleLabel(role: AdminRole): string {
  switch (role) {
    case 'super_admin':
      return 'Super Admin'
    case 'admin':
      return 'Admin'
    case 'moderator':
      return 'Moderator'
    case 'analyst':
      return 'Analyst'
    case 'support':
      return 'Support'
    default:
      return role
  }
}
