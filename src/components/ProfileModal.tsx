'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { X, User, Phone } from 'lucide-react'
import { User as AuthUser } from '@supabase/supabase-js'
import UserAvatar from './UserAvatar'

interface ProfileModalProps {
  isOpen: boolean
  onClose: () => void
  user: AuthUser | null
  onProfileUpdated: () => void
}

export default function ProfileModal({ isOpen, onClose, user, onProfileUpdated }: ProfileModalProps) {
  const [displayName, setDisplayName] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [googleAvatarUrl, setGoogleAvatarUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  // Load existing profile data
  useEffect(() => {
    if (user && isOpen) {
      loadProfile()
    }
  }, [user, isOpen])

  const loadProfile = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('name, phone, avatar_url, google_avatar_url')
        .eq('id', user.id)
        .single()

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
        console.error('Error loading profile:', error)
        return
      }

      if (data) {
        setDisplayName(data.name || '')
        setPhoneNumber(data.phone || '')
        setAvatarUrl(data.avatar_url || null)
        setGoogleAvatarUrl(data.google_avatar_url || null)
      }
    } catch (error) {
      console.error('Error loading profile:', error)
    }
  }

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file.')
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const max_size = 128
        let width = img.width
        let height = img.height

        const size = Math.min(width, height)
        canvas.width = max_size
        canvas.height = max_size

        const ctx = canvas.getContext('2d')
        if (ctx) {
          ctx.drawImage(
            img,
            (width - size) / 2,
            (height - size) / 2,
            size,
            size,
            0,
            0,
            max_size,
            max_size
          )
          const dataUrl = canvas.toDataURL('image/jpeg', 0.8)
          setAvatarUrl(dataUrl)
        }
      }
      img.src = event.target?.result as string
    }
    reader.readAsDataURL(file)
  }

  const handleRemoveAvatar = () => {
    setAvatarUrl(null)
  }

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    
    setLoading(true)
    setMessage('')

    try {
      // Check if profile exists
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .single()

      if (existingProfile) {
        // Update existing profile.
        // NOTE: intentionally do NOT write `updated_at` — the column may not
        // exist on the profiles table and would make the whole update fail.
        const { error } = await supabase
          .from('profiles')
          .update({
            name: displayName || null,
            phone: phoneNumber || null,
            avatar_url: avatarUrl,
          })
          .eq('id', user.id)

        if (error) throw error
      } else {
        // Create new profile
        const { error } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            email: user.email,
            name: displayName || null,
            phone: phoneNumber || null,
            avatar_url: avatarUrl,
            google_avatar_url: null
          })

        if (error) throw error
      }

      setMessage('Profile updated successfully!')
      onProfileUpdated()
      setTimeout(() => {
        onClose()
        setMessage('')
      }, 1000)

    } catch (error: any) {
      console.error('Error updating profile:', error)
      const detail = error?.message || error?.error_description || error?.hint || 'Please try again.'
      setMessage(`Failed to update profile: ${detail}`)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-900">Profile Settings</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleUpdateProfile} className="space-y-4">
          {/* Avatar Section */}
          <div className="flex flex-col items-center space-y-3 pb-4 border-b border-gray-100">
            <div className="relative">
              <UserAvatar 
                profile={{ 
                  name: displayName || user?.email || 'User', 
                  avatar_url: avatarUrl, 
                  google_avatar_url: googleAvatarUrl 
                }} 
                size="lg" 
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <label className="cursor-pointer bg-brand-secondary/10 hover:bg-brand-secondary/20 text-brand-secondary px-3 py-1.5 rounded-lg text-xs font-semibold border border-brand-secondary/30 transition-colors">
                <span>Upload Photo</span>
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={handleAvatarChange} 
                />
              </label>
              
              {avatarUrl && (
                <button
                  type="button"
                  onClick={handleRemoveAvatar}
                  className="bg-red-50 hover:bg-red-100 text-red-600 px-3 py-1.5 rounded-lg text-xs font-semibold border border-red-200 transition-colors"
                >
                  Remove Custom
                </button>
              )}
            </div>
            <p className="text-[10px] text-gray-400 text-center">
              Supports JPEG/PNG. Compressed automatically to save space.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <User className="w-4 h-4 inline mr-1" />
              Display Name
            </label>
            <input
              type="text"
              placeholder="Enter your name (optional)"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full p-3 border rounded-lg text-gray-900 placeholder-gray-500 border-gray-300 focus:border-brand-primary focus:ring-1 focus:ring-brand-primary"
            />
            <p className="text-xs text-gray-500 mt-1">
              This name will be shown instead of your email
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Phone className="w-4 h-4 inline mr-1" />
              Phone Number
            </label>
            <input
              type="tel"
              placeholder="Enter your phone number (optional)"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="w-full p-3 border rounded-lg text-gray-900 placeholder-gray-500 border-gray-300 focus:border-brand-primary focus:ring-1 focus:ring-brand-primary"
            />
            <p className="text-xs text-gray-500 mt-1">
              For WhatsApp notifications (coming soon)
            </p>
          </div>

          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="text-sm text-gray-600">
              <strong>Email:</strong> {user?.email}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Email cannot be changed
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand-primary text-white py-3 px-4 rounded font-display uppercase tracking-wider text-sm font-semibold hover:bg-brand-primary/90 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Saving...' : 'Save Profile'}
          </button>
        </form>

        {message && (
          <p className={`mt-4 text-sm text-center ${message.includes('successfully') ? 'text-brand-secondary' : 'text-red-600'}`}>
            {message}
          </p>
        )}
      </div>
    </div>
  )
}