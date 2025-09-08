
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { X, Calendar, MapPin, Users, FileText, Clock } from 'lucide-react'

interface CreateSessionModalProps {
  isOpen: boolean
  onClose: () => void
  onSessionCreated: () => void
  selectedDate?: Date | null
}

export default function CreateSessionModal({ isOpen, onClose, onSessionCreated, selectedDate }: CreateSessionModalProps) {
  const [customLocation, setCustomLocation] = useState('')
  
  // Smart default date/time
  const getDefaultDateTime = () => {
    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth()
    
    // Use 2025 until Jan 1, 2026, then use 2026
    const defaultYear = (currentYear === 2025 && currentMonth === 11) ? 2026 : 2025
    
    // Set to next Friday at 6 PM as default
    const nextFriday = new Date()
    nextFriday.setFullYear(defaultYear)
    const daysUntilFriday = (5 - nextFriday.getDay() + 7) % 7 || 7
    nextFriday.setDate(nextFriday.getDate() + daysUntilFriday)
    nextFriday.setHours(18, 0, 0, 0) // 6 PM
    
    return nextFriday.toISOString().slice(0, 16) // Format for datetime-local input
  }
  
  const [title, setTitle] = useState('')
  const [dateTime, setDateTime] = useState(getDefaultDateTime())
  const [location, setLocation] = useState('Pick & Match Megabox')

  // Add location options
  const locationOptions = [
    'Pick & Match Megabox',
    'Stackd Hopewell',
    'Go Park Sai Sha',
    'Bay Pickle',
    'Laguna Block 27'
  ]
  
  const [maxPlayers, setMaxPlayers] = useState(8) // Fixed: Default to 8, input field instead of dropdown
  const [duration, setDuration] = useState(1.0)
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  
  // Update date when selectedDate prop changes
  useEffect(() => {
    if (isOpen && selectedDate) {
      const selected = new Date(selectedDate)
      selected.setHours(18, 0, 0, 0) // Default to 6 PM
      setDateTime(selected.toISOString().slice(0, 16))
    }
  }, [isOpen, selectedDate])

  // Cost calculation logic
  const calculateCost = (dateTime: string, durationHours: number) => {
    if (!dateTime) return { totalCost: 0, isPeak: false }
    
    const sessionDate = new Date(dateTime)
    const dayOfWeek = sessionDate.getDay() // 0 = Sunday, 6 = Saturday
    const hour = sessionDate.getHours()
    
    // Peak time logic:
    // Mon-Fri (1-5): 5pm-12am = peak
    // Weekends (0,6): 10am-12am = peak
    // Off-peak: Mon-Fri 10am-5pm
    
    let isPeak = false
    
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      // Weekdays: peak is 5pm-12am (17-23)
      isPeak = hour >= 17 || hour <= 23
    } else {
      // Weekends: peak is 10am-12am (10-23)
      isPeak = hour >= 10 && hour <= 23
    }
    
    const hourlyRate = isPeak ? 390 : 290
    const totalCost = hourlyRate * durationHours
    
    return { totalCost, isPeak: isPeak }
  }

  const { totalCost, isPeak } = calculateCost(dateTime, duration)

  if (!isOpen) return null

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('You must be logged in to create a session')

      // Simply append seconds and timezone to make it a valid ISO string
      const isoDateTime = dateTime + ':00+08:00' // Hong Kong timezone (UTC+8)
      
      const { data, error } = await supabase
        .from('sessions')
        .insert({
          title,
          date_time: isoDateTime,
          location: location === 'Custom Location...' ? customLocation : location,
          max_players: maxPlayers,
          duration_hours: duration,
          total_cost: totalCost,
          is_peak_time: isPeak,
          cost_per_person: totalCost,
          notes: notes || null,
          created_by: user.id
        })
        .select('id')
        .single()

      if (error) throw error

      // Send email notifications
      try {
        const response = await fetch('/api/send-session-email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ sessionId: data?.id }),
        })
        
        if (!response.ok) {
          console.error('Failed to send email notifications')
        }
      } catch (emailError) {
        console.error('Email notification error:', emailError)
        // Don't fail the session creation if email fails
      }

      setMessage('Session created successfully!')
      setTimeout(() => {
        onClose()
        onSessionCreated()
        // Reset form
        setTitle('')
        setDateTime(getDefaultDateTime())
        setLocation('Pick & Match Megabox')
        setMaxPlayers(8)
        setDuration(1.0)
        setNotes('')
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
          <h2 className="text-xl font-bold text-gray-900">Create New Session</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleCreateSession} className="space-y-4">
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
            {loading ? 'Creating...' : 'Create Session'}
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