'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { X, Trash2, Shield, Loader2 } from 'lucide-react'
import { format } from 'date-fns'
import UserAvatar from './UserAvatar'

interface AdminUser {
  id: string
  email: string | null
  name: string | null
  avatar_url: string | null
  google_avatar_url: string | null
  created_at: string
  last_sign_in_at: string | null
}

interface AdminModalProps {
  isOpen: boolean
  onClose: () => void
  darkMode: boolean
  user: any
}

export default function AdminModal({ isOpen, onClose, darkMode, user }: AdminModalProps) {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [removingId, setRemovingId] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) loadUsers()
  }, [isOpen])

  const getToken = async () => {
    const { data } = await supabase.auth.getSession()
    return data.session?.access_token
  }

  const loadUsers = async () => {
    setLoading(true)
    setError(null)
    try {
      const accessToken = await getToken()
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to load users')
      setUsers(json.users || [])
    } catch (e: any) {
      console.error('Error loading users:', e)
      setError(e?.message || 'Could not load users')
    } finally {
      setLoading(false)
    }
  }

  const handleRemove = async (u: AdminUser) => {
    if (!confirm(`Remove ${u.name || u.email || 'this user'}? This deletes their account, RSVPs and sessions they created. This cannot be undone.`)) return
    setRemovingId(u.id)
    try {
      const accessToken = await getToken()
      const res = await fetch('/api/admin/delete-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: u.id, accessToken }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to remove user')
      setUsers((prev) => prev.filter((x) => x.id !== u.id))
    } catch (e: any) {
      alert(`Failed to remove user: ${e?.message || 'unknown error'}`)
    } finally {
      setRemovingId(null)
    }
  }

  if (!isOpen) return null

  const subText = darkMode ? 'text-gray-400' : 'text-gray-500'
  const rowBg = darkMode ? 'bg-gray-700/50' : 'bg-gray-50'

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className={`${darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'} rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[85vh] overflow-y-auto`}>
        <div className="flex justify-between items-center mb-1">
          <h2 className="text-xl font-display font-bold tracking-wider text-brand-primary uppercase flex items-center gap-2">
            <Shield className="w-5 h-5" /> User Management
          </h2>
          <button onClick={onClose} className={darkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'}>
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className={`text-xs mb-5 ${subText}`}>
          {loading ? 'Loading members…' : `${users.length} member${users.length === 1 ? '' : 's'} · newest first`}
        </p>

        {loading ? (
          <p className={subText}>Loading members…</p>
        ) : error ? (
          <p className="text-red-500 text-sm">Couldn&apos;t load users: {error}</p>
        ) : (
          <div className="space-y-2">
            {users.map((u) => (
              <div key={u.id} className={`flex items-center gap-3 p-3 rounded-lg ${rowBg}`}>
                <UserAvatar profile={{ name: u.name || u.email || 'User', avatar_url: u.avatar_url, google_avatar_url: u.google_avatar_url }} size="md" />
                <div className="min-w-0 flex-1">
                  <p className={`text-sm font-semibold truncate ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>
                    {u.name || '(no name)'}
                    {u.id === user?.id && <span className="ml-2 text-[10px] uppercase tracking-wider text-brand-primary">you</span>}
                  </p>
                  <p className={`text-xs truncate ${subText}`}>{u.email || 'no email'}</p>
                  <p className={`text-[11px] ${subText}`}>
                    Joined {u.created_at ? format(new Date(u.created_at), 'MMM d, yyyy') : '—'}
                    {u.last_sign_in_at ? ` · last seen ${format(new Date(u.last_sign_in_at), 'MMM d, yyyy')}` : ''}
                  </p>
                </div>
                {u.id !== user?.id && (
                  <button
                    onClick={() => handleRemove(u)}
                    disabled={removingId === u.id}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-50 text-red-600 hover:bg-red-100 disabled:opacity-50 transition-colors"
                    title="Remove user"
                  >
                    {removingId === u.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    Remove
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
