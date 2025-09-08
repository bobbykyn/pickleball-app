'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { X, User, Phone } from 'lucide-react'
import { User as AuthUser } from '@supabase/supabase-js'

interface ProfileModalProps {
  isOpen: boolean
  onClose: () => void
  user: AuthUser | null
  onProfileUpdated: () => void
}

export default function ProfileModal({ isOpen, onClose, user, onProfileUpdated }: ProfileModalProps) {
  const [displayName, setDisplayName] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
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
        .select('name, phone')
        .eq('id', user.id)
        .single()

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
        console.error('Error loading profile:', error)
        return
      }

      if (data) {
        setDisplayName(data.name || '')
        setPhoneNumber(data.phone || '')
      }
    } catch (error) {
      console.error('Error loading profile:', error)
    }
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
        // Update existing profile
        const { error } = await supabase
          .from('profiles')
          .update({
            name: displayName || null,
            phone: phoneNumber || null,
            updated_at: new Date().toISOString()
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
            phone: phoneNumber || null
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
      setMessage('Failed to update profile. Please try again.')
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
              className="w-full p-3 border rounded-lg text-gray-900 placeholder-gray-500 border-gray-300 focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
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
              className="w-full p-3 border rounded-lg text-gray-900 placeholder-gray-500 border-gray-300 focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
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
            className="w-full bg-teal-700 text-white py-3 px-4 rounded-lg font-medium hover:bg-teal-800 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Saving...' : 'Save Profile'}
          </button>
        </form>

        {message && (
          <p className={`mt-4 text-sm text-center ${message.includes('successfully') ? 'text-teal-600' : 'text-red-600'}`}>
            {message}
          </p>
        )}
      </div>
    </div>
  )
}