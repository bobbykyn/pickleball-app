'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { X, Calendar, MapPin, Users, User } from 'lucide-react'
import { Session } from '@/types'
import { format } from 'date-fns'
import UserAvatar from './UserAvatar'

interface HistoryModalProps {
  isOpen: boolean
  onClose: () => void
  darkMode: boolean
  user: any
}

export default function HistoryModal({ isOpen, onClose, darkMode, user }: HistoryModalProps) {
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isOpen) {
      loadHistoricalSessions()
    }
  }, [isOpen])

  const loadHistoricalSessions = async () => {
    try {
      if (!user) return

      const now = new Date().toISOString()
      const { data: allSessions, error } = await supabase
        .from('sessions')
        .select(`
          *,
          profiles:created_by(name, avatar_url, google_avatar_url),
          rsvps(
            *,
            profiles(name, avatar_url, google_avatar_url)
          )
        `)
        .lt('date_time', now)  // Only past sessions
        .order('date_time', { ascending: false })
        .limit(50)

      if (error) throw error

      // Filter sessions based on privacy settings (same logic as main page)
      const visibleSessions = allSessions?.filter(session => {
        if (!session.is_private) return true
        
        const isCreator = session.created_by === user.id
        const isInvited = session.invited_users?.includes(user.id) || false
        
        return isCreator || isInvited
      }) || []

      setSessions(visibleSessions)
    } catch (error) {
      console.error('Error loading history:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[80vh] overflow-y-auto`}>
        <div className="flex justify-between items-center mb-6">
          <h2 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Game History</h2>
          <button onClick={onClose} className={`${darkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'}`}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <p className={darkMode ? 'text-gray-300' : 'text-gray-600'}>Loading...</p>
        ) : sessions.length > 0 ? (
          <div className="space-y-3">
           {sessions.map((session) => (
  <div key={session.id} className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
    <div className="flex justify-between">
      <div className="flex-1">
        <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{session.title}</h3>
        <div className={`text-sm mt-2 space-y-1 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
          <div className="flex items-center">
            <Calendar className="w-4 h-4 mr-2" />
            {format(new Date(session.date_time), 'MMM dd, yyyy h:mm a')}
          </div>
          <div className="flex items-center">
            <MapPin className="w-4 h-4 mr-2" />
            {session.location}
          </div>
          <div className="flex items-center">
            <Users className="w-4 h-4 mr-2" />
            {(() => {
              const yesCount = session.rsvps?.filter(r => r.status === 'yes').length || 0
              const guestCount = session.rsvps?.reduce((sum, r) => sum + (r.status === 'yes' ? (r.guest_count || 0) : 0), 0) || 0
              const total = yesCount + guestCount
              return `${total} player${total === 1 ? '' : 's'} attended`
            })()}
          </div>
        </div>

        {/* Participants */}
        {(() => {
          const goingRsvps = session.rsvps?.filter(r => r.status === 'yes') || []
          if (goingRsvps.length === 0) return null
          return (
            <div className="flex flex-wrap gap-2 mt-3">
              {goingRsvps.map((rsvp) => (
                <div
                  key={rsvp.id}
                  className={`flex items-center gap-1.5 pl-1 pr-2.5 py-1 rounded-full ${darkMode ? 'bg-gray-600' : 'bg-white border border-gray-200'}`}
                >
                  <UserAvatar profile={rsvp.profiles} size="sm" />
                  <span className={`text-xs font-medium ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                    {rsvp.profiles?.name || 'Player'}
                  </span>
                </div>
              ))}
              {goingRsvps.flatMap((rsvp) => {
                const names = rsvp.guest_names || []
                const unnamed = Math.max(0, (rsvp.guest_count || 0) - names.length)
                return [
                  ...names.map((g, i) => (
                    <div
                      key={`${rsvp.id}-guest-${i}`}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full ${darkMode ? 'bg-gray-600' : 'bg-white border border-gray-200'}`}
                    >
                      <User className={`w-3.5 h-3.5 ${darkMode ? 'text-gray-400' : 'text-gray-400'}`} />
                      <span className={`text-xs ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                        {g} <span className="opacity-60">(guest)</span>
                      </span>
                    </div>
                  )),
                  ...(unnamed > 0
                    ? [(
                        <div
                          key={`${rsvp.id}-guest-unnamed`}
                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full ${darkMode ? 'bg-gray-600' : 'bg-white border border-gray-200'}`}
                        >
                          <User className={`w-3.5 h-3.5 ${darkMode ? 'text-gray-400' : 'text-gray-400'}`} />
                          <span className={`text-xs ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                            +{unnamed} guest{unnamed === 1 ? '' : 's'}
                          </span>
                        </div>
                      )]
                    : []),
                ]
              })}
            </div>
          )
        })()}
      </div>
      {user?.email === 'bobbykyn@gmail.com' && (
        <button
          onClick={async () => {
            if (confirm('Delete this session?')) {
              await supabase.from('sessions').delete().eq('id', session.id)
              loadHistoricalSessions()
            }
          }}
          className="text-red-500 hover:text-red-700 ml-2"
        >
          <X className="w-4 h-4" /> 
        </button>
      )}
    </div>
  </div>
))}
          </div>
        ) : (
          <p className={darkMode ? 'text-gray-400' : 'text-gray-500'}>No past games yet</p>
        )}
      </div>
    </div>
  )
  
}