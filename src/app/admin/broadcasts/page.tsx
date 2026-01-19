'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { formatDistanceToNow } from 'date-fns'
import {
  Radio,
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  Send,
  Users,
  MapPin,
  Globe,
  AlertTriangle,
  Bell,
  Megaphone,
  Wrench,
  Info,
  CheckCircle2,
  XCircle,
  Clock,
  X,
  Loader2,
  FileText,
  Eye,
  Trash2,
} from 'lucide-react'
import { Badge, StatusBadge } from '@/components/admin/ui'
import { TableSkeleton } from '@/components/admin/ui/Skeleton'
import { maskPhone } from '@/lib/admin-auth-client'

interface Broadcast {
  id: string
  title: string
  body: string
  broadcast_type: 'emergency' | 'announcement' | 'maintenance' | 'info' | 'custom'
  target_type: 'all' | 'area' | 'users'
  target_areas: string[] | null
  target_user_ids: string[] | null
  status: 'draft' | 'sending' | 'sent' | 'failed' | 'scheduled'
  scheduled_at: string | null
  sent_at: string | null
  total_recipients: number
  successful_deliveries: number
  failed_deliveries: number
  icon: string
  created_at: string
  admin_users: {
    full_name: string
    email: string
  } | null
}

interface Template {
  id: string
  name: string
  title: string
  body: string
  broadcast_type: string
  icon: string
}

interface Area {
  area_name: string
  area_slug: string
  state: string
  user_count: number
  push_subscriptions: number
}

interface User {
  id: string
  phone: string
  status: string
  user_locations: Array<{
    area_name: string
    state: string
    is_primary: boolean
  }>
}

export default function AdminBroadcastsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // List state
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([])
  const [loading, setLoading] = useState(true)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  // Modal state
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [selectedBroadcast, setSelectedBroadcast] = useState<Broadcast | null>(null)

  // Create form state
  const [formData, setFormData] = useState({
    title: '',
    body: '',
    broadcast_type: 'announcement' as Broadcast['broadcast_type'],
    target_type: 'all' as Broadcast['target_type'],
    target_areas: [] as string[],
    target_user_ids: [] as string[],
    icon: '📢',
  })
  const [templates, setTemplates] = useState<Template[]>([])
  const [areas, setAreas] = useState<Area[]>([])
  const [userSearch, setUserSearch] = useState('')
  const [searchedUsers, setSearchedUsers] = useState<User[]>([])
  const [selectedUsers, setSelectedUsers] = useState<User[]>([])
  const [recipientPreview, setRecipientPreview] = useState({ total: 0, withPush: 0 })
  const [sending, setSending] = useState(false)
  const [sendResult, setSendResult] = useState<{ success: boolean; message: string } | null>(null)

  // Filters
  const page = parseInt(searchParams.get('page') || '1')
  const status = searchParams.get('status') || ''
  const type = searchParams.get('type') || ''

  // Fetch broadcasts
  const fetchBroadcasts = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('page', page.toString())
      if (status) params.set('status', status)
      if (type) params.set('type', type)

      const response = await fetch(`/api/admin/broadcasts?${params}`)
      const data = await response.json()

      if (response.ok) {
        setBroadcasts(data.broadcasts || [])
        setTotalPages(data.pagination?.totalPages || 1)
        setTotal(data.pagination?.total || 0)
      }
    } catch (error) {
      console.error('Failed to fetch broadcasts:', error)
    } finally {
      setLoading(false)
    }
  }, [page, status, type])

  useEffect(() => {
    fetchBroadcasts()
  }, [fetchBroadcasts])

  // Fetch templates
  useEffect(() => {
    async function loadTemplates() {
      try {
        const response = await fetch('/api/admin/broadcasts/templates')
        const data = await response.json()
        if (response.ok) {
          setTemplates(data.templates || [])
        }
      } catch (error) {
        console.error('Failed to fetch templates:', error)
      }
    }
    loadTemplates()
  }, [])

  // Fetch areas for targeting
  useEffect(() => {
    async function loadAreas() {
      try {
        const response = await fetch('/api/admin/broadcasts/areas')
        const data = await response.json()
        if (response.ok) {
          setAreas(data.areas || [])
        }
      } catch (error) {
        console.error('Failed to fetch areas:', error)
      }
    }
    if (showCreateModal) {
      loadAreas()
    }
  }, [showCreateModal])

  // Search users
  const searchUsers = useCallback(async (query: string) => {
    if (!query || query.length < 3) {
      setSearchedUsers([])
      return
    }
    try {
      const response = await fetch(`/api/admin/broadcasts/users?phone=${encodeURIComponent(query)}`)
      const data = await response.json()
      if (response.ok) {
        setSearchedUsers(data.users || [])
      }
    } catch (error) {
      console.error('Failed to search users:', error)
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      if (userSearch) searchUsers(userSearch)
    }, 300)
    return () => clearTimeout(timer)
  }, [userSearch, searchUsers])

  // Update recipient preview
  useEffect(() => {
    async function updatePreview() {
      try {
        const response = await fetch('/api/admin/broadcasts/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            target_type: formData.target_type,
            target_areas: formData.target_areas,
            target_user_ids: formData.target_user_ids,
          }),
        })
        const data = await response.json()
        if (response.ok) {
          setRecipientPreview({
            total: data.total_users || 0,
            withPush: data.with_push_subscriptions || 0,
          })
        }
      } catch (error) {
        console.error('Failed to get recipient preview:', error)
      }
    }
    if (showCreateModal) {
      updatePreview()
    }
  }, [showCreateModal, formData.target_type, formData.target_areas, formData.target_user_ids])

  // Handle template selection
  const applyTemplate = (template: Template) => {
    setFormData({
      ...formData,
      title: template.title,
      body: template.body,
      broadcast_type: template.broadcast_type as Broadcast['broadcast_type'],
      icon: template.icon || '📢',
    })
  }

  // Handle area selection
  const toggleArea = (areaSlug: string) => {
    setFormData((prev) => ({
      ...prev,
      target_areas: prev.target_areas.includes(areaSlug)
        ? prev.target_areas.filter((a) => a !== areaSlug)
        : [...prev.target_areas, areaSlug],
    }))
  }

  // Handle user selection
  const toggleUser = (user: User) => {
    const isSelected = selectedUsers.some((u) => u.id === user.id)
    if (isSelected) {
      setSelectedUsers(selectedUsers.filter((u) => u.id !== user.id))
      setFormData((prev) => ({
        ...prev,
        target_user_ids: prev.target_user_ids.filter((id) => id !== user.id),
      }))
    } else {
      setSelectedUsers([...selectedUsers, user])
      setFormData((prev) => ({
        ...prev,
        target_user_ids: [...prev.target_user_ids, user.id],
      }))
    }
  }

  // Send broadcast
  const handleSend = async () => {
    if (!formData.title || !formData.body) {
      setSendResult({ success: false, message: 'Title and body are required' })
      return
    }

    if (formData.target_type === 'area' && formData.target_areas.length === 0) {
      setSendResult({ success: false, message: 'Please select at least one area' })
      return
    }

    if (formData.target_type === 'users' && formData.target_user_ids.length === 0) {
      setSendResult({ success: false, message: 'Please select at least one user' })
      return
    }

    setSending(true)
    setSendResult(null)

    try {
      const response = await fetch('/api/admin/broadcasts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      const data = await response.json()

      if (response.ok) {
        setSendResult({
          success: true,
          message: data.message || 'Broadcast sent successfully!',
        })
        // Reset form after short delay
        setTimeout(() => {
          setShowCreateModal(false)
          resetForm()
          fetchBroadcasts()
        }, 2000)
      } else {
        setSendResult({
          success: false,
          message: data.error || 'Failed to send broadcast',
        })
      }
    } catch (error) {
      setSendResult({
        success: false,
        message: 'Network error. Please try again.',
      })
    } finally {
      setSending(false)
    }
  }

  const resetForm = () => {
    setFormData({
      title: '',
      body: '',
      broadcast_type: 'announcement',
      target_type: 'all',
      target_areas: [],
      target_user_ids: [],
      icon: '📢',
    })
    setSelectedUsers([])
    setUserSearch('')
    setSearchedUsers([])
    setSendResult(null)
  }

  // Update URL params
  const updateFilters = (updates: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString())
    Object.entries(updates).forEach(([key, value]) => {
      if (value) {
        params.set(key, value)
      } else {
        params.delete(key)
      }
    })
    params.set('page', '1')
    router.push(`/admin/broadcasts?${params.toString()}`)
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'emergency':
        return <AlertTriangle className="w-4 h-4 text-red-500" />
      case 'announcement':
        return <Megaphone className="w-4 h-4 text-blue-500" />
      case 'maintenance':
        return <Wrench className="w-4 h-4 text-yellow-500" />
      case 'info':
        return <Info className="w-4 h-4 text-green-500" />
      default:
        return <Bell className="w-4 h-4 text-gray-500" />
    }
  }

  const getTargetIcon = (type: string) => {
    switch (type) {
      case 'all':
        return <Globe className="w-4 h-4" />
      case 'area':
        return <MapPin className="w-4 h-4" />
      case 'users':
        return <Users className="w-4 h-4" />
      default:
        return <Globe className="w-4 h-4" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sent':
        return <Badge variant="success">Sent</Badge>
      case 'sending':
        return <Badge variant="warning">Sending</Badge>
      case 'failed':
        return <Badge variant="danger">Failed</Badge>
      case 'scheduled':
        return <Badge variant="info">Scheduled</Badge>
      default:
        return <Badge variant="neutral">Draft</Badge>
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Broadcasts</h1>
          <p className="text-gray-500 text-sm mt-1">
            Send notifications to all users or specific groups
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium"
        >
          <Plus className="w-5 h-5" />
          New Broadcast
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-wrap gap-3">
          <select
            value={status}
            onChange={(e) => updateFilters({ status: e.target.value })}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">All Status</option>
            <option value="sent">Sent</option>
            <option value="sending">Sending</option>
            <option value="failed">Failed</option>
            <option value="scheduled">Scheduled</option>
            <option value="draft">Draft</option>
          </select>

          <select
            value={type}
            onChange={(e) => updateFilters({ type: e.target.value })}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">All Types</option>
            <option value="emergency">Emergency</option>
            <option value="announcement">Announcement</option>
            <option value="maintenance">Maintenance</option>
            <option value="info">Info</option>
            <option value="custom">Custom</option>
          </select>

          <div className="flex-1" />

          <span className="text-sm text-gray-500 self-center">
            {total} broadcast{total !== 1 ? 's' : ''} total
          </span>
        </div>
      </div>

      {/* Broadcasts List */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <TableSkeleton rows={5} cols={5} />
        ) : broadcasts.length === 0 ? (
          <div className="text-center py-12">
            <Radio className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-1">No broadcasts yet</h3>
            <p className="text-gray-500 mb-4">Create your first broadcast to reach your users</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              Create Broadcast
            </button>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Broadcast
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Type
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Target
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Delivery
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Sent
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {broadcasts.map((broadcast) => (
                    <tr
                      key={broadcast.id}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => {
                        setSelectedBroadcast(broadcast)
                        setShowDetailModal(true)
                      }}
                    >
                      <td className="px-4 py-4">
                        <div className="flex items-start gap-3">
                          <span className="text-xl">{broadcast.icon}</span>
                          <div>
                            <p className="font-medium text-gray-900 line-clamp-1">
                              {broadcast.title}
                            </p>
                            <p className="text-sm text-gray-500 line-clamp-1">
                              {broadcast.body}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          {getTypeIcon(broadcast.broadcast_type)}
                          <span className="text-sm capitalize">{broadcast.broadcast_type}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          {getTargetIcon(broadcast.target_type)}
                          <span className="text-sm capitalize">
                            {broadcast.target_type === 'all'
                              ? 'All Users'
                              : broadcast.target_type === 'area'
                              ? `${broadcast.target_areas?.length || 0} Areas`
                              : `${broadcast.target_user_ids?.length || 0} Users`}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm">
                          <span className="text-green-600">{broadcast.successful_deliveries}</span>
                          <span className="text-gray-400"> / </span>
                          <span className="text-gray-600">{broadcast.total_recipients}</span>
                          {broadcast.failed_deliveries > 0 && (
                            <span className="text-red-500 ml-1">
                              ({broadcast.failed_deliveries} failed)
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4">{getStatusBadge(broadcast.status)}</td>
                      <td className="px-4 py-4 text-sm text-gray-500">
                        {broadcast.sent_at
                          ? formatDistanceToNow(new Date(broadcast.sent_at), { addSuffix: true })
                          : broadcast.scheduled_at
                          ? `Scheduled ${formatDistanceToNow(new Date(broadcast.scheduled_at), { addSuffix: true })}`
                          : formatDistanceToNow(new Date(broadcast.created_at), { addSuffix: true })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden divide-y divide-gray-200">
              {broadcasts.map((broadcast) => (
                <div
                  key={broadcast.id}
                  className="p-4 hover:bg-gray-50 cursor-pointer"
                  onClick={() => {
                    setSelectedBroadcast(broadcast)
                    setShowDetailModal(true)
                  }}
                >
                  <div className="flex items-start gap-3 mb-3">
                    <span className="text-2xl">{broadcast.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900">{broadcast.title}</p>
                      <p className="text-sm text-gray-500 line-clamp-2">{broadcast.body}</p>
                    </div>
                    {getStatusBadge(broadcast.status)}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <div className="flex items-center gap-1">
                      {getTargetIcon(broadcast.target_type)}
                      <span className="capitalize">{broadcast.target_type}</span>
                    </div>
                    <div>
                      <span className="text-green-600">{broadcast.successful_deliveries}</span>
                      <span className="text-gray-400">/</span>
                      <span>{broadcast.total_recipients}</span>
                    </div>
                    <div className="ml-auto">
                      {broadcast.sent_at
                        ? formatDistanceToNow(new Date(broadcast.sent_at), { addSuffix: true })
                        : formatDistanceToNow(new Date(broadcast.created_at), { addSuffix: true })}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
                <button
                  onClick={() => updateFilters({ page: String(page - 1) })}
                  disabled={page <= 1}
                  className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm text-gray-500">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => updateFilters({ page: String(page + 1) })}
                  disabled={page >= totalPages}
                  className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Create Broadcast Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => {
              if (!sending) {
                setShowCreateModal(false)
                resetForm()
              }
            }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">New Broadcast</h2>
                <button
                  onClick={() => {
                    if (!sending) {
                      setShowCreateModal(false)
                      resetForm()
                    }
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Templates */}
                {templates.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Quick Templates
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {templates.map((template) => (
                        <button
                          key={template.id}
                          onClick={() => applyTemplate(template)}
                          className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                        >
                          {template.icon} {template.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Broadcast Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Broadcast Type
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {[
                      { value: 'emergency', label: 'Emergency', icon: '🚨', color: 'red' },
                      { value: 'announcement', label: 'Announce', icon: '📢', color: 'blue' },
                      { value: 'maintenance', label: 'Maintenance', icon: '🔧', color: 'yellow' },
                      { value: 'info', label: 'Info', icon: '💡', color: 'green' },
                      { value: 'custom', label: 'Custom', icon: '🔔', color: 'gray' },
                    ].map((t) => (
                      <button
                        key={t.value}
                        onClick={() => setFormData({ ...formData, broadcast_type: t.value as any, icon: t.icon })}
                        className={`p-3 rounded-lg border-2 transition-all ${
                          formData.broadcast_type === t.value
                            ? `border-${t.color}-500 bg-${t.color}-50`
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <span className="text-xl block mb-1">{t.icon}</span>
                        <span className="text-xs font-medium">{t.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Title */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Title *
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Enter notification title..."
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    maxLength={100}
                  />
                </div>

                {/* Body */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Message *
                  </label>
                  <textarea
                    value={formData.body}
                    onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                    placeholder="Enter notification message..."
                    rows={3}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                    maxLength={250}
                  />
                  <p className="text-xs text-gray-400 mt-1">{formData.body.length}/250</p>
                </div>

                {/* Target Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Send To
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { value: 'all', label: 'All Users', icon: <Globe className="w-5 h-5" /> },
                      { value: 'area', label: 'By Area', icon: <MapPin className="w-5 h-5" /> },
                      { value: 'users', label: 'Specific Users', icon: <Users className="w-5 h-5" /> },
                    ].map((t) => (
                      <button
                        key={t.value}
                        onClick={() => setFormData({ ...formData, target_type: t.value as any })}
                        className={`p-3 rounded-lg border-2 transition-all flex flex-col items-center gap-2 ${
                          formData.target_type === t.value
                            ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        {t.icon}
                        <span className="text-sm font-medium">{t.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Area Selection */}
                {formData.target_type === 'area' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Areas ({formData.target_areas.length} selected)
                    </label>
                    <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
                      {areas.length === 0 ? (
                        <p className="p-4 text-center text-gray-500 text-sm">No areas with users found</p>
                      ) : (
                        areas.map((area) => (
                          <label
                            key={area.area_slug}
                            className="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={formData.target_areas.includes(area.area_slug)}
                              onChange={() => toggleArea(area.area_slug)}
                              className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                            />
                            <div className="flex-1">
                              <p className="font-medium text-gray-900">{area.area_name}</p>
                              <p className="text-xs text-gray-500">{area.state}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm text-gray-600">{area.user_count} users</p>
                              <p className="text-xs text-gray-400">{area.push_subscriptions} with push</p>
                            </div>
                          </label>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {/* User Selection */}
                {formData.target_type === 'users' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Search & Select Users ({selectedUsers.length} selected)
                    </label>

                    {/* Search Input */}
                    <div className="relative mb-3">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        value={userSearch}
                        onChange={(e) => setUserSearch(e.target.value)}
                        placeholder="Search by phone number..."
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>

                    {/* Selected Users */}
                    {selectedUsers.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-3">
                        {selectedUsers.map((user) => (
                          <span
                            key={user.id}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm"
                          >
                            {maskPhone(user.phone)}
                            <button
                              onClick={() => toggleUser(user)}
                              className="p-0.5 hover:bg-emerald-200 rounded-full"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Search Results */}
                    {searchedUsers.length > 0 && (
                      <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
                        {searchedUsers.map((user) => {
                          const isSelected = selectedUsers.some((u) => u.id === user.id)
                          return (
                            <label
                              key={user.id}
                              className={`flex items-center gap-3 p-3 cursor-pointer ${
                                isSelected ? 'bg-emerald-50' : 'hover:bg-gray-50'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleUser(user)}
                                className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                              />
                              <div className="flex-1">
                                <p className="font-medium text-gray-900">{maskPhone(user.phone)}</p>
                                {user.user_locations?.[0] && (
                                  <p className="text-xs text-gray-500">
                                    {user.user_locations[0].area_name}, {user.user_locations[0].state}
                                  </p>
                                )}
                              </div>
                            </label>
                          )
                        })}
                      </div>
                    )}

                    {userSearch.length > 0 && userSearch.length < 3 && (
                      <p className="text-sm text-gray-500 text-center py-4">
                        Type at least 3 characters to search
                      </p>
                    )}
                  </div>
                )}

                {/* Recipient Preview */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-2">Delivery Preview</h4>
                  <div className="flex items-center gap-6 text-sm">
                    <div>
                      <span className="text-gray-500">Total Recipients:</span>
                      <span className="ml-2 font-semibold text-gray-900">{recipientPreview.total}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">With Push Enabled:</span>
                      <span className="ml-2 font-semibold text-green-600">{recipientPreview.withPush}</span>
                    </div>
                  </div>
                  {recipientPreview.total > 0 && recipientPreview.withPush < recipientPreview.total && (
                    <p className="text-xs text-amber-600 mt-2">
                      {recipientPreview.total - recipientPreview.withPush} users don&apos;t have push notifications enabled
                    </p>
                  )}
                </div>

                {/* Send Result */}
                {sendResult && (
                  <div
                    className={`p-4 rounded-lg flex items-center gap-3 ${
                      sendResult.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                    }`}
                  >
                    {sendResult.success ? (
                      <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                    ) : (
                      <XCircle className="w-5 h-5 flex-shrink-0" />
                    )}
                    <p className="text-sm">{sendResult.message}</p>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-end gap-3">
                <button
                  onClick={() => {
                    if (!sending) {
                      setShowCreateModal(false)
                      resetForm()
                    }
                  }}
                  disabled={sending}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSend}
                  disabled={sending || !formData.title || !formData.body || recipientPreview.withPush === 0}
                  className="inline-flex items-center gap-2 px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {sending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Send Broadcast
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Broadcast Detail Modal */}
      <AnimatePresence>
        {showDetailModal && selectedBroadcast && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => {
              setShowDetailModal(false)
              setSelectedBroadcast(null)
            }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">Broadcast Details</h2>
                <button
                  onClick={() => {
                    setShowDetailModal(false)
                    setSelectedBroadcast(null)
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                <div className="flex items-start gap-4">
                  <span className="text-3xl">{selectedBroadcast.icon}</span>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg text-gray-900">{selectedBroadcast.title}</h3>
                    <p className="text-gray-600 mt-1">{selectedBroadcast.body}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">Type</p>
                    <div className="flex items-center gap-2">
                      {getTypeIcon(selectedBroadcast.broadcast_type)}
                      <span className="font-medium capitalize">{selectedBroadcast.broadcast_type}</span>
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">Status</p>
                    {getStatusBadge(selectedBroadcast.status)}
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">Target</p>
                    <div className="flex items-center gap-2">
                      {getTargetIcon(selectedBroadcast.target_type)}
                      <span className="font-medium capitalize">
                        {selectedBroadcast.target_type === 'all'
                          ? 'All Users'
                          : selectedBroadcast.target_type === 'area'
                          ? `${selectedBroadcast.target_areas?.length || 0} Areas`
                          : `${selectedBroadcast.target_user_ids?.length || 0} Users`}
                      </span>
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">Sent By</p>
                    <span className="font-medium">
                      {selectedBroadcast.admin_users?.full_name || 'Unknown'}
                    </span>
                  </div>
                </div>

                {/* Delivery Stats */}
                <div className="bg-emerald-50 rounded-lg p-4">
                  <h4 className="font-medium text-emerald-900 mb-3">Delivery Statistics</h4>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-2xl font-bold text-emerald-600">
                        {selectedBroadcast.total_recipients}
                      </p>
                      <p className="text-xs text-emerald-700">Total</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-green-600">
                        {selectedBroadcast.successful_deliveries}
                      </p>
                      <p className="text-xs text-green-700">Delivered</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-red-500">
                        {selectedBroadcast.failed_deliveries}
                      </p>
                      <p className="text-xs text-red-600">Failed</p>
                    </div>
                  </div>
                  {selectedBroadcast.total_recipients > 0 && (
                    <div className="mt-3">
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-green-500"
                          style={{
                            width: `${(selectedBroadcast.successful_deliveries / selectedBroadcast.total_recipients) * 100}%`,
                          }}
                        />
                      </div>
                      <p className="text-xs text-gray-600 mt-1 text-center">
                        {((selectedBroadcast.successful_deliveries / selectedBroadcast.total_recipients) * 100).toFixed(1)}% success rate
                      </p>
                    </div>
                  )}
                </div>

                {/* Timestamps */}
                <div className="text-sm text-gray-500 space-y-1">
                  <p>
                    Created: {new Date(selectedBroadcast.created_at).toLocaleString()}
                  </p>
                  {selectedBroadcast.sent_at && (
                    <p>Sent: {new Date(selectedBroadcast.sent_at).toLocaleString()}</p>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
