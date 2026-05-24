'use client'

import { supabase } from '@/lib/supabase'
import { useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import SessionCard from '../components/SessionCard'
import AuthModal from '../components/AuthModal'
import CreateSessionModal from '@/components/CreateSessionModal'
import EditSessionModal from '@/components/EditSessionModal'
import ProfileModal from '@/components/ProfileModal'
import CalendarView from '@/components/CalendarView'
import { Session, RSVP } from '@/types'
import Sidebar from '../components/Sidebar'
import { Settings } from 'lucide-react'
import { format, addMonths } from 'date-fns'

{/* import { useSwipeable } from 'react-swipeable'
import MobileCalendarView from '@/components/MobileCalendarView' */}

import HistoryModal from '@/components/HistoryModal'
import MobileCalendarSwiper from '@/components/MobileCalendarSwiper'

export default function Home() {
  const [user, setUser] = useState<User | null>(null)
  const [userProfile, setUserProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [sessions, setSessions] = useState<Session[]>([])
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [showSidebar, setShowSidebar] = useState(false)
  const [darkMode, setDarkMode] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingSession, setEditingSession] = useState<Session | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [currentMonthOffset, setCurrentMonthOffset] = useState(0)
  const [showHistoryModal, setShowHistoryModal] = useState(false)
  const [rsvpLoading, setRsvpLoading] = useState<string | null>(null)


  // Load user profile
  const loadUserProfile = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('name, phone')
        .eq('id', user.id)
        .single()

      if (!error && data) {
        setUserProfile(data)
      }
    } catch (error) {
      console.error('Error loading profile:', error)
    }
  }

  // Load sessions from database
  const loadSessions = async () => {
    try {
      if (!user) return

      // Get all sessions (we'll filter them client-side for privacy)
      const { data: allSessions, error } = await supabase
        .from('sessions')
        .select(`
          *,
          profiles!sessions_created_by_fkey(name, avatar_url),
    rsvps(
      *,
      profiles(name, avatar_url)
          )
        `)
        .gte('date_time', new Date().toISOString())
        .order('date_time', { ascending: true })
  
      if (error) throw error

      // Filter sessions based on privacy settings
      const visibleSessions = allSessions?.filter(session => {
        // Show public sessions to everyone
        if (!session.is_private) return true
        
        // Show private sessions only to:
        // 1. The creator
        // 2. Invited users
        const isCreator = session.created_by === user.id
        const isInvited = session.invited_users?.includes(user.id) || false
        
        return isCreator || isInvited
      }) || []

      setSessions(visibleSessions)
    } catch (error) {
      console.error('Error loading sessions:', error)
    }
  }

  // Dark mode effect - DEFAULT TO DARK MODE
  useEffect(() => {
    const savedDarkMode = localStorage.getItem('darkMode')
    // Default to dark mode if no preference saved
    const isDarkMode = savedDarkMode === null ? true : savedDarkMode === 'true'
    setDarkMode(isDarkMode)
    
    if (isDarkMode) {
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

  // Handle private session URLs
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const privateKey = urlParams.get('private')
    
    if (privateKey) {
      // Load private session
      fetch(`/api/get-private-session?key=${privateKey}`)
        .then(response => response.json())
        .then(data => {
          if (data.session) {
            // Add the private session to the sessions list
            setSessions(prev => {
              const exists = prev.find(s => s.id === data.session.id)
              if (!exists) {
                return [data.session, ...prev]
              }
              return prev
            })
            // Clean up URL
            window.history.replaceState({}, document.title, window.location.pathname)
          }
        })
        .catch(error => {
          console.error('Error loading private session:', error)
        })
    }
  }, [])

  // Load sessions when user changes
  useEffect(() => {
    if (user) {
      loadSessions()
      loadUserProfile()
    }
  }, [user])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
  }

  const handleSessionCreated = () => {
    loadSessions()
    setSelectedDate(null)
  }

  const handleProfileUpdated = () => {
    loadUserProfile()
  }

  const handleCalendarDateClick = (date: Date) => {
    setSelectedDate(date)
    setShowCreateModal(true)
  }

  const handleEditSession = (session: Session) => {
    setEditingSession(session)
    setShowEditModal(true)
  }
  
  const handleSessionUpdated = () => {
    loadSessions()
    setShowEditModal(false)
    setEditingSession(null)
  }
  
  const handleDeleteSession = async (sessionId: string) => {
    try {
      const { error } = await supabase
        .from('sessions')
        .delete()
        .eq('id', sessionId)
  
      if (error) {
        console.error('Supabase error:', error)
        alert(`Delete failed: ${error.message}`)
        return
      }
      
      loadSessions()
    } catch (error) {
      console.error('Catch error:', error)
      alert('Failed to delete session. Please try again.')
    }
  }

  const handleRSVP = async (
    sessionId: string,
    status: 'yes' | 'maybe' | 'no',
    opts: {
      guestCount?: number
      guestNames?: string[]
      addedUsers?: Array<{ id: string; name: string; avatar_url?: string }>
    } = {}
  ) => {
    if (!user) return

    const { guestCount = 0, guestNames = [], addedUsers = [] } = opts
    const userName = userProfile?.name || 'Someone'

    // Snapshot for rollback if DB sync fails
    const prevSessions = sessions
    const session = sessions.find(s => s.id === sessionId)

    // Max players check including guests + added friends
    if (status === 'yes' && session) {
      const existingYes = session.rsvps?.filter(r => r.status === 'yes') || []
      const existingGuestTotal = existingYes.reduce((sum, r) => sum + (r.guest_count || 0), 0)
      const userAlreadyIn = existingYes.some(r => r.user_id === user.id)
      const newAdds = addedUsers.filter(u => !existingYes.some(r => r.user_id === u.id)).length
      const newPeople = (userAlreadyIn ? 0 : 1) + guestCount + newAdds
      const total = existingYes.length + existingGuestTotal + newPeople
      if (total > (session.max_players || 8)) {
        alert(`Sorry, adding ${newPeople} would exceed max players (${session.max_players}).`)
        return
      }
    }

    // === OPTIMISTIC UI UPDATE ===
    setSessions(prev => prev.map(s => {
      if (s.id !== sessionId) return s
      const removedIds = new Set<string>([user.id, ...addedUsers.map(u => u.id)])
      const kept = (s.rsvps || []).filter(r => !removedIds.has(r.user_id))
      const updates: RSVP[] = [...kept]

      if (status === 'yes') {
        updates.push({
          id: `tmp-${user.id}`,
          session_id: sessionId,
          user_id: user.id,
          status: 'yes',
          created_at: new Date().toISOString(),
          guest_count: guestCount,
          guest_names: guestNames,
          profiles: { name: userName } as any,
        })
        addedUsers.forEach(u => {
          updates.push({
            id: `tmp-${u.id}`,
            session_id: sessionId,
            user_id: u.id,
            status: 'yes',
            created_at: new Date().toISOString(),
            guest_count: 0,
            guest_names: [],
            profiles: { name: u.name, avatar_url: u.avatar_url } as any,
          })
        })
      }

      return { ...s, rsvps: updates }
    }))

    setRsvpLoading(sessionId)

    // === BACKGROUND SYNC ===
    try {
      const { error: upsertErr } = await supabase
        .from('rsvps')
        .upsert(
          {
            session_id: sessionId,
            user_id: user.id,
            status,
            guest_count: status === 'yes' ? guestCount : 0,
            guest_names: status === 'yes' ? guestNames : [],
          },
          { onConflict: 'session_id,user_id' }
        )
      if (upsertErr) throw upsertErr

      if (status === 'yes' && addedUsers.length > 0) {
        const rows = addedUsers.map(u => ({
          session_id: sessionId,
          user_id: u.id,
          status: 'yes' as const,
          guest_count: 0,
          guest_names: [] as string[],
        }))
        const { error: addErr } = await supabase
          .from('rsvps')
          .upsert(rows, { onConflict: 'session_id,user_id' })
        if (addErr) throw addErr
      }

      // Reconcile (replaces temp IDs with real ones, picks up any cross-user changes)
      loadSessions()

      // Background: notify added friends (session-creation-style)
      if (status === 'yes' && addedUsers.length > 0) {
        fetch('/api/send-added-to-session-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            addedUserIds: addedUsers.map(u => u.id),
            addedByName: userName,
          }),
        }).catch(e => console.error('Added-friend email error:', e))
      }

      // Background: existing RSVP notification flow (creator + other 'yes' members)
      if (status === 'yes') {
        fetch('/api/send-rsvp-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            newMemberName: userName,
            rsvpStatus: status,
          }),
        }).catch(e => console.error('RSVP email error:', e))
      }
    } catch (error) {
      console.error('Error updating RSVP:', error)
      setSessions(prevSessions)
      alert('Failed to update RSVP. Please try again.')
    } finally {
      setRsvpLoading(null)
    }
  }

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50'}`}>
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">Pickle Kitchen</h1>
          <p className="text-xl text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50'}`}>
      {/* Header */}
<div className={`shadow-sm border-b ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white'}`}>
  <div className="max-w-7xl mx-auto px-4 py-4 md:py-6">
    <div className="flex justify-between items-center">
      <div>
        <h1 className={`text-2xl md:text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Pickle Kitchen</h1>
        <p className={`mt-1 text-sm md:text-base ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Let's Pickle Time!!</p>
        {user && (
          <p className={`mt-1 text-sm md:hidden ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            Welcome, {userProfile?.name || user.email}
          </p>
        )}
      </div>
      
      {user ? (
        <div className="flex items-center gap-2">
          <span className={`hidden md:block ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            Welcome, {userProfile?.name || user.email}
          </span>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-teal-700 text-white px-4 py-2 rounded-lg hover:bg-teal-800 font-medium"
          >
            Create Session
          </button>
          <button
            onClick={() => setShowSidebar(!showSidebar)}
            className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            title="Settings"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      ) : (
        <button
          onClick={() => setShowAuthModal(true)}
          className="bg-teal-700 text-white px-4 py-2 rounded-lg hover:bg-teal-800 font-medium"
        >
          Login / Sign Up
        </button>
      )}
    </div>
  </div>
</div>

      {/* Main Content */}
      {user ? (
        <div className="max-w-7xl mx-auto px-4 py-4 md:py-8">
          <div className="flex flex-col lg:flex-row gap-4 md:gap-8">
            {/* Left Column - Calendar - Hidden on mobile, shown on desktop */}
            <div className="hidden lg:block w-80 flex-shrink-0">
              <div className={`rounded-lg shadow-lg p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
                <CalendarView 
                  sessions={sessions} 
                  darkMode={darkMode}
                  onDateClick={handleCalendarDateClick}
                />
              </div>
            </div>

            {/* Right Column - Sessions - Full width on mobile */}
<div className="flex-1">
  {/* Mobile Calendar Banner */}
  <div className="lg:hidden mb-4 -mx-4 px-4">
    <div className={`rounded-lg p-3 ${darkMode ? 'bg-gray-800' : 'bg-white shadow'}`}>
      <MobileCalendarSwiper
        sessions={sessions}
        darkMode={darkMode}
        onDateClick={handleCalendarDateClick}
        currentMonthOffset={currentMonthOffset}
        setCurrentMonthOffset={setCurrentMonthOffset}
      />
    </div>
  </div>

  <h2 className={`text-xl md:text-2xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
    Upcoming Games
  </h2>

              {sessions.length > 0 ? (
                <div className="space-y-4 md:space-y-6">
                  {sessions.map((session) => (
                    <SessionCard
                      key={session.id}
                      session={session}
                      currentUserId={user?.id}
                      currentUserEmail={user?.email}
                      onDelete={handleDeleteSession}
                      onEdit={handleEditSession}
                      onRSVP={handleRSVP}
                      rsvpLoading={rsvpLoading === session.id}
                      darkMode={darkMode}
                    />
                  ))}
                </div>
              ) : (
                <div className={`text-center py-8 md:py-12 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
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
            Join our Pickleball Crew!
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
        onClose={() => {
          setShowCreateModal(false)
          setSelectedDate(null)
        }}
        onSessionCreated={handleSessionCreated}
        selectedDate={selectedDate}
      />
      <EditSessionModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false)
          setEditingSession(null)
        }}
        onSessionUpdated={handleSessionUpdated}
        session={editingSession}
      />
      <ProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        user={user}
        onProfileUpdated={handleProfileUpdated}
      />
      <Sidebar 
        isOpen={showSidebar} 
        onClose={() => setShowSidebar(false)} 
        user={user} 
        darkMode={darkMode}
        onToggleDarkMode={toggleDarkMode}
        onSignOut={handleSignOut}
        onOpenProfile={() => {
          setShowSidebar(false)
          setShowProfileModal(true)
        }}
        onOpenHistory={() => {
          setShowSidebar(false)
          setShowHistoryModal(true) 
        }}
        /> 
        <HistoryModal
        isOpen={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
        darkMode={darkMode}
        user={user}
        />
    </div>
  )
}