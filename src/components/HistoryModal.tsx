'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { X, Calendar, MapPin, Users, User } from 'lucide-react'
import { Session } from '@/types'
import { format } from 'date-fns'

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
      const now = new Date().toISOString()
      const { data, error } = await supabase
        .from('sessions')
        .select(`
          *,
          profiles:created_by(name),
          rsvps(
            *,
            profiles(name, email)
          )
        `)
        .lt('date_time', now)  // Only past sessions
        .order('date_time', { ascending: false })
        .limit(50)

      if (error) throw error
      setSessions(data || [])
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
            {session.rsvps?.filter(r => r.status === 'yes').length || 0} players attended
          </div>
        </div>
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