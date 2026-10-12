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
import { Settings, DollarSign, X, Plus, LayoutGrid, CalendarDays, Trophy, UserRound } from 'lucide-react'
import PkMark from '../components/PkMark'
import WeekStrip from '../components/WeekStrip'
import { format, addMonths, isSameDay } from 'date-fns'

{/* import { useSwipeable } from 'react-swipeable'
import MobileCalendarView from '@/components/MobileCalendarView' */}

import HistoryModal from '@/components/HistoryModal'
import StatsModal from '@/components/StatsModal'
import AllStatsModal from '@/components/AllStatsModal'
import AdminModal from '@/components/AdminModal'
import PaymentRequestModal from '@/components/PaymentRequestModal'
import MobileCalendarSwiper from '@/components/MobileCalendarSwiper'
import { isAdminEmail } from '@/lib/admins'

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
  const [flashSessionId, setFlashSessionId] = useState<string | null>(null)
  const [showMonth, setShowMonth] = useState(false)
  const [activeTab, setActiveTab] = useState<string>('sessions')


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
    // Colours come from the theme tokens in globals.css; only the class switches.
    document.documentElement.classList.toggle('dark', isDarkMode)
  }, [])

  const toggleDarkMode = () => {
    const newDarkMode = !darkMode
    setDarkMode(newDarkMode)
    localStorage.setItem('darkMode', newDarkMode.toString())
    
    document.documentElement.classList.toggle('dark', newDarkMode)
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

  // Host/admin approves or declines a pending request
  const handleDecide = async (sessionId: string, userId: string, decision: 'yes' | 'no') => {
    try {
      const { data } = await supabase.auth.getSession()
      const res = await fetch('/api/decide-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken: data.session?.access_token, sessionId, userId, decision }),
      })
      const json = await res.json()
      if (!res.ok) alert(json.error || 'Could not update the request')
    } catch (e) {
      console.error('Decide error:', e)
      alert('Could not update the request. Please try again.')
    } finally {
      loadSessions()
    }
  }

  // Invite links (/?invite=<token>): remember the token through sign-in, then unlock the session
  useEffect(() => {
    try {
      const token = new URLSearchParams(window.location.search).get('invite')
      if (token) {
        localStorage.setItem('pk_invite', token)
        const url = new URL(window.location.href)
        url.searchParams.delete('invite')
        window.history.replaceState({}, document.title, url.pathname + url.search)
      }
    } catch {}
  }, [])

  useEffect(() => {
    if (!user) return
    let token: string | null = null
    try { token = localStorage.getItem('pk_invite') } catch {}
    if (!token) return
    ;(async () => {
      try {
        const { data } = await supabase.auth.getSession()
        const res = await fetch('/api/redeem-invite', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accessToken: data.session?.access_token, token }),
        })
        const json = await res.json()
        try { localStorage.removeItem('pk_invite') } catch {}
        if (!res.ok) { alert(json.error || 'This invite link is not valid'); return }
        await loadSessions()
        setTimeout(() => {
          document.getElementById(`session-${json.sessionId}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
          setFlashSessionId(json.sessionId)
          setTimeout(() => setFlashSessionId(null), 1600)
        }, 300)
      } catch (e) {
        console.error('Invite redeem error:', e)
      }
    })()
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

  // Event day → jump to that session's card. Empty day → create a session.
  const handleCalendarDateClick = (date: Date) => {
    const match = sessions.find((s) => isSameDay(new Date(s.date_time), date))
    if (match) {
      document.getElementById(`session-${match.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      setFlashSessionId(match.id)
      setTimeout(() => setFlashSessionId((id) => (id === match.id ? null : id)), 1600)
      return
    }
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

    // Approval sessions: a new join becomes a request (the database enforces the same rule).
    // Someone already in keeps their spot when editing guests; host and admins join directly.
    const isHostOrAdmin = !!session && (session.created_by === user.id || isAdminEmail(user.email))
    const approvalNeeded = status === 'yes' && !!session?.requires_approval && !session?.invite_only && !isHostOrAdmin
    const alreadyIn = (uid: string) => !!session?.rsvps?.some(r => r.user_id === uid && r.status === 'yes')
    const statusFor = (uid: string): 'yes' | 'maybe' | 'no' | 'pending' =>
      approvalNeeded && !alreadyIn(uid) ? 'pending' : status
    const myStatus = statusFor(user.id)

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
          status: myStatus,
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
            status: statusFor(u.id),
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
            status: myStatus,
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
          status: statusFor(u.id),
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

      // Background: a join request goes to the host only
      if (myStatus === 'pending') {
        fetch('/api/send-join-request-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId, requesterName: userName }),
        }).catch(e => console.error('Join-request email error:', e))
        return
      }

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
      <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground px-6">
        <div className="animate-brand-rise">
          <BrandLogo size="md" />
        </div>

        {/* Indeterminate sweep */}
        <div
          className="mt-10 w-40 h-[3px] rounded-full bg-brand-border overflow-hidden animate-brand-rise"
          style={{ animationDelay: '0.12s' }}
        >
          <div className="h-full w-1/3 rounded-full bg-brand-primary animate-brand-sweep" />
        </div>

        <p
          className="mt-4 font-display text-[10px] tracking-[0.3em] uppercase text-foreground/45 animate-brand-rise"
          style={{ animationDelay: '0.2s' }}
        >
          Warming up the court
        </p>
      </div>
    )
  }

  const firstName = (userProfile?.name || user?.email?.split('@')[0] || '').split(' ')[0]

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-200">
      {/* Header (only when signed in; logged-out shows the splash hero) */}
      {user && (
      <header className="sticky top-0 z-30 border-b border-brand-border bg-background/90 backdrop-blur-md pt-[env(safe-area-inset-top)]">
        <div className="max-w-7xl mx-auto px-4 py-3.5 flex items-center justify-between gap-3">
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="flex items-center gap-3 min-w-0"
            aria-label="Pickle Kitchen — back to top"
          >
            <PkMark height={48} />
            <span className="flex flex-col items-start gap-[5px] min-w-0">
              <span className="font-display text-[17px] font-semibold tracking-[0.14em] leading-none">PICKLE KITCHEN</span>
              <span className="text-[10px] font-semibold tracking-[0.3em] leading-none text-foreground/60">匹克廚房</span>
            </span>
          </button>

          <div className="flex items-center gap-2 shrink-0">
            <span className="hidden md:block text-sm font-semibold text-foreground/75 mr-2 truncate">
              Hi, {userProfile?.name || user.email}
            </span>
            <button
              onClick={() => setShowCreateModal(true)}
              aria-label="Create session"
              title="Create session"
              className="w-11 h-11 rounded-full bg-brand-primary text-white flex items-center justify-center hover:brightness-110 active:scale-95 transition-all"
            >
              <Plus className="w-5 h-5" strokeWidth={2.6} />
            </button>
            <button
              onClick={() => setShowSidebar(!showSidebar)}
              className="hidden lg:inline-flex w-11 h-11 items-center justify-center text-foreground/70 hover:bg-surface-2 rounded-full transition-colors"
              title="Settings"
              aria-label="Settings"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>
      )}

      {/* Main Content */}
      {user ? (
        <div className="max-w-7xl mx-auto px-4 pt-5 pb-32 lg:pb-12 md:pt-8">
          {/* Post-game payment prompt (session creator only, last 24h, until used/dismissed) */}
          {(() => {
            const pending = recentEnded.filter((s) => !paymentDone.includes(s.id))
            if (pending.length === 0) return null
            return (
              <div className="mb-6 rounded-xl border border-brand-gold/50 bg-brand-gold/[0.07] p-4">
                <div className="flex items-center gap-2 mb-1">
                  <DollarSign className="w-5 h-5 text-gold-ink" />
                  <h3 className="font-display text-sm font-bold uppercase tracking-wider text-gold-ink">Collect for your recent game</h3>
                </div>
                <p className="text-xs text-foreground/60 mb-3">Your session just wrapped — send a payment request before it slips your mind.</p>
                <div className="space-y-2">
                  {pending.map((s) => (
                    <div key={s.id} className="flex items-center justify-between gap-2 rounded-lg bg-card-bg border border-brand-border px-3 py-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{s.title}</p>
                        <p className="text-xs text-foreground/60">{format(new Date(s.date_time), 'EEE, MMM d · h:mm a')}</p>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button
                          onClick={() => setPaymentSession(s)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-brand-gold text-navy hover:brightness-105 transition-colors whitespace-nowrap"
                        >
                          <DollarSign className="w-3.5 h-3.5" /> Request Payment
                        </button>
                        <button
                          onClick={() => markPaymentDone(s.id)}
                          className="p-1.5 text-foreground/40 hover:text-foreground/70"
                          title="Dismiss"
                          aria-label="Dismiss"
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
            {/* Left Column - Calendar - desktop only */}
            <div className="hidden lg:block w-80 flex-shrink-0">
              <div className="rounded-xl border border-brand-border bg-card-bg p-6 sticky top-28">
                <CalendarView
                  sessions={sessions}
                  darkMode={darkMode}
                  onDateClick={handleCalendarDateClick}
                />
              </div>
            </div>

            {/* Right Column - Sessions */}
            <div className="flex-1 min-w-0 max-w-2xl">
              <div className="flex items-end justify-between mb-5">
                <div className="flex flex-col gap-1">
                  {firstName && <span className="text-xs font-semibold text-foreground/60">Hi {firstName}</span>}
                  <h1 className="m-0 font-display text-[34px] font-semibold uppercase tracking-[0.02em] leading-none">Upcoming</h1>
                </div>
                <span className="font-display text-[15px] tracking-[0.3em] text-gold-ink pb-1">即將對決</span>
              </div>

              {/* Week strip + month (mobile) */}
              <div id="pk-calendar" className="lg:hidden mb-6 scroll-mt-24">
                <WeekStrip
                  sessions={sessions}
                  onDayClick={handleCalendarDateClick}
                  monthOpen={showMonth}
                  onToggleMonth={() => setShowMonth((v) => !v)}
                />
                {showMonth && (
                  <div className="mt-3 rounded-xl p-3 bg-card-bg border border-brand-border">
                    <MobileCalendarSwiper
                      sessions={sessions}
                      darkMode={darkMode}
                      onDateClick={handleCalendarDateClick}
                      currentMonthOffset={currentMonthOffset}
                      setCurrentMonthOffset={setCurrentMonthOffset}
                    />
                  </div>
                )}
              </div>

              {sessions.length > 0 ? (
                <div className="space-y-5 md:space-y-6">
                  {sessions.map((session) => (
                    <div
                      key={session.id}
                      id={`session-${session.id}`}
                      className={`scroll-mt-24 rounded-b-2xl rounded-t-md transition-shadow duration-500 ${flashSessionId === session.id ? 'ring-2 ring-brand-gold ring-offset-2 ring-offset-background' : ''}`}
                    >
                    <SessionCard
                      session={session}
                      currentUserId={user?.id}
                      currentUserEmail={user?.email}
                      onDelete={handleDeleteSession}
                      onEdit={handleEditSession}
                      onRSVP={handleRSVP}
                      rsvpLoading={rsvpLoading === session.id}
                      darkMode={darkMode}
                      onViewPlayer={(id, profile) => { setStatsView({ id, profile }); setShowStatsModal(true) }}
                      onDecide={handleDecide}
                    />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 rounded-xl bg-card-bg border border-brand-border">
                  <p className="font-medium text-foreground/60 text-sm">
                    No sessions yet — tap + to create one.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Bottom tab bar (mobile) */}
          <nav
            aria-label="Main"
            className="lg:hidden fixed bottom-0 inset-x-0 z-30 grid grid-cols-4 px-2 pt-2 pb-[calc(env(safe-area-inset-bottom)+10px)] bg-background/95 backdrop-blur-md border-t border-brand-border"
          >
            {[
              { key: 'sessions', label: 'Sessions', icon: <LayoutGrid className="w-[22px] h-[22px]" />, onClick: () => { setActiveTab('sessions'); window.scrollTo({ top: 0, behavior: 'smooth' }) } },
              { key: 'calendar', label: 'Calendar', icon: <CalendarDays className="w-[22px] h-[22px]" />, onClick: () => { setActiveTab('calendar'); setShowMonth(true); setTimeout(() => document.getElementById('pk-calendar')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50) } },
              { key: 'ranks', label: 'Ranks', icon: <Trophy className="w-[22px] h-[22px]" />, onClick: () => { setShowAllStatsModal(true) } },
              { key: 'me', label: 'Me', icon: <UserRound className="w-[22px] h-[22px]" />, onClick: () => { setShowSidebar(true) } },
            ].map((t) => (
              <button
                key={t.key}
                onClick={t.onClick}
                className={`flex flex-col items-center gap-1 py-1.5 ${activeTab === t.key ? 'text-gold-ink' : 'text-foreground/60'}`}
                aria-current={activeTab === t.key ? 'page' : undefined}
              >
                {t.icon}
                <span className={`text-[11px] ${activeTab === t.key ? 'font-extrabold' : 'font-semibold'}`}>{t.label}</span>
              </button>
            ))}
          </nav>
        </div>
      ) : (
        <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12">
          <BrandLogo size="lg" />

          {/* Join the Crew */}
          <div className="mt-14 w-full max-w-xs">
            <div className="space-y-3">
              <button
                onClick={() => { setAuthMode('login'); setShowAuthModal(true) }}
                className="w-full h-[52px] bg-brand-primary text-white rounded-xl font-display uppercase tracking-[0.18em] text-[15px] font-semibold hover:brightness-110 active:scale-[0.98] transition-all"
              >
                Log In
              </button>
              <button
                onClick={() => { setAuthMode('signup'); setShowAuthModal(true) }}
                className="w-full h-[52px] border border-foreground/30 text-foreground rounded-xl font-display uppercase tracking-[0.18em] text-[15px] font-semibold hover:bg-surface-2 transition-all"
              >
                Sign Up
              </button>
            </div>
            <p className="mt-6 text-center text-xs text-foreground/55 leading-relaxed">
              See, create and join upcoming games · 加入匹克廚房
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