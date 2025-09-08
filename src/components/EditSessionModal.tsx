'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { X, Calendar, MapPin, Users, FileText, Clock } from 'lucide-react'
import { Session } from '@/types'

interface EditSessionModalProps {
  isOpen: boolean
  onClose: () => void
  onSessionUpdated: () => void
  session: Session | null
}

export default function EditSessionModal({ isOpen, onClose, onSessionUpdated, session }: EditSessionModalProps) {
  const [customLocation, setCustomLocation] = useState('')
  const [title, setTitle] = useState('')
  const [dateTime, setDateTime] = useState('')
  const [location, setLocation] = useState('Pick & Match Megabox')
  const [maxPlayers, setMaxPlayers] = useState(8)
  const [duration, setDuration] = useState(1.0)
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const locationOptions = [
    'Pick & Match Megabox',
    'Stackd Hopewell',
    'Go Park Sai Sha',
    'Bay Pickle',
    'Laguna Block 27'
  ]

  // Populate form when session changes
  useEffect(() => {
    if (session && isOpen) {
      setTitle(session.title)
      
      // Parse the stored date and format it for datetime-local input
      const sessionDate = new Date(session.date_time)
      // Format as YYYY-MM-DDTHH:mm for the input
      const year = sessionDate.getFullYear()
      const month = String(sessionDate.getMonth() + 1).padStart(2, '0')
      const day = String(sessionDate.getDate()).padStart(2, '0')
      const hours = String(sessionDate.getHours()).padStart(2, '0')
      const minutes = String(sessionDate.getMinutes()).padStart(2, '0')
      const localDateTime = `${year}-${month}-${day}T${hours}:${minutes}`
      setDateTime(localDateTime)
      
      setLocation(session.location)
      setMaxPlayers(session.max_players)
      setDuration(session.duration_hours || 1.0)
      setNotes(session.notes || '')
    }
  }, [session, isOpen])

  // Cost calculation logic (same as create modal)
  const calculateCost = (dateTime: string, durationHours: number) => {
    if (!dateTime) return { totalCost: 0, isPeak: false }
    
    const sessionDate = new Date(dateTime)
    const dayOfWeek = sessionDate.getDay()
    const hour = sessionDate.getHours()
    
    let isPeak = false
    
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      isPeak = hour >= 17 || hour <= 23
    } else {
      isPeak = hour >= 10 && hour <= 23
    }
    
    const hourlyRate = isPeak ? 390 : 290
    const totalCost = hourlyRate * durationHours
    
    return { totalCost, isPeak: isPeak }
  }

  const { totalCost, isPeak } = calculateCost(dateTime, duration)

  if (!isOpen || !session) return null

  const handleUpdateSession = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('You must be logged in to edit a session')

      // Check if user can edit (creator or admin)
      const isCreator = user.id === session.created_by
      const isAdmin = user.email === 'bobbykyn@gmail.com'
      
      if (!isCreator && !isAdmin) {
        throw new Error('You can only edit sessions you created')
      }

      // Simply append seconds and timezone to make it a valid ISO string
      const isoDateTime = dateTime + ':00+08:00' // Hong Kong timezone (UTC+8)
      
      const { error } = await supabase
        .from('sessions')
        .update({
          title,
          date_time: isoDateTime,
          location: location === 'Custom Location...' ? customLocation : location,
          max_players: maxPlayers,
          duration_hours: duration,
          total_cost: totalCost,
          is_peak_time: isPeak,
          cost_per_person: totalCost / Math.max(1, session.rsvps?.filter(r => r.status === 'yes').length || 1),
          notes: notes || null,
        })
        .eq('id', session.id)

      if (error) throw error

      // Send email notifications to participants
      try {
        const response = await fetch('/api/send-session-update-email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ sessionId: session.id }),
        })
        
        if (!response.ok) {
          console.error('Failed to send update notifications')
        }
      } catch (emailError) {
        console.error('Email notification error:', emailError)
      }

      setMessage('Session updated successfully!')
      setTimeout(() => {
        onClose()
        onSessionUpdated()
        setMessage('')
      }, 1000)

    } catch (error: any) {
      setMessage(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-900">Edit Session</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleUpdateSession} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <FileText className="w-4 h-4 inline mr-1" />
              Session Title
            </label>
            <input
              type="text"
              placeholder="Pickle Time!"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full p-3 border rounded-lg text-gray-900 placeholder-gray-500 border-gray-300 focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Calendar className="w-4 h-4 inline mr-1" />
              Date & Time
            </label>
            <input
              type="datetime-local"
              value={dateTime}
              onChange={(e) => setDateTime(e.target.value)}
              className="w-full p-3 border rounded-lg text-gray-900 border-gray-300 focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <MapPin className="w-4 h-4 inline mr-1" />
              Location
            </label>
            {location === 'Custom Location...' ? (
              <input
                type="text"
                placeholder="Enter custom location"
                value={customLocation}
                onChange={(e) => setCustomLocation(e.target.value)}
                className="w-full p-3 border rounded-lg text-gray-900 placeholder-gray-500 border-gray-300 focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                required
              />
            ) : (
              <select
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full p-3 border rounded-lg text-gray-900 border-gray-300 focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                required
              >
                {locationOptions.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
                <option value="Custom Location...">Custom Location...</option>
              </select>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Users className="w-4 h-4 inline mr-1" />
              Max Players
            </label>
            <input
              type="number"
              min="2"
              max="20"
              value={maxPlayers}
              onChange={(e) => setMaxPlayers(Number(e.target.value))}
              className="w-full p-3 border rounded-lg text-gray-900 border-gray-300 focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Clock className="w-4 h-4 inline mr-1" />
              Duration (Hours)
            </label>
            <select
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="w-full p-3 border rounded-lg text-gray-900 border-gray-300 focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
            >
              <option value={0.5}>30 minutes</option>
              <option value={1}>1 hour</option>
              <option value={1.5}>1.5 hours</option>
              <option value={2}>2 hours</option>
              <option value={2.5}>2.5 hours</option>
              <option value={3}>3 hours</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes (Optional)
            </label>
            <textarea
              placeholder="Bring water bottles, meet at main entrance..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full p-3 border rounded-lg text-gray-900 placeholder-gray-500 border-gray-300 focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
            />
          </div>

          {/* Cost Preview - Only for Megabox */}
          {location.toLowerCase().includes('megabox') && (
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="text-sm text-gray-600">
                <strong>Cost Preview:</strong> ${totalCost} total ({isPeak ? 'Peak' : 'Off-peak'} rate)
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-teal-700 text-white py-3 px-4 rounded-lg font-medium hover:bg-teal-800 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Updating...' : 'Update Session'}
          </button>
        </form>

        {message && (
          <p className={`mt-4 text-sm ${message.includes('successfully') ? 'text-teal-600' : 'text-red-600'}`}>
            {message}
          </p>
        )}
      </div>
    </div>
  )
}