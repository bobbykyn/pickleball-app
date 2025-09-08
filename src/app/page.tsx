'use client'

import { supabase } from '@/lib/supabase'
import { useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import SessionCard from '../components/SessionCard'
import AuthModal from '../components/AuthModal'
import CreateSessionModal from '@/components/CreateSessionModal'
import CalendarView from '../components/CalendarView'
import { Session } from '@/types'
import Sidebar from '../components/Sidebar'
import { Settings, LogOut } from 'lucide-react'

export default function Home() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [sessions, setSessions] = useState<Session[]>([])
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showSidebar, setShowSidebar] = useState(false)
  const [darkMode, setDarkMode] = useState(false)

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

  // Dark mode effect
  useEffect(() => {
    const savedDarkMode = localStorage.getItem('darkMode') === 'true'
    setDarkMode(savedDarkMode)
    
    if (savedDarkMode) {
      document.documentElement.classList.add('dark')
      document.body.style.backgroundColor = '#111827'
      document.body.style.color = '#f9fafb'
    }
  }, [])

  const toggleDarkMode = () => {
    const newDarkMode = !darkMode
    setDarkMode(newDarkMode)
    localStorage.setItem('darkMode', newDarkMode.toString())
    
    if (newDarkMode) {
      document.documentElement.classList.add('dark')
      document.body.style.backgroundColor = '#111827'
      document.body.style.color = '#f9fafb'
    } else {
      document.documentElement.classList.remove('dark')
      document.body.style.backgroundColor = ''
      document.body.style.color = ''
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
      console.log('🔥 DELETE ATTEMPT:', sessionId)
      console.log('🔥 Current user email:', user?.email)
      console.log('🔥 Is admin?', user?.email === 'bobbykyn@gmail.com')
      
      const { error } = await supabase
        .from('sessions')
        .delete()
        .eq('id', sessionId)
  
      if (error) {
        console.error('🔥 Supabase error:', error)
        alert(`Delete failed: ${error.message}`)
        return
      }
      
      console.log('🔥 Delete successful!')
      loadSessions()
    } catch (error) {
      console.error('🔥 Catch error:', error)
      alert('Failed to delete session. Please try again.')
    }
  }

  const handleRSVP = async (sessionId: string, status: 'yes' | 'maybe' | 'no') => {
    if (!user) return
    
    // Check max players limit for 'yes' RSVPs
    if (status === 'yes') {
      const session = sessions.find(s => s.id === sessionId)
      const currentYesRSVPs = session?.rsvps?.filter(rsvp => rsvp.status === 'yes').length || 0
      
      if (currentYesRSVPs >= (session?.max_players || 8)) {
        alert('Sorry, this session is full! Maximum players reached.')
        return
      }
    }

    try {
      // Check if user already has an RSVP
      const { data: existingRSVP } = await supabase
        .from('rsvps')
        .select('id')
        .eq('session_id', sessionId)
        .eq('user_id', user.id)
        .single()

      // Get user's name for notifications
      const { data: profile } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', user.id)
        .single()

      const userName = profile?.name || 'Someone'

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

      // Send RSVP notification email
      if (status === 'yes') {
        try {
          const response = await fetch('/api/send-rsvp-email', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
              sessionId, 
              newMemberName: userName,
              rsvpStatus: status
            }),
          })

          if (!response.ok) {
            console.error('Failed to send RSVP notifications')
          }
        } catch (emailError) {
          console.error('RSVP email error:', emailError)
        }
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
      <div className={`min-h-screen flex items-center justify-center ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50'}`}>
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">🏓 雞仔 Pickle</h1>
          <p className="text-xl text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50'}`}>
      {/* Header */}
      <div className={`shadow-sm border-b ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white'}`}>
        <div className="max-w-7xl mx-auto px-4 py-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">🏓 雞仔 Pickle</h1>
            <p className={`mt-1 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Let's Pickle Time!!</p>
          </div>
          
          <div className="flex items-center space-x-4">
            {user ? (
              <div className="flex items-center space-x-4">
                <span className={`${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Welcome, {user.email}</span>
                
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="bg-teal-700 text-white px-4 py-2 rounded-lg hover:bg-teal-800"
                >
                  Create Session
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

      {/* Main Content */}
      {user ? (
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex gap-8">
            {/* Left Column - Calendar */}
            <div className="w-80 flex-shrink-0">
              <div className={`rounded-lg shadow-lg p-6 relative ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
                <CalendarView sessions={sessions} darkMode={darkMode} />
                
                {/* Bottom buttons */}
                <div className="absolute bottom-4 left-4 space-y-2">
                  <button
                    onClick={toggleDarkMode}
                    className={`p-2 rounded-lg transition-colors ${
                      darkMode 
                        ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-700' 
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                    }`}
                    title="Toggle dark mode"
                  >
                    {darkMode ? '🌙' : '☀️'}
                  </button>
                  
                  <button
                    onClick={() => setShowSidebar(true)}
                    className={`p-2 rounded-lg transition-colors ${
                      darkMode 
                        ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-700' 
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                    }`}
                    title="Settings"
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                  
                  <button
                    onClick={handleSignOut}
                    className={`p-2 rounded-lg transition-colors ${
                      darkMode 
                        ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-700' 
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                    }`}
                    title="Sign out"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Right Column - Sessions */}
            <div className="flex-1">
              <h2 className={`text-2xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Upcoming Games
              </h2>
              {sessions.length > 0 ? (
                <div className="space-y-6">
                  {sessions.map((session) => (
                    <SessionCard 
                      key={session.id} 
                      session={session} 
                      currentUserId={user?.id}
                      currentUserEmail={user?.email}
                      onDelete={handleDeleteSession}
                      onRSVP={handleRSVP}
                      darkMode={darkMode}
                    />
                  ))}
                </div>
              ) : (
                <div className={`text-center py-12 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
                  <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                    No sessions yet! Use the Create Session button above.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-12">
          <h2 className={`text-2xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Join Your Pickleball Crew!
          </h2>
          <p className={`mb-6 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            Sign up to see and join upcoming games
          </p>
          <button
            onClick={() => setShowAuthModal(true)}
            className="bg-teal-700 text-white px-8 py-3 rounded-lg hover:bg-teal-800 font-medium text-lg"
          >
            Get Started
          </button>
        </div>
      )}

      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
      <CreateSessionModal 
        isOpen={showCreateModal} 
        onClose={() => setShowCreateModal(false)}
        onSessionCreated={handleSessionCreated}
      />
      <Sidebar 
        isOpen={showSidebar} 
        onClose={() => setShowSidebar(false)} 
        user={user} 
        darkMode={darkMode}
        onToggleDarkMode={toggleDarkMode}
      />
    </div>
  )
}