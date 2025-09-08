'use client'

import { supabase } from '@/lib/supabase'
import { useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import SessionCard from '../components/SessionCard'
import AuthModal from '../components/AuthModal'
import CreateSessionModal from '../components/CreateSessionModal'
import { Session } from '@/types'

export default function Home() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [sessions, setSessions] = useState<Session[]>([])
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)

  // Load sessions from database
  const loadSessions = async () => {
    try {
      const { data, error } = await supabase
        .from('sessions')
        .select(`
          *,
          profiles:created_by(name),
          rsvps(
            *,
            profiles(name)
          )
        `)
        .order('date_time', { ascending: true })

      if (error) throw error
      setSessions(data || [])
    } catch (error) {
      console.error('Error loading sessions:', error)
    }
  }

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  // Load sessions when user changes
  useEffect(() => {
    if (user) {
      loadSessions()
    }
  }, [user])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
  }

  const handleSessionCreated = () => {
    loadSessions() // Refresh the sessions list
  }
  
  const handleDeleteSession = async (sessionId: string) => {
    try {
      console.log('Attempting to delete session:', sessionId) // Debug log
      const { error } = await supabase
        .from('sessions')
        .delete()
        .eq('id', sessionId)
  
      if (error) {
        console.error('Supabase error:', error) // Debug log
        throw error
      }
      
      console.log('Session deleted successfully') // Debug log
      // Refresh the sessions list
      loadSessions()
    } catch (error) {
      console.error('Error deleting session:', error)
      alert('Failed to delete session. Please try again.')
    }
  }
  const handleRSVP = async (sessionId: string, status: 'yes' | 'maybe' | 'no') => {
    if (!user) return
  
    try {
      // Check if user already has an RSVP
      const { data: existingRSVP } = await supabase
        .from('rsvps')
        .select('id')
        .eq('session_id', sessionId)
        .eq('user_id', user.id)
        .single()
  
      if (existingRSVP) {
        // Update existing RSVP
        const { error } = await supabase
          .from('rsvps')
          .update({ status })
          .eq('id', existingRSVP.id)
  
        if (error) throw error
      } else {
        // Create new RSVP
        const { error } = await supabase
          .from('rsvps')
          .insert({
            session_id: sessionId,
            user_id: user.id,
            status
          })
  
        if (error) throw error
      }
  
      // Refresh sessions to show updated RSVPs
      loadSessions()
    } catch (error) {
      console.error('Error updating RSVP:', error)
      alert('Failed to update RSVP. Please try again.')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">🏓 Pickleball Crew</h1>
          <p className="text-xl text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">🏓 Pickleball Crew</h1>
            <p className="text-gray-600 mt-1">Book and join games with your friends</p>
          </div>
          
          <div className="flex items-center space-x-4">
            {user ? (
              <div className="flex items-center space-x-4">
                <span className="text-gray-700">Welcome, {user.email}!</span>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="bg-teal-700 text-white px-4 py-2 rounded-lg hover:bg-teal-800"
                >
                  Create Session
                </button>
                <button
                  onClick={handleSignOut}
                  className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowAuthModal(true)}
                className="bg-teal-700 text-white px-6 py-2 rounded-lg hover:bg-teal-800 font-medium"
              >
                Login / Sign Up
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {user ? (
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Upcoming Games</h2>
            {sessions.length > 0 ? (
  <div className="space-y-6">
    {sessions.map((session) => (
  <SessionCard 
    key={session.id} 
    session={session} 
    currentUserId={user?.id}
    onDelete={handleDeleteSession}
    onRSVP={handleRSVP}
  />
))}
  </div>
            ) : (
              <div className="text-center py-12 bg-white rounded-lg">
                <p className="text-gray-600 mb-4">No sessions yet! Create the first one.</p>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="bg-teal-700 text-white px-6 py-3 rounded-lg hover:bg-teal-800 font-medium"
                >
                  Create First Session
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Join Your Pickleball Crew!</h2>
            <p className="text-gray-600 mb-6">Sign up to see and join upcoming games</p>
            <button
              onClick={() => setShowAuthModal(true)}
              className="bg-teal-700 text-white px-8 py-3 rounded-lg hover:bg-teal-800 font-medium text-lg"
            >
              Get Started
            </button>
          </div>
        )}
      </div>

      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
      <CreateSessionModal 
        isOpen={showCreateModal} 
        onClose={() => setShowCreateModal(false)}
        onSessionCreated={handleSessionCreated}
      />
    </div>
  )
}