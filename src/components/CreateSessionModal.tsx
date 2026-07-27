
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { X, Calendar, MapPin, Users, FileText, Clock } from 'lucide-react'
import CourtPicker, { formatCourts } from './CourtPicker'

interface CreateSessionModalProps {
  isOpen: boolean
  onClose: () => void
  onSessionCreated: () => void
  selectedDate?: Date | null
}

/** Short names used when a venue appears inside an auto-generated title. */
const VENUE_SHORT: Record<string, string> = {
  'Pick & Match Megabox': 'Megabox',
  'Stackd Hopewell': 'Stackd',
  'Go Park Sai Sha': 'Go Park',
  'Bay Pickle': 'Bay Pickle',
  'Laguna Block 27': 'Laguna',
}

const CN_WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']

/** "31/7 (五) 7-9pm (Megabox) - [Court 1]" — the default when the title is blank. */
function buildAutoTitle(dt: string, durationHours: number, loc: string, custom: string, courts: string[]) {
  if (!dt) return ''
  const start = new Date(dt)
  if (isNaN(start.getTime())) return ''

  const end = new Date(start.getTime() + durationHours * 60 * 60 * 1000)

  const clock = (d: Date, withMeridiem: boolean) => {
    const mer = d.getHours() >= 12 ? 'pm' : 'am'
    const h = d.getHours() % 12 || 12
    const m = d.getMinutes()
    const base = m === 0 ? `${h}` : `${h}.${String(m).padStart(2, '0')}`
    return withMeridiem ? `${base}${mer}` : base
  }

  // Only repeat am/pm on the start time when the session crosses midday.
  const sameHalf = (start.getHours() >= 12) === (end.getHours() >= 12)
  const timeRange = `${clock(start, !sameHalf)}-${clock(end, true)}`

  const stamp = `${start.getDate()}/${start.getMonth() + 1} (${CN_WEEKDAYS[start.getDay()]}) ${timeRange}`

  const venueRaw = (loc === 'Custom Location...' ? custom : loc).trim()
  const venue = VENUE_SHORT[venueRaw] || venueRaw

  return (venue ? `${stamp} (${venue})` : stamp) + formatCourts(courts)
}

export default function CreateSessionModal({ isOpen, onClose, onSessionCreated, selectedDate }: CreateSessionModalProps) {
  const [customLocation, setCustomLocation] = useState('')
  
  const toLocalDateTimeString = (date: Date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    return `${year}-${month}-${day}T${hours}:${minutes}`
  }

  // Smart default date/time — next Friday at 6 PM (year derived from today)
  const getDefaultDateTime = () => {
    const nextFriday = new Date()
    const daysUntilFriday = (5 - nextFriday.getDay() + 7) % 7 || 7
    nextFriday.setDate(nextFriday.getDate() + daysUntilFriday)
    nextFriday.setHours(18, 0, 0, 0) // 6 PM
    return toLocalDateTimeString(nextFriday)
  }

  const getMinDateTime = () => {
    const now = new Date()
    now.setHours(now.getHours() + 1, 0, 0, 0) // Round up to next hour
    return toLocalDateTimeString(now)
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
  
  const [courts, setCourts] = useState<string[]>([])
  const [multipleCourts, setMultipleCourts] = useState(false)
  const [maxPlayers, setMaxPlayers] = useState(8) // Fixed: Default to 8, input field instead of dropdown
  const [duration, setDuration] = useState(1.0)
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [preAddedUsers, setPreAddedUsers] = useState<string[]>([]) // For autocomplete user selection
const [manualNames, setManualNames] = useState<string[]>([]) // For non-registered names
const [userSearchTerm, setUserSearchTerm] = useState('')
const [showUserDropdown, setShowUserDropdown] = useState(false)
const [hideCosts, setHideCosts] = useState(false)
  // Private session states
  const [isPrivate, setIsPrivate] = useState(false)
  const [invitedUsers, setInvitedUsers] = useState<string[]>([])
  const [allUsers, setAllUsers] = useState<any[]>([])
  const [showUserSelector, setShowUserSelector] = useState(false)
  
  // One-shot hint explaining that a blank title falls back to the session details
  const [showTitleHint, setShowTitleHint] = useState(false)
  const [titleHintSeen, setTitleHintSeen] = useState(false)

  // Load all users when modal opens; re-arm the title hint for this creation
  useEffect(() => {
    if (isOpen) {
      loadAllUsers()
      setTitleHintSeen(false)
      setShowTitleHint(false)
    }
  }, [isOpen])

  // Auto-dismiss the hint
  useEffect(() => {
    if (!showTitleHint) return
    const t = setTimeout(() => setShowTitleHint(false), 6000)
    return () => clearTimeout(t)
  }, [showTitleHint])

  // Update date when selectedDate prop changes
  useEffect(() => {
    if (isOpen && selectedDate) {
      const selected = new Date(selectedDate)
      selected.setHours(18, 0, 0, 0) // Default to 6 PM
      setDateTime(toLocalDateTimeString(selected))
    }
  }, [isOpen, selectedDate])

  const loadAllUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name')
        .order('name')
      
      if (!error && data) {
        setAllUsers(data)
      }
    } catch (error) {
      console.error('Error loading users:', error)
    }
  }
// Filter users based on search
const filteredUsers = allUsers.filter(user => 
  !preAddedUsers.includes(user.id) &&
  user.name.toLowerCase().includes(userSearchTerm.toLowerCase())
).slice(0, 5)

const handleAddUser = (userId: string) => {
  setPreAddedUsers([...preAddedUsers, userId])
  setUserSearchTerm('')
  setShowUserDropdown(false)
}

const handleAddManualName = () => {
  if (userSearchTerm.trim() && !manualNames.includes(userSearchTerm.trim())) {
    setManualNames([...manualNames, userSearchTerm.trim()])
    setUserSearchTerm('')
    setShowUserDropdown(false)
  }
}

const handleRemovePreAddedUser = (userId: string) => {
  setPreAddedUsers(preAddedUsers.filter(id => id !== userId))
}

const handleRemoveManualName = (name: string) => {
  setManualNames(manualNames.filter(n => n !== name))
}

  const generatePrivateKey = () => {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
  }

  // Cost calculation logic
const calculateCost = (dateTime: string, durationHours: number, location: string) => {
  if (!dateTime) return { totalCost: 0, isPeak: false }
  
  // Check if it's Stackd Hopewell
  if (location.toLowerCase().includes('stackd') && location.toLowerCase().includes('hopewell')) {
    const baseCourtCost = 400 * durationHours; // $400 per hour
    const perPersonCost = 100 * 1; // Default to 1 person when creating
    const totalCost = baseCourtCost + perPersonCost;
    return { totalCost, isPeak: false, isStackd: true }
  }
  
  // Megabox calculation
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
  
  return { totalCost, isPeak: isPeak, isStackd: false }
}

const { totalCost, isPeak, isStackd } = calculateCost(dateTime, duration, location)

  // ---- Auto-generated session title ----------------------------------------
  // Produces e.g. "31/7 (五) 7-9pm (Megabox)". Used as the live placeholder and
  // as the saved title whenever the creator leaves the field blank.
  const autoTitle = buildAutoTitle(dateTime, duration, location, customLocation, courts)

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
      
      const sessionData: any = {
        // Blank title falls back to the auto-generated session details
        title: title.trim() || autoTitle || 'Pickle Session',
        date_time: isoDateTime,
        location: location === 'Custom Location...' ? customLocation : location,
        max_players: maxPlayers,
        duration_hours: duration,
        total_cost: totalCost,
        is_peak_time: isPeak,
        cost_per_person: totalCost,
        notes: notes || null,
        created_by: user.id,
        courts: courts.map(c => c.trim()).filter(Boolean),
        hide_costs: hideCosts,
  manual_participants: manualNames
        //venue_type: isStackd ? 'stackd_hopewell' : 'megabox'
      }

      // Add private session fields if it's private
      if (isPrivate) {
        sessionData.is_private = true
        sessionData.private_key = generatePrivateKey()
        sessionData.invited_users = invitedUsers
      }

      const { data, error } = await supabase
        .from('sessions')
        .insert(sessionData)
        .select('id')
        .single()

      if (error) throw error
      
      await supabase
        .from('rsvps')
        .insert({
          session_id: data.id,
          user_id: user.id,
          status: 'yes'
        })
      
      // Also add pre-added users as RSVPs
      if (preAddedUsers.length > 0) {
        const rsvpsToAdd = preAddedUsers.map(userId => ({
          session_id: data.id,
          user_id: userId,
          status: 'yes'
        }))
        await supabase.from('rsvps').insert(rsvpsToAdd)
      }
       
      setMessage('Session created successfully!')
      setTimeout(() => {
        onClose()
        onSessionCreated()
        // Reset form
        setTitle('')
        setDateTime(getDefaultDateTime())
        setLocation('Pick & Match Megabox')
        setCourts([])
        setMultipleCourts(false)
        setMaxPlayers(8)
        setDuration(1.0)
        setNotes('')
        setMessage('')
        setPreAddedUsers([]) 
  setManualNames([]) 
  setUserSearchTerm('') 
  setHideCosts(false) 
      }, 1000)

      // Send email notifications in the background (don't wait for it)
      setTimeout(() => {
        fetch('/api/send-session-email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ sessionId: data?.id }),
        }).catch(emailError => {
          console.error('Background email notification error:', emailError)
        })
      }, 100) // Small delay to ensure UI updates first

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
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <FileText className="w-4 h-4 inline mr-1" />
              Session Title <span className="font-normal text-gray-400">(optional)</span>
            </label>
            <input
              type="text"
              placeholder={autoTitle || 'Pickle Time!'}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onFocus={() => {
                if (!titleHintSeen) {
                  setTitleHintSeen(true)
                  setShowTitleHint(true)
                }
              }}
              className="w-full p-3 border rounded-lg text-gray-900 placeholder-gray-400 border-gray-300 focus:border-brand-primary focus:ring-1 focus:ring-brand-primary"
            />

            {showTitleHint && (
              <div className="animate-hint-in absolute left-0 right-0 top-full mt-2 z-20">
                <div className="relative rounded-lg border border-brand-gold/60 bg-[#FFF8E8] px-3 py-2.5 pr-8 shadow-lg">
                  <span className="absolute -top-[7px] left-6 w-3 h-3 rotate-45 border-l border-t border-brand-gold/60 bg-[#FFF8E8]" />
                  <p className="relative text-xs leading-relaxed text-gray-700">
                    Leave this blank and the title becomes the session details — it updates as you pick
                    the date, time and venue.
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowTitleHint(false)}
                    className="absolute top-1.5 right-1.5 p-1 text-gray-400 hover:text-gray-700"
                    aria-label="Dismiss"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Calendar className="w-4 h-4 inline mr-1" />
              Date & Time
            </label>
            <input   type="datetime-local"  
            value={dateTime}
            onChange={(e) => setDateTime(e.target.value)}
            min={getMinDateTime()} 
            className="w-full p-3 border rounded-lg text-gray-900 border-gray-300 focus:border-brand-primary focus:ring-1 focus:ring-brand-primary"
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
                className="w-full p-3 border rounded-lg text-gray-900 placeholder-gray-500 border-gray-300 focus:border-brand-primary focus:ring-1 focus:ring-brand-primary"
                required
              />
            ) : (
              <select
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full p-3 border rounded-lg text-gray-900 border-gray-300 focus:border-brand-primary focus:ring-1 focus:ring-brand-primary"
                required
              >
                {locationOptions.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
                <option value="Custom Location...">Custom Location...</option>
              </select>
            )}
          </div>

          <CourtPicker
            courts={courts}
            onChange={setCourts}
            multiple={multipleCourts}
            onMultipleChange={setMultipleCourts}
          />

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
              className="w-full p-3 border rounded-lg text-gray-900 border-gray-300 focus:border-brand-primary focus:ring-1 focus:ring-brand-primary"
              required
            />
          </div>
{/* Add Participants */}
<div>
  <label className="block text-sm font-medium text-gray-700 mb-1">
    <Users className="w-4 h-4 inline mr-1" />
    Pre-add Participants (Optional)
  </label>
  
  <div className="relative">
    <input
      type="text"
      value={userSearchTerm}
      onChange={(e) => {
        setUserSearchTerm(e.target.value)
        setShowUserDropdown(e.target.value.length > 0)
      }}
      onFocus={() => setShowUserDropdown(userSearchTerm.length > 0)}
      placeholder="Type name to search or add..."
      className="w-full p-3 border rounded-lg text-gray-900 placeholder-gray-500 border-gray-300 focus:border-brand-primary focus:ring-1 focus:ring-brand-primary"
    />
    
    {/* Dropdown */}
    {showUserDropdown && (
      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
        {filteredUsers.length > 0 ? (
          filteredUsers.map(user => (
            <button
              key={user.id}
              type="button"
              onClick={() => handleAddUser(user.id)}
              className="w-full px-4 py-2 text-left hover:bg-gray-100 text-gray-900"
            >
              {user.name}
            </button>
          ))
        ) : (
          <button
            type="button"
            onClick={handleAddManualName}
            className="w-full px-4 py-2 text-left hover:bg-gray-100 text-gray-900"
          >
            Add "{userSearchTerm}" (not registered)
          </button>
        )}
      </div>
    )}
  </div>
  
  {/* Selected Users */}
  {(preAddedUsers.length > 0 || manualNames.length > 0) && (
    <div className="mt-2 flex flex-wrap gap-2">
      {preAddedUsers.map(userId => {
        const user = allUsers.find(u => u.id === userId)
        return (
          <span key={userId} className="inline-flex items-center gap-1 px-3 py-1 bg-brand-secondary/15 text-brand-secondary rounded-full text-sm">
            {user?.name}
            <button
              type="button"
              onClick={() => handleRemovePreAddedUser(userId)}
              className="hover:text-brand-secondary/70"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        )
      })}
      {manualNames.map(name => (
        <span key={name} className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm">
          {name} (guest)
          <button
            type="button"
            onClick={() => handleRemoveManualName(name)}
            className="hover:text-gray-900"
          >
            <X className="w-3 h-3" />
          </button>
        </span>
      ))}
    </div>
  )}
</div>
          {/* Private Session Toggle */}
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="isPrivate"
              checked={isPrivate}
              onChange={(e) => setIsPrivate(e.target.checked)}
              className="w-4 h-4 text-brand-primary border-gray-300 rounded focus:ring-brand-primary"
            />
            <label htmlFor="isPrivate" className="text-sm font-medium text-gray-700">
              🔒 Create Private Session
            </label>
          </div>

          {/* User Selection for Private Sessions */}
          {isPrivate && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                👥 Invite Users
              </label>
              <button
                type="button"
                onClick={() => setShowUserSelector(!showUserSelector)}
                className="w-full p-3 border rounded-lg text-gray-900 border-gray-300 focus:border-brand-primary focus:ring-1 focus:ring-brand-primary bg-white"
              >
                {invitedUsers.length > 0 
                  ? `Selected ${invitedUsers.length} users` 
                  : 'Select users to invite'
                }
              </button>
              
              {showUserSelector && (
                <div className="mt-2 max-h-40 overflow-y-auto border rounded-lg p-2 bg-gray-50">
                  {allUsers.map((user) => (
                    <label key={user.id} className="flex items-center space-x-2 p-1 hover:bg-gray-100 rounded">
                      <input
                        type="checkbox"
                        checked={invitedUsers.includes(user.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setInvitedUsers([...invitedUsers, user.id])
                          } else {
                            setInvitedUsers(invitedUsers.filter(id => id !== user.id))
                          }
                        }}
                        className="w-4 h-4 text-brand-primary border-gray-300 rounded focus:ring-brand-primary"
                      />
                      <span className="text-sm text-gray-700">{user.name}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Clock className="w-4 h-4 inline mr-1" />
              Duration (Hours)
            </label>
            <select
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="w-full p-3 border rounded-lg text-gray-900 border-gray-300 focus:border-brand-primary focus:ring-1 focus:ring-brand-primary"
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
              className="w-full p-3 border rounded-lg text-gray-900 placeholder-gray-500 border-gray-300 focus:border-brand-primary focus:ring-1 focus:ring-brand-primary"
            />
          </div>



          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand-primary text-white py-3 px-4 rounded font-display uppercase tracking-wider text-sm font-semibold hover:bg-brand-primary/90 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Creating...' : 'Create Session'}
          </button>
        </form>

        {message && (
          <p className={`mt-4 text-sm ${message.includes('successfully') ? 'text-brand-secondary' : 'text-red-600'}`}>
            {message}
          </p>
        )}
      </div>
    </div>
  )
}