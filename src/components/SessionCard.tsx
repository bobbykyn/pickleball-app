import { Session } from '@/types'
import { format } from 'date-fns'
import { Calendar, MapPin, Users, Clock, Trash2, Edit, Loader2, X, Plus, Minus } from 'lucide-react'
import UserAvatar from './UserAvatar'
import { Share2 } from 'lucide-react';
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

type AddedUser = { id: string; name: string; avatar_url?: string }

interface SessionCardProps {
  session: Session
  currentUserId?: string
  currentUserEmail?: string
  onDelete?: (sessionId: string) => void
  onEdit?: (session: Session) => void
  onRSVP?: (
    sessionId: string,
    status: 'yes' | 'maybe' | 'no',
    opts?: { guestCount?: number; guestNames?: string[]; addedUsers?: AddedUser[] }
  ) => void
  rsvpLoading?: boolean
  darkMode?: boolean
  onViewPlayer?: (userId: string, profile?: { name?: string; avatar_url?: string | null; google_avatar_url?: string | null }) => void
}

export default function SessionCard({ session, currentUserId, currentUserEmail, onDelete, onEdit, onRSVP, rsvpLoading = false, darkMode = false, onViewPlayer }: SessionCardProps) {
  const [joinMode, setJoinMode] = useState<'closed' | 'choose' | 'plus1' | 'plusmore'>('closed')
  const [allUsers, setAllUsers] = useState<Array<{ id: string; name: string; avatar_url?: string }>>([])
  const [picked, setPicked] = useState<AddedUser[]>([])
  const [guestNames, setGuestNames] = useState<string[]>([])
  const [unnamedGuestCount, setUnnamedGuestCount] = useState(0)
  const [pickerSearch, setPickerSearch] = useState('')
  const [showPickerDropdown, setShowPickerDropdown] = useState(false)

  useEffect(() => {
    if (joinMode !== 'plus1' && joinMode !== 'plusmore') return
    if (allUsers.length > 0) return
    supabase
      .from('profiles')
      .select('id, name, avatar_url, google_avatar_url')
      .order('name')
      .then(({ data }) => {
        if (data) setAllUsers(data as any)
      })
  }, [joinMode, allUsers.length])

  const resetPicker = () => {
    setPicked([])
    setGuestNames([])
    setUnnamedGuestCount(0)
    setPickerSearch('')
    setShowPickerDropdown(false)
    setJoinMode('closed')
  }

  const isCreator = currentUserId === session.created_by
  const isAdmin = currentUserEmail === 'bobbykyn@gmail.com'
  const canDelete = isCreator || isAdmin
  const canEdit = isCreator || isAdmin
  
  const yesRSVPs = session.rsvps?.filter(rsvp => rsvp.status === 'yes') || []
  //const maybeRSVPs = session.rsvps?.filter(rsvp => rsvp.status === 'maybe') || []
  
  const handleDelete = async () => {
    if (!onDelete) return
    
    const confirmed = window.confirm('Are you sure you want to delete this session? This cannot be undone.')
    if (confirmed) {
      onDelete(session.id)
    }
  }
  
  const shareToWhatsApp = () => {
    const dateObj = new Date(session.date_time)
    const sessionDate = dateObj.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    const timeStr = format(dateObj, 'h:mm a')
    const yesRSVPsCount = session.rsvps?.filter(r => r.status === 'yes').length || 0
    const totalGuestSeatsCount = session.rsvps?.reduce((sum, r) => sum + (r.status === 'yes' ? (r.guest_count || 0) : 0), 0) || 0
    const attendees = yesRSVPsCount + totalGuestSeatsCount
    
    const message = encodeURIComponent(
      `🎾 Pickleball Session!\n\n` +
      `📅 ${sessionDate}\n` +
      `⏰ ${timeStr}\n` +
      `📍 ${session.location}\n` +
      //`💰 $${perPerson.toFixed(2)} HKD per person\n` +
      `👥 ${attendees} players confirmed\n\n` +
      `Join here: https://pickleball-app-1.vercel.app/`
    );
    
    window.open(`https://wa.me/?text=${message}`, '_blank');
  };

  const currentUserRSVP = session.rsvps?.find(rsvp => rsvp.user_id === currentUserId)
  const userRSVPStatus = currentUserRSVP?.status

  const openEditGuests = () => {
    if (currentUserRSVP) {
      const names = currentUserRSVP.guest_names || []
      const totalCount = currentUserRSVP.guest_count || 0
      setGuestNames(names)
      setUnnamedGuestCount(Math.max(0, totalCount - names.length))
    }
    setJoinMode('plusmore')
  }
  
  const handleRSVP = (status: 'yes' | 'no', opts?: { guestCount?: number; guestNames?: string[]; addedUsers?: AddedUser[] }) => {
    if (!onRSVP || !currentUserId) return
    onRSVP(session.id, status, opts)
  }

  const submitJoin = () => {
    const guestCount = unnamedGuestCount + guestNames.length
    handleRSVP('yes', { guestCount, guestNames, addedUsers: picked })
    resetPicker()
  }

  // exclude current user, already-RSVP'd users, and already-picked users from the picker
  const pickerCandidates = allUsers
    .filter(u => u.id !== currentUserId)
    .filter(u => !yesRSVPs.some(r => r.user_id === u.id))
    .filter(u => !picked.some(p => p.id === u.id))
    .filter(u => u.name?.toLowerCase().includes(pickerSearch.toLowerCase()))
    .slice(0, 5)

  const totalGuestSeats = (session.rsvps || []).reduce((sum, r) => sum + (r.status === 'yes' ? (r.guest_count || 0) : 0), 0)
  const attendeeCount = (yesRSVPs.length + totalGuestSeats) || 1
  const totalCost = session.total_cost || 0
  const costPerPerson = totalCost / attendeeCount
  const isPeakTime = session.is_peak_time
  const durationHours = session.duration_hours || 1

  return (
    <div className={`rounded-xl shadow-lg p-6 hover:shadow-xl transition-all duration-200 border ${
      session.is_private
    ? darkMode 
      ? 'bg-purple-900/20 border-purple-700/50' 
      : 'bg-purple-50 border-purple-200'
    : darkMode 
      ? 'bg-gray-800 border-gray-700 hover:bg-gray-750' 
      : 'bg-white border-gray-100'
    }`}>
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
  <div className="flex flex-col gap-1">
    <h3 className={`text-xl font-bold ${darkMode ? 'text-gray-100' : 'text-gray-900'} flex items-center gap-2 flex-wrap`}>
      {session.is_private && <span className="text-xs bg-purple-600 text-white px-2 py-0.5 rounded">🔒 Private</span>}
      {session.title}
    </h3>
    <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
      by {session.profiles?.name || 'Unknown'}
    </span>
  </div>
  
  <div className="flex items-center space-x-2">
          <div className={`flex items-center space-x-1 px-3 py-1 rounded-full text-sm font-medium ${
            darkMode 
              ? 'bg-brand-secondary/25 text-brand-secondary' 
              : 'bg-brand-secondary/15 text-brand-secondary'
          }`}>
            <Users className="w-4 h-4" />
            <span>{yesRSVPs.length + totalGuestSeats}/{session.max_players}</span>
          </div>
          
          {/* Action buttons for creators/admin */}
          <div className="flex items-center space-x-1">
            {/* Share button for private sessions */}
            {session.is_private && isCreator && (
              <button
                onClick={() => {
                  const shareUrl = `${window.location.origin}/session/${session.id}?private=${session.private_key}`
                  navigator.clipboard.writeText(shareUrl)
                  alert('Share link copied to clipboard!')
                }}
                className={`p-2 rounded-lg transition-colors ${
                  darkMode
                    ? 'text-green-400 hover:bg-green-900/20'
                    : 'text-green-600 hover:bg-green-50'
                }`}
                title="Copy share link"
              >
                📋
              </button>
            )}
            
            {canEdit && onEdit && (
              <button
                onClick={() => onEdit(session)}
                className={`p-2 rounded-lg transition-colors ${
                  darkMode
                    ? 'text-blue-400 hover:bg-blue-900/20'
                    : 'text-blue-600 hover:bg-blue-50'
                }`}
                title={isAdmin ? "Edit session (Admin)" : "Edit session"}
              >
                <Edit className="w-4 h-4" />
              </button>
            )}
            
            {canDelete && (
              <button
                onClick={handleDelete}
                className={`p-2 rounded-lg transition-colors ${
                  darkMode
                    ? 'text-red-400 hover:bg-red-900/20'
                    : 'text-red-600 hover:bg-red-50'
                }`}
                title={isAdmin ? "Delete session (Admin)" : "Delete session"}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
      
      {/* Details */}
      <div className="space-y-3 mb-6">
        <div className={`flex items-center ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
          <Calendar className="w-5 h-5 mr-3 text-blue-500" />
          <span className="font-medium">
            {format(new Date(session.date_time), 'EEEE, MMMM do')}
          </span>
        </div>
        
        <div className={`flex items-center ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
          <Clock className="w-5 h-5 mr-3 text-orange-500" />
          <span className="font-medium">
            {format(new Date(session.date_time), 'h:mm a')}
          </span>
        </div>
        
        <div className={`flex items-center ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
          <MapPin className="w-5 h-5 mr-3 text-red-500" />
          <span className="font-medium">{session.location}</span>
        </div>
      </div>


      
      {/* Notes */}
      {session.notes && (
        <div className={`mb-6 p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
          <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{session.notes}</p>
        </div>
      )}
      
      {/* RSVP Status - More spacing */}
      <div className="my-8">
        <div className={`flex items-center space-x-1 px-3 py-1 rounded-full text-sm font-medium mb-4 ${
          darkMode 
            ? 'bg-brand-secondary/25 text-brand-secondary' 
            : 'bg-brand-secondary/15 text-brand-secondary'
        }`}>
          <span>Who's Playing:</span>
          {/* {maybeRSVPs.length > 0 && (
            <span className="text-yellow-600">{maybeRSVPs.length} maybe</span>
          )} */}
        </div>
        {yesRSVPs.length > 0 ? (
          <div className="flex flex-wrap gap-4">
            {yesRSVPs.map((rsvp) => (
              <div key={rsvp.id} className="flex flex-wrap gap-2 items-center">
                <button
                  type="button"
                  onClick={() => onViewPlayer?.(rsvp.user_id, rsvp.profiles)}
                  disabled={!onViewPlayer}
                  title={onViewPlayer ? `View ${rsvp.profiles?.name || 'player'}'s stats` : undefined}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-full transition-colors ${
                    darkMode
                      ? 'bg-brand-secondary/25 text-brand-secondary'
                      : 'bg-brand-secondary/10 text-brand-secondary'
                  } ${onViewPlayer ? 'hover:ring-2 hover:ring-brand-secondary/50 cursor-pointer' : 'cursor-default'}`}
                >
                  <UserAvatar profile={rsvp.profiles} size="sm" />
                  <span className="text-sm font-medium">
                    {rsvp.profiles?.name || 'Player'}
                  </span>
                </button>
                {rsvp.guest_names?.map((gname, gi) => (
                  <div key={`g-${rsvp.id}-${gi}`} className={`flex items-center px-3 py-2 rounded-full text-sm font-medium ${
                    darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'
                  }`}>
                    {gname} <span className="ml-1 opacity-60">(guest of {rsvp.profiles?.name || 'player'})</span>
                  </div>
                ))}
                {(rsvp.guest_count || 0) > (rsvp.guest_names?.length || 0) && (
                  <div className={`flex items-center px-3 py-2 rounded-full text-sm font-medium ${
                    darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'
                  }`}>
                    +{(rsvp.guest_count || 0) - (rsvp.guest_names?.length || 0)} guest{((rsvp.guest_count || 0) - (rsvp.guest_names?.length || 0)) > 1 ? 's' : ''} of {rsvp.profiles?.name || 'player'}
                  </div>
                )}
              </div>
            ))}

{/* Show session-level manual participants (legacy, from create flow) */}
{session.manual_participants?.map((name: string, index: number) => (
  <div key={`manual-${index}`} className={`flex items-center space-x-2 px-3 py-2 rounded-full ${
    darkMode
      ? 'bg-gray-700 text-gray-300'
      : 'bg-gray-100 text-gray-700'
  }`}>
    <span className="text-sm font-medium">{name} (guest)</span>
  </div>
))}
          </div>
        ) : (
          <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            No one has joined yet - be the first!
          </p>
        )}
      </div>
      
      {/* Action Buttons */}
      {currentUserId && (
        <div className="space-y-3">
          <div className="flex gap-3">
            <button
              disabled={rsvpLoading}
              onClick={() => {
                if (userRSVPStatus === 'yes') {
                  if (joinMode === 'closed') {
                    openEditGuests()
                  } else {
                    resetPicker()
                  }
                } else {
                  setJoinMode(prev => (prev === 'closed' ? 'choose' : 'closed'))
                }
              }}
              className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-60 ${
                userRSVPStatus === 'yes'
                  ? (joinMode === 'closed'
                      ? 'bg-brand-secondary text-white hover:bg-brand-secondary/90 cursor-pointer'
                      : 'bg-gray-600 text-white hover:bg-gray-700 cursor-pointer')
                  : 'bg-brand-primary text-white hover:bg-brand-primary/90'
              }`}
            >
              {rsvpLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              {userRSVPStatus === 'yes'
                ? (joinMode === 'closed' ? '✓ Going (Edit Guests)' : 'Close Edit')
                : (joinMode === 'closed' ? 'Join!' : 'Close')}
            </button>

            {userRSVPStatus === 'yes' && (
              <button
                disabled={rsvpLoading}
                onClick={() => handleRSVP('no')}
                className={`px-6 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-60 ${
                  darkMode
                    ? 'bg-red-800/30 text-red-300 hover:bg-red-800/50'
                    : 'bg-red-100 text-red-700 hover:bg-red-200'
                }`}
              >
                {rsvpLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                Cancel
              </button>
            )}

            <button
              onClick={shareToWhatsApp}
              className={`p-3 rounded-lg transition-colors ${
                darkMode
                  ? 'bg-green-800 text-green-200 hover:bg-green-700'
                  : 'bg-green-100 text-green-700 hover:bg-green-200'
              }`}
              title="Share to WhatsApp"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
              </svg>
            </button>
          </div>

          {/* Initial choose panel */}
          {joinMode === 'choose' && userRSVPStatus !== 'yes' && (
            <div className={`p-3 rounded-lg border ${darkMode ? 'bg-gray-700/40 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
              <p className={`text-xs mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Who's coming?</p>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => { handleRSVP('yes'); setJoinMode('closed') }}
                  className="py-2 px-3 rounded-lg text-sm font-medium bg-brand-primary text-white hover:bg-brand-primary/90"
                >
                  Just me
                </button>
                <button
                  onClick={() => setJoinMode('plus1')}
                  className={`py-2 px-3 rounded-lg text-sm font-medium ${darkMode ? 'bg-gray-600 text-gray-100 hover:bg-gray-500' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-100'}`}
                >
                  +1
                </button>
                <button
                  onClick={() => setJoinMode('plusmore')}
                  className={`py-2 px-3 rounded-lg text-sm font-medium ${darkMode ? 'bg-gray-600 text-gray-100 hover:bg-gray-500' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-100'}`}
                >
                  +more
                </button>
              </div>
            </div>
          )}

          {/* Picker panel (+1 or +more) */}
          {(joinMode === 'plus1' || joinMode === 'plusmore') && (() => {
            const cap = joinMode === 'plus1' ? 1 : Infinity
            const totalAdded = picked.length + guestNames.length + unnamedGuestCount
            const atCap = totalAdded >= cap
            return (
              <div className={`p-3 rounded-lg border space-y-3 ${darkMode ? 'bg-gray-700/40 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                <div className="flex justify-between items-center">
                  <p className={`text-xs ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                    {joinMode === 'plus1' ? 'Bring one friend' : 'Bring friends'}
                  </p>
                  <button onClick={resetPicker} className={`${darkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'}`}>
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Friend / guest search */}
                <div className="relative">
                  <input
                    type="text"
                    value={pickerSearch}
                    onChange={(e) => { setPickerSearch(e.target.value); setShowPickerDropdown(e.target.value.length > 0) }}
                    onFocus={() => setShowPickerDropdown(pickerSearch.length > 0)}
                    placeholder="Search friend or type guest name..."
                    disabled={atCap}
                    className={`w-full p-2 rounded border text-sm ${darkMode ? 'bg-gray-800 border-gray-600 text-gray-100 placeholder-gray-500' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'} disabled:opacity-50`}
                  />
                  {showPickerDropdown && !atCap && (
                    <div className={`absolute z-10 w-full mt-1 rounded-lg shadow-lg max-h-48 overflow-y-auto border ${darkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-300'}`}>
                      {pickerCandidates.length > 0 ? (
                        pickerCandidates.map(u => (
                          <button
                            key={u.id}
                            type="button"
                            onClick={() => {
                              setPicked(prev => [...prev, { id: u.id, name: u.name, avatar_url: u.avatar_url }])
                              setPickerSearch('')
                              setShowPickerDropdown(false)
                            }}
                            className={`w-full px-3 py-2 text-left text-sm ${darkMode ? 'text-gray-100 hover:bg-gray-700' : 'text-gray-900 hover:bg-gray-100'}`}
                          >
                            {u.name}
                          </button>
                        ))
                      ) : (
                        pickerSearch.trim() && (
                          <button
                            type="button"
                            onClick={() => {
                              setGuestNames(prev => [...prev, pickerSearch.trim()])
                              setPickerSearch('')
                              setShowPickerDropdown(false)
                            }}
                            className={`w-full px-3 py-2 text-left text-sm ${darkMode ? 'text-gray-100 hover:bg-gray-700' : 'text-gray-900 hover:bg-gray-100'}`}
                          >
                            Add "{pickerSearch.trim()}" as guest
                          </button>
                        )
                      )}
                    </div>
                  )}
                </div>

                {/* Selected pills */}
                {(picked.length > 0 || guestNames.length > 0) && (
                  <div className="flex flex-wrap gap-2">
                    {picked.map(u => (
                      <span key={u.id} className="inline-flex items-center gap-1 px-2 py-1 bg-brand-secondary/15 text-brand-secondary rounded-full text-xs whitespace-nowrap">
                        {u.name}
                        <button onClick={() => setPicked(prev => prev.filter(p => p.id !== u.id))}><X className="w-3 h-3" /></button>
                      </span>
                    ))}
                    {guestNames.map((g, i) => (
                      <span key={`${g}-${i}`} className="inline-flex items-center gap-1 px-2 py-1 bg-gray-200 text-gray-800 rounded-full text-xs">
                        {g} (guest)
                        <button onClick={() => setGuestNames(prev => prev.filter((_, idx) => idx !== i))}><X className="w-3 h-3" /></button>
                      </span>
                    ))}
                  </div>
                )}

                {/* Unnamed guest stepper — only in +more */}
                {joinMode === 'plusmore' && (
                  <div className="flex items-center justify-between">
                    <span className={`text-xs ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Unnamed guests</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setUnnamedGuestCount(c => Math.max(0, c - 1))}
                        className={`p-1 rounded ${darkMode ? 'bg-gray-600 text-gray-100 hover:bg-gray-500' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-100'}`}
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className={`w-6 text-center text-sm font-medium ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>{unnamedGuestCount}</span>
                      <button
                        onClick={() => setUnnamedGuestCount(c => c + 1)}
                        className={`p-1 rounded ${darkMode ? 'bg-gray-600 text-gray-100 hover:bg-gray-500' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-100'}`}
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                )}

                {joinMode === 'plus1' && atCap && (
                  <p className={`text-xs ${darkMode ? 'text-amber-400' : 'text-amber-600'}`}>+1 cap reached. Use +more for additional.</p>
                )}

                <button
                  disabled={rsvpLoading}
                  onClick={submitJoin}
                  className="w-full py-2 px-3 rounded-lg font-medium text-sm bg-brand-primary text-white hover:bg-brand-primary/90 disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {rsvpLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {userRSVPStatus === 'yes' ? 'Update Guests' : 'Confirm Join'} {totalAdded > 0 ? `(+${totalAdded})` : ''}
                </button>
              </div>
            )
          })()}
        </div>
      )}
    </div>
  )
}