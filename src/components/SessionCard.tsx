import { Session } from '@/types'
import { format } from 'date-fns'
import { MapPin, Trash2, Edit, Loader2, X, Plus, Minus } from 'lucide-react'
import UserAvatar from './UserAvatar'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { isAdminEmail } from '@/lib/admins'
import { APP_URL } from '@/lib/config'

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
  const isAdmin = isAdminEmail(currentUserEmail)
  const canDelete = isCreator || isAdmin
  const canEdit = isCreator || isAdmin

  const yesRSVPs = session.rsvps?.filter(rsvp => rsvp.status === 'yes') || []

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
      `👥 ${attendees} players confirmed\n\n` +
      `Join here: ${APP_URL}/`
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
  const durationHours = session.duration_hours || 1

  const sessionDate = new Date(session.date_time)
  const courtList = (session.courts || []).map(c => c.trim()).filter(Boolean)
  const maxPlayers = session.max_players || 8
  const takenSeats = yesRSVPs.length + totalGuestSeats
  const spotsLeft = Math.max(0, maxPlayers - takenSeats)

  return (
    <div className={`relative rounded-[10px] overflow-hidden border shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 ${
      session.is_private
        ? 'bg-card-bg border-purple-500/30'
        : 'bg-card-bg border-brand-border'
    }`}>
      {/* Court line */}
      <div className={`absolute inset-x-0 top-0 h-[3px] ${session.is_private ? 'bg-purple-500' : 'bg-brand-primary'}`} />

      <div className="p-5 md:p-6">

        {/* Title — full width, nothing crowding it */}
        <h3 className="font-display text-xl md:text-2xl font-semibold leading-[1.12] tracking-[0.01em] text-foreground">
          {session.is_private && (
            <span className="align-middle mr-2 inline-block font-sans text-[10px] tracking-wider bg-purple-600 text-white px-2 py-0.5 rounded">
              🔒 Private
            </span>
          )}
          {session.title}
        </h3>

        {/* Meta row — host on the left, controls pushed down here */}
        <div className="mt-2.5 flex items-center justify-between gap-3">
          <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-foreground/55 truncate">
            Hosted by {session.profiles?.name || 'Unknown'}
          </span>

          <div className="flex items-center gap-0.5 shrink-0">
            {session.is_private && isCreator && (
              <button
                onClick={() => {
                  const shareUrl = `${window.location.origin}/session/${session.id}?private=${session.private_key}`
                  navigator.clipboard.writeText(shareUrl)
                  alert('Share link copied to clipboard!')
                }}
                className="p-2 rounded-md text-foreground/50 hover:text-brand-secondary hover:bg-brand-secondary/10 transition-colors"
                title="Copy share link"
              >
                📋
              </button>
            )}

            {canEdit && onEdit && (
              <button
                onClick={() => onEdit(session)}
                className="p-2 rounded-md text-foreground/50 hover:text-brand-secondary hover:bg-brand-secondary/10 transition-colors"
                title={isAdmin ? 'Edit session (Admin)' : 'Edit session'}
              >
                <Edit className="w-4 h-4" />
              </button>
            )}

            {canDelete && (
              <button
                onClick={handleDelete}
                className="p-2 rounded-md text-foreground/50 hover:text-brand-primary hover:bg-brand-primary/10 transition-colors"
                title={isAdmin ? 'Delete session (Admin)' : 'Delete session'}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Date plate — the focal point */}
        <div className="mt-5 mb-4 border-l-[3px] border-brand-gold rounded-r-md bg-gradient-to-r from-brand-gold/10 via-brand-gold/[0.03] to-transparent py-3 px-4">
          <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-foreground/50 mb-0.5">
            {format(sessionDate, 'EEEE')}
          </div>
          <div className="font-display text-[1.6rem] md:text-[1.75rem] font-medium leading-none text-foreground flex items-baseline gap-2.5 flex-wrap">
            {format(sessionDate, 'MMMM d')}
            <span className="text-[1.05rem] font-normal tracking-wide text-brand-gold">
              {format(sessionDate, 'h:mm a')}
            </span>
            <span className="self-center font-sans text-[11px] font-semibold uppercase tracking-[0.08em] text-foreground/50 border border-brand-border rounded-[3px] px-1.5 py-0.5">
              {durationHours} {durationHours === 1 ? 'hr' : 'hrs'}
            </span>
          </div>
        </div>

        {/* Location */}
        <div className="flex items-center gap-2.5 text-sm font-semibold text-foreground mb-6">
          <MapPin className="w-[17px] h-[17px] text-brand-secondary shrink-0" />
          <span>{session.location}</span>
          {courtList.length > 0 && (
            <span className="font-sans text-[11px] font-semibold uppercase tracking-[0.08em] text-foreground/60 border border-brand-border rounded-[3px] px-1.5 py-0.5 shrink-0">
              Court {courtList.join('+')}
            </span>
          )}
        </div>

        {/* Notes */}
        {session.notes && (
          <div className="mb-6 p-3 rounded-md bg-foreground/[0.04] border border-brand-border">
            <p className="text-sm text-foreground/75">{session.notes}</p>
          </div>
        )}

        {/* Roster */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2.5">
            <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-foreground/55 shrink-0">
              On the court
            </span>
            <span className="flex-1 h-px bg-brand-border" />
            <span className="shrink-0 flex items-baseline gap-2">
              <span className="font-display text-sm font-semibold text-foreground">
                {takenSeats}<span className="text-foreground/50">/{maxPlayers}</span>
              </span>
              <span className={`text-[10px] font-bold uppercase tracking-[0.1em] ${spotsLeft === 0 ? 'text-brand-primary' : 'text-foreground/50'}`}>
                {spotsLeft === 0 ? 'Full' : `${spotsLeft} left`}
              </span>
            </span>
          </div>

          {/* Capacity bar */}
          <div className="flex gap-[3px] mb-3.5">
            {Array.from({ length: maxPlayers }).map((_, i) => (
              <span
                key={i}
                className={`h-1 flex-1 rounded-[1px] ${
                  i < yesRSVPs.length
                    ? 'bg-brand-secondary'
                    : i < takenSeats
                      ? 'bg-brand-gold'
                      : 'bg-brand-border'
                }`}
              />
            ))}
          </div>

          {yesRSVPs.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {yesRSVPs.map((rsvp) => (
                <div key={rsvp.id} className="flex flex-wrap gap-1.5 items-center">
                  <button
                    type="button"
                    onClick={() => onViewPlayer?.(rsvp.user_id, rsvp.profiles)}
                    disabled={!onViewPlayer}
                    title={onViewPlayer ? `View ${rsvp.profiles?.name || 'player'}'s stats` : undefined}
                    className={`flex items-center gap-1.5 pl-1 pr-3 py-1 rounded-full text-[13px] font-semibold bg-brand-secondary/15 text-brand-secondary transition-transform duration-200 ${
                      onViewPlayer ? 'hover:-translate-y-0.5 cursor-pointer' : 'cursor-default'
                    }`}
                  >
                    <UserAvatar profile={rsvp.profiles} size="sm" />
                    {rsvp.profiles?.name || 'Player'}
                  </button>

                  {rsvp.guest_names?.map((gname, gi) => (
                    <span
                      key={`g-${rsvp.id}-${gi}`}
                      className="px-3 py-1 rounded-full text-[13px] font-semibold text-foreground/60 border border-dashed border-brand-border"
                    >
                      {gname} · guest
                    </span>
                  ))}

                  {(rsvp.guest_count || 0) > (rsvp.guest_names?.length || 0) && (
                    <span className="px-3 py-1 rounded-full text-[13px] font-semibold text-foreground/60 border border-dashed border-brand-border">
                      +{(rsvp.guest_count || 0) - (rsvp.guest_names?.length || 0)} guest of {rsvp.profiles?.name || 'player'}
                    </span>
                  )}
                </div>
              ))}

              {/* Session-level manual participants (legacy, from create flow) */}
              {session.manual_participants?.map((name: string, index: number) => (
                <span
                  key={`manual-${index}`}
                  className="px-3 py-1 rounded-full text-[13px] font-semibold text-foreground/60 border border-dashed border-brand-border"
                >
                  {name} · guest
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-foreground/50">No one has joined yet — be the first.</p>
          )}
        </div>

        {/* Action Buttons */}
        {currentUserId && (
          <div className="space-y-2">
            <div className="flex gap-2.5">
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
                className={`flex-1 py-3 px-4 rounded-md font-display text-[15px] font-semibold uppercase tracking-[0.09em] flex items-center justify-center gap-2 disabled:opacity-60 transition-all duration-200 active:scale-[0.975] ${
                  userRSVPStatus === 'yes'
                    ? (joinMode === 'closed'
                        ? 'bg-brand-secondary text-white hover:brightness-110'
                        : 'bg-foreground/15 text-foreground hover:bg-foreground/25')
                    : 'bg-brand-primary text-white hover:brightness-110'
                }`}
              >
                {rsvpLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                {userRSVPStatus === 'yes'
                  ? (joinMode === 'closed' ? '✓ Going · Edit guests' : 'Close')
                  : (joinMode === 'closed' ? 'Join' : 'Close')}
              </button>

              {userRSVPStatus === 'yes' && (
                <button
                  disabled={rsvpLoading}
                  onClick={() => handleRSVP('no')}
                  className="px-5 py-3 rounded-md font-display text-[15px] font-semibold uppercase tracking-[0.09em] flex items-center justify-center gap-2 disabled:opacity-60 border border-brand-primary/40 text-brand-primary hover:bg-brand-primary/10 transition-all duration-200 active:scale-[0.975]"
                >
                  {rsvpLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  Cancel
                </button>
              )}

              <button
                onClick={shareToWhatsApp}
                className="px-4 rounded-md border border-brand-border text-brand-secondary hover:bg-brand-secondary/10 hover:border-brand-secondary/40 transition-all duration-200 active:scale-95"
                title="Share to WhatsApp"
              >
                <svg className="w-[19px] h-[19px]" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                </svg>
              </button>
            </div>

            {/* Initial choose panel */}
            {joinMode === 'choose' && userRSVPStatus !== 'yes' && (
              <div className="p-3 rounded-md border border-brand-border bg-foreground/[0.03]">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-foreground/55 mb-2.5">Who's coming?</p>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => { handleRSVP('yes'); setJoinMode('closed') }}
                    className="py-2.5 px-2 rounded-md font-display text-[13px] font-medium uppercase tracking-[0.07em] bg-brand-secondary text-white hover:brightness-110 transition-all active:scale-[0.97]"
                  >
                    Just me
                  </button>
                  <button
                    onClick={() => setJoinMode('plus1')}
                    className="py-2.5 px-2 rounded-md font-display text-[13px] font-medium uppercase tracking-[0.07em] border border-brand-border text-foreground hover:border-brand-secondary hover:bg-brand-secondary/10 transition-all active:scale-[0.97]"
                  >
                    +1
                  </button>
                  <button
                    onClick={() => setJoinMode('plusmore')}
                    className="py-2.5 px-2 rounded-md font-display text-[13px] font-medium uppercase tracking-[0.07em] border border-brand-border text-foreground hover:border-brand-secondary hover:bg-brand-secondary/10 transition-all active:scale-[0.97]"
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
                <div className="p-3 rounded-md border border-brand-border bg-foreground/[0.03] space-y-3">
                  <div className="flex justify-between items-center">
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-foreground/55">
                      {joinMode === 'plus1' ? 'Bring one friend' : 'Bring friends'}
                    </p>
                    <button onClick={resetPicker} className="text-foreground/50 hover:text-foreground transition-colors">
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
                      className="w-full p-2 rounded-md border border-brand-border bg-background text-foreground placeholder-foreground/40 text-sm disabled:opacity-50 focus:border-brand-secondary focus:outline-none transition-colors"
                    />
                    {showPickerDropdown && !atCap && (
                      <div className="absolute z-10 w-full mt-1 rounded-md shadow-lg max-h-48 overflow-y-auto border border-brand-border bg-background">
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
                              className="w-full px-3 py-2 text-left text-sm text-foreground hover:bg-brand-secondary/10 transition-colors"
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
                              className="w-full px-3 py-2 text-left text-sm text-foreground hover:bg-brand-secondary/10 transition-colors"
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
                        <span key={`${g}-${i}`} className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs text-foreground/70 border border-dashed border-brand-border">
                          {g} · guest
                          <button onClick={() => setGuestNames(prev => prev.filter((_, idx) => idx !== i))}><X className="w-3 h-3" /></button>
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Unnamed guest stepper — only in +more */}
                  {joinMode === 'plusmore' && (
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-foreground/55">Unnamed guests</span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setUnnamedGuestCount(c => Math.max(0, c - 1))}
                          className="p-1.5 rounded-md border border-brand-border text-foreground hover:border-brand-secondary hover:bg-brand-secondary/10 transition-all active:scale-95"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-6 text-center text-sm font-semibold text-foreground">{unnamedGuestCount}</span>
                        <button
                          onClick={() => setUnnamedGuestCount(c => c + 1)}
                          className="p-1.5 rounded-md border border-brand-border text-foreground hover:border-brand-secondary hover:bg-brand-secondary/10 transition-all active:scale-95"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  )}

                  {joinMode === 'plus1' && atCap && (
                    <p className="text-[11px] text-brand-gold">+1 cap reached. Use +more to add another.</p>
                  )}

                  <button
                    disabled={rsvpLoading}
                    onClick={submitJoin}
                    className="w-full py-2.5 px-3 rounded-md font-display text-[13px] font-semibold uppercase tracking-[0.08em] bg-brand-primary text-white hover:brightness-110 disabled:opacity-60 flex items-center justify-center gap-2 transition-all active:scale-[0.97]"
                  >
                    {rsvpLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                    {userRSVPStatus === 'yes' ? 'Update guests' : 'Confirm join'} {totalAdded > 0 ? `(+${totalAdded})` : ''}
                  </button>
                </div>
              )
            })()}
          </div>
        )}
      </div>
    </div>
  )
}
