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
import BrandLogo from '../components/BrandLogo'
import { Settings, DollarSign, X } from 'lucide-react'
import { format, addMonths } from 'date-fns'

{/* import { useSwipeable } from 'react-swipeable'
import MobileCalendarView from '@/components/MobileCalendarView' */}

import HistoryModal from '@/components/HistoryModal'
import StatsModal from '@/components/StatsModal'
import AllStatsModal from '@/components/AllStatsModal'
import AdminModal from '@/components/AdminModal'
import PaymentRequestModal from '@/components/PaymentRequestModal'
import MobileCalendarSwiper from '@/components/MobileCalendarSwiper'

export default function Home() {
  const [user, setUser] = useState<User | null>(null)
  const [userProfile, setUserProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [sessions, setSessions] = useState<Session[]>([])
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [showSidebar, setShowSidebar] = useState(false)
  const [darkMode, setDarkMode] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingSession, setEditingSession] = useState<Session | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [currentMonthOffset, setCurrentMonthOffset] = useState(0)
  const [showHistoryModal, setShowHistoryModal] = useState(false)
  const [showStatsModal, setShowStatsModal] = useState(false)
  const [statsView, setStatsView] = useState<{ id: string; profile?: any } | null>(null)
  const [showAllStatsModal, setShowAllStatsModal] = useState(false)
  const [showAdminModal, setShowAdminModal] = useState(false)
  const [recentEnded, setRecentEnded] = useState<Session[]>([])
  const [paymentSession, setPaymentSession] = useState<Session | null>(null)
  const [paymentDone, setPaymentDone] = useState<string[]>([])
  const [rsvpLoading, setRsvpLoading] = useState<string | null>(null)


  // Load user profile
  const loadUserProfile = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('name, phone, avatar_url, google_avatar_url, payme_link')
        .eq('id', user.id)
        .single()

      if (error && error.code === 'PGRST116') {
        // Profile doesn't exist, let's create it! (Useful for Google OAuth sign-in)
        const googleAvatar = user.user_metadata?.avatar_url || null
        const newProfile = {
          id: user.id,
          email: user.email,
          name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'Someone',
          phone: null,
          wants_notifications: true,
          wants_rsvp_updates: false,
          google_avatar_url: googleAvatar,
          avatar_url: null,
        }
        const { data: insertedData, error: insertError } = await supabase
          .from('profiles')
          .insert(newProfile)
          .select()
          .single()

        if (!insertError && insertedData) {
          setUserProfile(insertedData)
        }
      } else if (!error && data) {
        // Sync google avatar if it has changed
        const googleAvatar = user.user_metadata?.avatar_url || null
        if (data.google_avatar_url !== googleAvatar) {
          const { data: updatedData } = await supabase
            .from('profiles')
            .update({ google_avatar_url: googleAvatar })
            .eq('id', user.id)
            .select()
            .single()
          
          if (updatedData) {
            setUserProfile(updatedData)
            return
          }
        }
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
          profiles!sessions_created_by_fkey(name, avatar_url, google_avatar_url),
          rsvps(
            *,
            profiles(name, avatar_url, google_avatar_url)
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

  // Record that the user is active in the app, and re-enable notifications if
  // their account was auto-suspended for inactivity. Defensive: if the
  // `last_active_at` / `notifications_suspended` columns don't exist yet, ignore.
  const recordActivity = async () => {
    if (!user) return
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('notifications_suspended')
        .eq('id', user.id)
        .single()
      if (error) return
      const update: any = { last_active_at: new Date().toISOString() }
      if (data?.notifications_suspended) {
        update.wants_notifications = true
        update.notifications_suspended = false
      }
      await supabase.from('profiles').update(update).eq('id', user.id)
    } catch {
      // non-critical
    }
  }

  // Recently-ended sessions THIS user created (last 24h) — for the payment prompt
  const loadRecentEndedForCreator = async () => {
    if (!user) return
    try {
      const now = new Date()
      const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
      const { data, error } = await supabase
        .from('sessions')
        .select(`
          *,
          profiles!sessions_created_by_fkey(name, avatar_url, google_avatar_url),
          rsvps(*, profiles(name, avatar_url, google_avatar_url))
        `)
        .eq('created_by', user.id)
        .lt('date_time', now.toISOString())
        .gt('date_time', dayAgo.toISOString())
        .order('date_time', { ascending: false })
      if (error) throw error
      setRecentEnded(data || [])
    } catch (e) {
      console.error('Error loading recent ended sessions:', e)
    }
  }

  const markPaymentDone = (sessionId: string) => {
    setPaymentDone((prev) => {
      if (prev.includes(sessionId)) return prev
      const next = [...prev, sessionId]
      try { localStorage.setItem('pk_payment_done', JSON.stringify(next)) } catch {}
      return next
    })
  }

  // Restore dismissed/used payment prompts
  useEffect(() => {
    try {
      const saved = localStorage.getItem('pk_payment_done')
      if (saved) setPaymentDone(JSON.parse(saved))
    } catch {}
  }, [])

  // Load sessions when user changes
  useEffect(() => {
    if (user) {
      loadSessions()
      loadUserProfile()
      recordActivity()
      loadRecentEndedForCreator()
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
      const addedUserIds = new Set(addedUsers.map(u => u.id))
      const otherRSVPs = existingYes.filter(r => r.user_id !== user.id && !addedUserIds.has(r.user_id))
      const otherGuestsCount = otherRSVPs.reduce((sum, r) => sum + (r.guest_count || 0), 0)
      const futureTotal = otherRSVPs.length + otherGuestsCount + 1 + guestCount + addedUsers.length

      if (futureTotal > (session.max_players || 8)) {
        const userRSVP = existingYes.find(r => r.user_id === user.id)
        const userPrevTotal = 1 + (userRSVP?.guest_count || 0)
        const spotsRequested = (1 + guestCount + addedUsers.length) - (userRSVP ? userPrevTotal : 0)
        alert(`Sorry, adding ${spotsRequested} more player(s) would exceed max players (${session.max_players}).`)
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
          profiles: { 
            name: userName, 
            avatar_url: userProfile?.avatar_url, 
            google_avatar_url: userProfile?.google_avatar_url 
          } as any,
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
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <div className="text-center">
          <h1 className="text-3xl md:text-4xl font-display font-bold tracking-wider text-brand-primary mb-4">匹克廚房 • PICKLE KITCHEN</h1>
          <p className="text-sm font-medium opacity-70 uppercase tracking-widest">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-200">
      {/* Header (only when signed in; logged-out shows the splash hero) */}
      {user && (
      <div className="border-b-2 border-brand-border bg-card-bg/60 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 py-4 md:py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl md:text-3xl font-display font-bold tracking-tight text-brand-primary flex items-center gap-3">
                匹克廚房 <span className="text-base md:text-lg font-light text-foreground/70 hidden sm:inline">PICKLE KITCHEN</span>
              </h1>
              <p className="mt-1 text-[10px] md:text-xs font-display tracking-widest text-brand-secondary font-semibold">
                GEAR UP. PLAY WELL. LIVE MORE. • EST. 2024
              </p>
              {user && (
                <p className="mt-1 text-xs md:hidden font-medium text-foreground/60">
                  Welcome, {userProfile?.name || user.email}
                </p>
              )}
            </div>
            
            {user ? (
              <div className="flex items-center gap-2">
                <span className="hidden md:block text-sm font-semibold text-foreground/75 mr-2">
                  Welcome, {userProfile?.name || user.email}
                </span>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="bg-brand-primary text-white px-4 py-2.5 rounded font-display text-xs uppercase tracking-wider hover:bg-brand-primary/95 transition-all font-semibold"
                >
                  Create Session
                </button>
                <button
                  onClick={() => setShowSidebar(!showSidebar)}
                  className="p-2 text-foreground/70 hover:bg-foreground/5 rounded-lg transition-colors"
                  title="Settings"
                >
                  <Settings className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowAuthModal(true)}
                className="bg-brand-primary text-white px-5 py-2.5 rounded font-display text-xs uppercase tracking-wider hover:bg-brand-primary/95 transition-all font-semibold"
              >
                Login / Sign Up
              </button>
            )}
          </div>
        </div>
      </div>
      )}

      {/* Main Content */}
      {user ? (
        <div className="max-w-7xl mx-auto px-4 py-4 md:py-8">
          {/* Post-game payment prompt (session creator only, last 24h, until used/dismissed) */}
          {(() => {
            const pending = recentEnded.filter((s) => !paymentDone.includes(s.id))
            if (pending.length === 0) return null
            return (
              <div className="mb-6 rounded-lg border border-brand-secondary/40 bg-brand-secondary/10 p-4">
                <div className="flex items-center gap-2 mb-1">
                  <DollarSign className="w-5 h-5 text-brand-secondary" />
                  <h3 className="font-display text-sm font-bold uppercase tracking-wider text-brand-secondary">Collect for your recent game</h3>
                </div>
                <p className="text-xs text-foreground/60 mb-3">Your session just wrapped — send a payment request before it slips your mind.</p>
                <div className="space-y-2">
                  {pending.map((s) => (
                    <div key={s.id} className="flex items-center justify-between gap-2 rounded-lg bg-card-bg/60 border border-brand-border px-3 py-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{s.title}</p>
                        <p className="text-xs text-foreground/60">{format(new Date(s.date_time), 'EEE, MMM d · h:mm a')}</p>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button
                          onClick={() => setPaymentSession(s)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-brand-secondary text-white hover:bg-brand-secondary/90 transition-colors whitespace-nowrap"
                        >
                          <DollarSign className="w-3.5 h-3.5" /> Request Payment
                        </button>
                        <button
                          onClick={() => markPaymentDone(s.id)}
                          className="p-1.5 text-foreground/40 hover:text-foreground/70"
                          title="Dismiss"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })()}

          <div className="flex flex-col lg:flex-row gap-4 md:gap-8">
            {/* Left Column - Calendar - Hidden on mobile, shown on desktop */}
            <div className="hidden lg:block w-80 flex-shrink-0">
              <div className="rounded-lg border border-brand-border bg-card-bg/60 p-6 backdrop-blur-sm sticky top-28">
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
                <div className="rounded-lg p-3 bg-card-bg/60 border border-brand-border backdrop-blur-sm">
                  <MobileCalendarSwiper
                    sessions={sessions}
                    darkMode={darkMode}
                    onDateClick={handleCalendarDateClick}
                    currentMonthOffset={currentMonthOffset}
                    setCurrentMonthOffset={setCurrentMonthOffset}
                  />
                </div>
              </div>

              <h2 className="text-xl md:text-2xl font-display font-bold tracking-wider text-brand-primary border-b border-brand-border pb-2 mb-6 uppercase flex items-center justify-between">
                <span>Upcoming Matches | 即將對決</span>
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
                      onViewPlayer={(id, profile) => { setStatsView({ id, profile }); setShowStatsModal(true) }}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 rounded-lg bg-card-bg/30 border border-brand-border">
                  <p className="font-medium text-foreground/60 text-sm">
                    No sessions yet! Click "Create Session" to list a new match.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12">
          <BrandLogo size="lg" />

          {/* Join the Crew */}
          <div className="mt-12 w-full max-w-xs">
            <p className="text-center text-[11px] font-display tracking-[0.3em] text-foreground/50 uppercase mb-4">
              Join the Crew · 加入匹克廚房
            </p>
            <div className="space-y-3">
              <button
                onClick={() => { setAuthMode('login'); setShowAuthModal(true) }}
                className="w-full bg-[#F2E7D6] text-[#0D1B2A] py-3.5 rounded-full font-display uppercase tracking-[0.2em] text-sm font-semibold hover:bg-[#e9dcc6] transition-all shadow-md"
              >
                Log In
              </button>
              <button
                onClick={() => { setAuthMode('signup'); setShowAuthModal(true) }}
                className="w-full border border-foreground/30 text-foreground py-3.5 rounded-full font-display uppercase tracking-[0.2em] text-sm font-semibold hover:bg-foreground/5 transition-all"
              >
                Sign Up
              </button>
            </div>
            <p className="mt-6 text-center text-xs text-foreground/50 leading-relaxed">
              See, create, and join upcoming local matches.
            </p>
          </div>
        </div>
      )}

      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} initialMode={authMode} />
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
        onOpenStats={() => {
          setShowSidebar(false)
          setStatsView(null)
          setShowStatsModal(true)
        }}
        onOpenAllStats={() => {
          setShowSidebar(false)
          setShowAllStatsModal(true)
        }}
        onOpenAdmin={() => {
          setShowSidebar(false)
          setShowAdminModal(true)
        }}
        />
        <HistoryModal
        isOpen={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
        darkMode={darkMode}
        user={user}
        userProfile={userProfile}
        />
        <StatsModal
        isOpen={showStatsModal}
        onClose={() => { setShowStatsModal(false); setStatsView(null) }}
        darkMode={darkMode}
        user={user}
        viewUserId={statsView?.id}
        viewUserProfile={statsView?.profile}
        />
        <AllStatsModal
        isOpen={showAllStatsModal}
        onClose={() => setShowAllStatsModal(false)}
        darkMode={darkMode}
        user={user}
        />
        <AdminModal
        isOpen={showAdminModal}
        onClose={() => setShowAdminModal(false)}
        darkMode={darkMode}
        user={user}
        />
        <PaymentRequestModal
        isOpen={!!paymentSession}
        onClose={() => setPaymentSession(null)}
        darkMode={darkMode}
        session={paymentSession}
        defaultLink={userProfile?.payme_link}
        onShared={() => { if (paymentSession) markPaymentDone(paymentSession.id) }}
        />
    </div>
  )
}